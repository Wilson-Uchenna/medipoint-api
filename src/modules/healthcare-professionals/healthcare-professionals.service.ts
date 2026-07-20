import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole, VerificationStatus, ConsultationStatus } from '@prisma/client';

@Injectable()
export class HealthcareProfessionalsService {
  constructor(private prisma: PrismaService) {}

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
        status: { in: [ConsultationStatus.COMPLETED, ConsultationStatus.ACCEPTED] },
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

  async acceptConsultation(professionalId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        professionalId,
        status: ConsultationStatus.PAID,
      },
    });

    if (!consultation) {
      throw new NotFoundException('Consultation not found or not eligible for acceptance');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: ConsultationStatus.ACCEPTED,
        acceptedAt: new Date(),
      },
    });
  }

  async completeConsultation(professionalId: string, consultationId: string) {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        professionalId,
        status: { in: [ConsultationStatus.ACCEPTED, ConsultationStatus.IN_PROGRESS] },
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

export class CreateProfessionalProfileDto {
  professionalType!: 'DOCTOR' | 'PHARMACIST';
  licenseNumber!: string;
  specialty?: string;
  bio?: string;
  yearsOfExperience?: number;
}