import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  UserRole,
  VerificationStatus,
  ConsultationStatus,
  NotificationType,
} from '../../generated/prisma/client';
import { CreateProfessionalProfileDto } from './dtos/create-professional-profile.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from 'src/core/email/email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class HealthcareProfessionalsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async createProfile(userId: string, dto: CreateProfessionalProfileDto) {
    const existing = await this.prisma.healthcareProfessional.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ForbiddenException('Professional profile already exists');
    }

    const professional = await this.prisma.healthcareProfessional.create({
      data: {
        userId,
        professionalType: dto.professionalType,
        licenseNumber: dto.licenseNumber,
        specialty: dto.specialty,
        bio: dto.bio,
        yearsOfExperience: dto.yearsOfExperience,
        verificationStatus: VerificationStatus.PENDING,
      },
    });

    return professional;
  }

  async getProfile(userId: string) {
    const professional = await this.prisma.healthcareProfessional.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            status: true,
          },
        },
      },
    });

    if (!professional) {
      throw new NotFoundException('Professional profile not found');
    }

    return professional;
  }

  async getAppointments(professionalId: string) {
    return this.prisma.consultation.findMany({
      where: { professionalId },
      include: {
        patient: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
                phoneNumber: true,
              },
            },
          },
        },
        notes: true,
        payment: true,
      },
      orderBy: { preferredDate: 'desc' },
    });
  }

  async getPatientHistory(professionalId: string, patientId: string) {
    // Verify this patient has had a consultation with this professional
    const hasConsultation = await this.prisma.consultation.findFirst({
      where: {
        professionalId,
        patientId,
        status: {
          in: [ConsultationStatus.COMPLETED, ConsultationStatus.ACCEPTED],
        },
      },
    });

    if (!hasConsultation) {
      throw new ForbiddenException('No consultation history with this patient');
    }

    return this.prisma.consultation.findMany({
      where: { patientId },
      include: {
        notes: true,
        professional: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // healthcare-professionals.service.ts
  async acceptConsultation(professionalId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.professionalId !== professionalId) {
      throw new ForbiddenException('This consultation is not assigned to you');
    }
    if (consultation.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException('Consultation is not awaiting acceptance');
    }

    const updated = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: { status: 'ACCEPTED', acceptedAt: new Date() },
    });

    try {
      await this.notificationsService.createNotification(
        consultation.patient.user.id,
        NotificationType.APPOINTMENT_ACCEPTANCE,
        'Your booking has been confirmed',
        'A healthcare provider has accepted your consultation request.',
        { consultationId },
      );

      this.emailService.sendPatientBookingConfirmation(
        consultation.patient.user.email,
        `${consultation.patient.user.firstName} ${consultation.patient.user.lastName}`,
        consultationId,
        consultation.preferredDate.toISOString(),
        consultation.preferredTime,
      );
    } catch (error) {
      // don't fail acceptance if notification fails
    }

    return updated;
  }

  async rejectConsultation(
    professionalId: string,
    consultationId: string,
    reason?: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.professionalId !== professionalId) {
      throw new ForbiddenException('This consultation is not assigned to you');
    }
    if (consultation.status !== 'PENDING_ACCEPTANCE') {
      throw new BadRequestException('Consultation is not awaiting acceptance');
    }

    // Back to PAID and unassigned — so admin can reassign to someone else
    const updated = await this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        professionalId: null,
        status: 'PAID',
        assignedAt: null,
        assignedBy: null,
      },
    });

    const admins = await this.prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    });
    await Promise.allSettled(
      admins.map((admin) =>
        this.notificationsService.createNotification(
          admin.id,
          NotificationType.APPOINTMENT_BOOKING,
          'Provider rejected assignment — needs reassignment',
          `A provider rejected consultation ${consultationId}.${reason ? ` Reason: ${reason}` : ''}`,
          { consultationId },
        ),
      ),
    );

    return updated;
  }

  async completeConsultation(professionalId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        professionalId,
        status: {
          in: [ConsultationStatus.ACCEPTED, ConsultationStatus.IN_PROGRESS],
        },
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found or not in progress');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: ConsultationStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async getAvailableProfessionals(type?: string) {
    const where: any = {
      verificationStatus: VerificationStatus.APPROVED,
      user: {
        status: 'ACTIVE',
      },
    };

    if (type) {
      where.professionalType = type.toUpperCase();
    }

    return this.prisma.healthcareProfessional.findMany({
      where,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phoneNumber: true,
          },
        },
      },
    });
  }
}
