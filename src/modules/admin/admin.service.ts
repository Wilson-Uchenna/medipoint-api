import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserStatus, VerificationStatus } from '../../generated/prisma/client';

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

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
            patient: { include: { user: { select: { firstName: true, lastName: true } } } },
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

  async getUsers(query?: { role?: string; status?: string; page?: number; limit?: number }) {
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

  async updateUserStatus(adminId: string, userId: string, status: UserStatus, reason?: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { status },
      }),
      this.prisma.adminAction.create({
        data: {
          adminId,
          actionType: `UPDATE_USER_STATUS_${status}`,
          targetType: 'USER',
          targetId: userId,
          reason,
        },
      }),
    ]);

    return { message: `User status updated to ${status}` };
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
    });

    if (!professional) throw new NotFoundException('Professional not found');

    await this.prisma.$transaction([
      this.prisma.healthcareProfessional.update({
        where: { id: professionalId },
        data: {
          verificationStatus: VerificationStatus.APPROVED,
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

    return { message: 'Professional approved successfully' };
  }

  async rejectProfessional(adminId: string, professionalId: string, reason?: string) {
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

    return { message: 'Professional rejected' };
  }

  async getConsultations(query?: { status?: string; page?: number; limit?: number }) {
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
          patient: { include: { user: { select: { firstName: true, lastName: true } } } },
          professional: { include: { user: { select: { firstName: true, lastName: true } } } },
          notes: true,
          payment: true,
        },
      }),
      this.prisma.consultation.count({ where }),
    ]);

    return { consultations, total, page, limit };
  }

  async getPayments(query?: { status?: string; page?: number; limit?: number }) {
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
              patient: { include: { user: { select: { firstName: true, lastName: true } } } },
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return { payments, total, page, limit };
  }
}