import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, UserStatus } from '@prisma/client';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';
import { TokenPayload } from './interfaces/token.interface';
import { EmailService } from 'src/core/email/email.service';
import { ProfessionalType } from 'src/generated/prisma/enums';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private emailService: EmailService, // ← INJECTED
    private readonly logger = new Logger(),
  ) {}

  async register(dto: RegisterDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    // 2. Validate role-specific data
    this.validateRoleData(dto);

    // 3. Check existing user
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // 4. Hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 5. Create user + profile in transaction
    const { user, verificationToken } = await this.prisma.$transaction(
      async (tx) => {
        // Create user
        const user = await tx.user.create({
          data: {
            email: dto.email,
            passwordHash,
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneNumber: dto.phoneNumber,
            role: dto.role,
            status: UserStatus.PENDING_VERIFICATION,
          },
        });

        // Create role-specific profile
        if (dto.role === UserRole.PATIENT && dto.patientData) {
          await tx.patient.create({
            data: {
              userId: user.id,
              dateOfBirth: dto.patientData.dateOfBirth
                ? new Date(dto.patientData.dateOfBirth)
                : null,
              gender: dto.patientData.gender,
              bloodGroup: dto.patientData.bloodGroup,
              address: dto.patientData.address,
              emergencyContactName: dto.patientData.emergencyContactName,
              emergencyContactPhone: dto.patientData.emergencyContactPhone,
              emergencyContactRelationship:
                dto.patientData.emergencyContactRelationship,
            },
          });
        }

        if (
          (dto.role === UserRole.DOCTOR || dto.role === UserRole.PHARMACIST) &&
          dto.professionalData
        ) {
          await tx.healthcareProfessional.create({
            data: {
              userId: user.id,
              professionalType: dto.professionalData.professionalType,
              licenseNumber: dto.professionalData.licenseNumber,
              specialty: dto.professionalData.specialty,
              yearsOfExperience: dto.professionalData.yearsOfExperience,
              bio: dto.professionalData.bio,
              verificationStatus: 'PENDING', // Needs admin approval
            },
          });
        }

        // Create verification token
        const token = await tx.emailVerification.create({
          data: {
            userId: user.id,
            token: crypto.randomUUID(), // or use a secure random generator
            expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours
          },
        });

        return { user, verificationToken: token.token };
      },
    );

    // 6. Send verification email

    try {
      const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${verificationToken}`;

      await this.emailService.sendEmailVerificationEmail(
        user.email,
        `${user.firstName} ${user.lastName}`, // → maps to {{name}}
        verificationUrl, // → maps to {{verificationUrl}}
        48, // → maps to {{expiryHours}}
      );
    } catch (error) {
      this.logger.error('Failed to send verification email', error);
      // Don't fail registration if email fails — user can resend
    }

    // 7. If provider, notify admins for approval
    if (dto.role === UserRole.DOCTOR || dto.role === UserRole.PHARMACIST) {
      // TODO: Send admin notification email
      // await this.emailService.sendProfessionalApprovalPendingEmail(...);
    }

    // 8. Generate tokens (optional — some apps require verification first)
    const payload: TokenPayload = { sub: user.id, email: user.email };
    const tokens = await this.generateTokens(payload);

    return {
      ...tokens,
      message: 'Registration successful. Please verify your email.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  // ─── Helper: Validate role data ───
  private validateRoleData(dto: RegisterDto): void {
    if (dto.role === UserRole.PATIENT) {
      if (!dto.patientData) {
        throw new BadRequestException(
          'Patient data is required for patient registration',
        );
      }
    }

    if (dto.role === UserRole.DOCTOR || dto.role === UserRole.PHARMACIST) {
      if (!dto.professionalData) {
        throw new BadRequestException(
          'Professional data is required for provider registration',
        );
      }
      // Map role to professional type if not provided
      if (!dto.professionalData.professionalType) {
        dto.professionalData.professionalType =
          dto.role === UserRole.DOCTOR
            ? ProfessionalType.DOCTOR
            : ProfessionalType.PHARMACIST;
      }
    }

    if (dto.role === UserRole.ADMIN) {
      throw new BadRequestException('Admin accounts cannot be self-registered');
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === UserStatus.SUSPENDED) {
      throw new UnauthorizedException('Account has been suspended');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException(
        'Please verify your email before logging in',
      );
    }

    const tokens = await this.generateTokens(user);

    return {
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tokens,
    };
  }

  async verifyEmail(token: string) {
    const verification = await this.prisma.emailVerification.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
      include: { user: true },
    });

    if (!verification) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Activate user
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: {
          emailVerified: true,
          status: UserStatus.ACTIVE,
        },
      }),
      this.prisma.emailVerification.update({
        where: { id: verification.id },
        data: { used: true },
      }),
    ]);

    // Send welcome email based on role
    const loginUrl = `${this.configService.get('FRONTEND_URL')}/login`;

    if (verification.user.role === UserRole.PATIENT) {
      await this.emailService.sendPatientWelcomeEmail(
        verification.user.email,
        `${verification.user.firstName} ${verification.user.lastName}`,
        'MedipointHq',
        loginUrl,
      );
    }

    if (
      verification.user.role === UserRole.DOCTOR ||
      verification.user.role === UserRole.PHARMACIST
    ) {
      await this.emailService.sendProfessionalWelcomeEmail(
        verification.user.email,
        'MedipointHq',
        `${verification.user.firstName} ${verification.user.lastName}`,
        loginUrl,
      );
    }

    return { message: 'Email verified successfully. You can now log in.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Generate new token
    const newToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    await this.prisma.emailVerification.create({
      data: {
        userId: user.id,
        token: newToken,
        expiresAt,
      },
    });

    // Actually send the email using EmailService
    const verificationUrl = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${newToken}`;

    await this.emailService.sendEmailVerificationEmail(
      user.email,
      `${user.firstName} ${user.lastName}`,
      verificationUrl,
      48,
    );

    return { message: 'Verification email sent' };
  }
  
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Don't reveal if email exists
      return {
        message: 'If an account exists, a password reset link has been sent',
      };
    }

    // TODO: Generate reset token and send email
    // await this.sendPasswordResetEmail(user.id, user.email);

    return {
      message: 'If an account exists, a password reset link has been sent',
    };
  }

  async resetPassword(token: string, newPassword: string) {
    const reset = await this.prisma.passwordReset.findFirst({
      where: {
        token,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!reset) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: reset.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordReset.update({
        where: { id: reset.id },
        data: { used: true },
      }),
    ]);

    return { message: 'Password reset successful' };
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || user.status === UserStatus.SUSPENDED) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      return this.generateTokens(user);
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async generateTokens(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRATION', '15m'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });

    return { accessToken, refreshToken };
  }
}
