import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  NotificationType,
  UserRole,
  UserStatus,
  VerificationStatus,
} from '../../generated/prisma/client';
import { EmailService } from 'src/core/email/email.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private notificationsService: NotificationsService,
  ) {}

  async getDashboardStats() {
    const [
      totalPatients,
      totalProfessionals,
      totalAppointments,
      completedConsultations,
      totalPayments,
    ] = await Promise.all([
      this.prisma.patient.count(),
      this.prisma.healthcareProfessional.count(),
      this.prisma.consultation.count(),
      this.prisma.consultation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.count({ where: { status: 'SUCCESS' } }),
    ]);

    const recentPayments = await this.prisma.payment.findMany({
      where: { status: 'SUCCESS' },
      take: 5,
      orderBy: { paidAt: 'desc' },
      include: {
        consultation: {
          include: {
            patient: {
              include: {
                user: { select: { firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    return {
      totalPatients,
      totalProfessionals,
      totalAppointments,
      completedConsultations,
      totalPayments,
      recentPayments,
    };
  }

  async getUsers(query?: {
    role?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query?.role) where.role = query.role.toUpperCase();
    if (query?.status) where.status = query.status.toUpperCase();

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phoneNumber: true,
          role: true,
          status: true,
          emailVerified: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async updateUserRole(adminId: string, userId: string, role: UserRole) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { role },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: `UPDATE_USER_ROLE_${role}`,
          targetType: 'USER',
          targetId: userId,
        },
      }),
    ]);

    return { message: `User role updated to ${role}` };
  }

  async getPendingProfessionals() {
    return this.prisma.healthcareProfessional.findMany({
      where: { verificationStatus: VerificationStatus.PENDING },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
            createdAt: true,
          },
        },
      },
    });
  }

  async approveProfessional(adminId: string, professionalId: string) {
    const professional = await this.prisma.healthcareProfessional.findUnique({
      where: { id: professionalId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!professional) throw new NotFoundException('Professional not found');

    await this.prisma.$transaction([
      this.prisma.healthcareProfessional.update({
        where: { id: professionalId },
        data: {
          verificationStatus: 'APPROVED',
          approvedBy: adminId,
          approvedAt: new Date(),
        },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'APPROVE_PROFESSIONAL',
          targetType: 'PROFESSIONAL',
          targetId: professionalId,
        },
      }),
    ]);

    // Sent only after the transaction has actually committed
    try {
      await this.emailService.sendProfessionalApprovalEmail(
        professional.user.email,
        `${professional.user.firstName} ${professional.user.lastName}`,
      );
    } catch (error) {
      // Don't fail the approval if the notification email fails to send
    }

    return { message: 'Professional approved successfully' };
  }

  async rejectProfessional(
    adminId: string,
    professionalId: string,
    reason?: string,
  ) {
    const professional = await this.prisma.healthcareProfessional.findUnique({
      where: { id: professionalId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });

    if (!professional) throw new NotFoundException('Professional not found');

    await this.prisma.$transaction([
      this.prisma.healthcareProfessional.update({
        where: { id: professionalId },
        data: { verificationStatus: VerificationStatus.REJECTED },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'REJECT_PROFESSIONAL',
          targetType: 'PROFESSIONAL',
          targetId: professionalId,
          reason,
        },
      }),
    ]);

    try {
      await this.emailService.sendProfessionalRejectionEmail(
        professional.user.email,
        `${professional.user.firstName} ${professional.user.lastName}`,
        reason ?? 'No reason provided',
      );
    } catch (error) {
      // Don't fail the rejection if the notification email fails to send
    }

    // Note: user deletion removed — see below
    return { message: 'Professional rejected' };
  }

  async getConsultations(query?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query?.status) where.status = query.status.toUpperCase();

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [consultations, total] = await Promise.all([
      this.prisma.consultation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          patient: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          professional: {
            include: { user: { select: { firstName: true, lastName: true } } },
          },
          notes: true,
          payment: true,
        },
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { consultations, total, page, limit };
  }

  async getPayments(query?: {
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const where: any = {};
    if (query?.status) where.status = query.status.toUpperCase();

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          consultation: {
            include: {
              patient: {
                include: {
                  user: { select: { firstName: true, lastName: true } },
                },
              },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit };
  }

  async deleteUser(adminId: string, userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.delete({ where: { id: userId } }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'DELETE_USER',
          targetType: 'USER',
          targetId: userId,
        },
      }),
    ]);

    return { message: 'User deleted successfully' };
  }

  // admin.service.ts
  async assignProfessional(
    adminId: string,
    consultationId: string,
    professionalId: string,
  ) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
    });
    if (!consultation) throw new NotFoundException('Consultation not found');
    if (consultation.status !== 'PAID') {
      throw new BadRequestException(
        'Consultation must be paid and unassigned before assigning a provider',
      );
    }

    const professional = await this.prisma.healthcareProfessional.findUnique({
      where: { id: professionalId },
      include: {
        user: {
          select: { id: true, email: true, firstName: true, lastName: true },
        },
      },
    });
    if (!professional) throw new NotFoundException('Professional not found');
    if (
      professional.professionalType !== consultation.requestedProfessionalType
    ) {
      throw new BadRequestException(
        'Professional type does not match the requested section',
      );
    }
    if (professional.verificationStatus !== 'APPROVED') {
      throw new BadRequestException('Professional is not an approved provider');
    }
    // Specialty is informational for the admin's decision, not a hard database constraint —
    // admin uses judgment on whether a close-enough specialty match is acceptable.

    await this.prisma.$transaction([
      this.prisma.consultation.update({
        where: { id: consultationId },
        data: {
          professionalId,
          status: 'PENDING_ACCEPTANCE',
          assignedAt: new Date(),
          assignedBy: adminId,
        },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'ASSIGN_PROFESSIONAL',
          targetType: 'Consultation',
          targetId: consultationId,
          metadata: { professionalId },
        },
      }),
    ]);

    try {
      await this.notificationsService.createNotification(
        professional.user.id,
        NotificationType.APPOINTMENT_BOOKING,
        'New consultation pending your response',
        `You have been assigned a ${consultation.requestedSpecialty} consultation. Please accept or reject.`,
        { consultationId },
      );

    
    } catch (error) {
      // don't fail assignment if notification fails
    }

    return { message: 'Professional assigned successfully' };
  }
}
