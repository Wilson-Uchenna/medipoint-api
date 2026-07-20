import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultationStatus, PaymentStatus, UserRole } from '@prisma/client';

@Injectable()
export class ConsultationsService {
  constructor(private prisma: PrismaService) {}

  async createBooking(patientId: string, dto: CreateBookingDto) {
    // Verify professional exists and is approved
    const professional = await this.prisma.healthcareProfessional.findUnique({
      where: { id: dto.professionalId },
      include: { user: true },
    });

    if (!professional || professional.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Healthcare professional not available');
    }

    const consultation = await this.prisma.consultation.create({
      data: {
        patientId,
        professionalId: dto.professionalId,
        consultationType: dto.consultationType,
        reasonForConsultation: dto.reasonForConsultation,
        preferredDate: new Date(dto.preferredDate),
        preferredTime: dto.preferredTime,
        amount: dto.amount,
        currency: dto.currency || 'NGN',
        status: ConsultationStatus.PENDING_PAYMENT,
      },
    });

    return consultation;
  }

  async getById(consultationId: string, userId: string, userRole: UserRole) {
    const where: any = { id: consultationId };

    if (userRole === UserRole.PATIENT) {
      const patient = await this.prisma.patient.findUnique({ where: { userId } });
      where.patientId = patient?.id;
    } else if (userRole === UserRole.DOCTOR || userRole === UserRole.PHARMACIST) {
      const professional = await this.prisma.healthcareProfessional.findUnique({ where: { userId } });
      where.professionalId = professional?.id;
    }

    const consultation = await this.prisma.consultation.findFirst({
      where,
      include: {
        patient: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        professional: { include: { user: { select: { firstName: true, lastName: true, email: true } } } },
        notes: true,
        payment: true,
      },
    });

    if (!consultation) throw new NotFoundException('Consultation not found');

    return consultation;
  }

  async cancelConsultation(consultationId: string, userId: string, reason?: string) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        patientId: patient?.id,
        status: { in: [ConsultationStatus.PENDING_PAYMENT, ConsultationStatus.PAID, ConsultationStatus.ACCEPTED] },
      },
    });

    if (!consultation) {
      throw new ForbiddenException('Cannot cancel this consultation');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        status: ConsultationStatus.CANCELLED,
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
    });
  }

  async rescheduleConsultation(consultationId: string, userId: string, dto: RescheduleDto) {
    const patient = await this.prisma.patient.findUnique({ where: { userId } });
    
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        patientId: patient?.id,
        status: { notIn: [ConsultationStatus.COMPLETED, ConsultationStatus.CANCELLED] },
      },
    });

    if (!consultation) {
      throw new ForbiddenException('Cannot reschedule this consultation');
    }

    return this.prisma.consultation.update({
      where: { id: consultationId },
      data: {
        preferredDate: new Date(dto.preferredDate),
        preferredTime: dto.preferredTime,
        status: ConsultationStatus.RESCHEDULED,
      },
    });
  }
}

export class CreateBookingDto {
  professionalId!: string;
  consultationType!: 'VIRTUAL' | 'PHYSICAL';
  reasonForConsultation!: string;
  preferredDate!: string;
  preferredTime!: string;
  amount!: number;
  currency?: string;
}

export class RescheduleDto {
  preferredDate!: string;
  preferredTime!: string;
}