import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  async createProfile(userId: string, dto: CreatePatientProfileDto) {
    const existing = await this.prisma.patient.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new ForbiddenException('Patient profile already exists');
    }

    const patient = await this.prisma.patient.create({
      data: {
        userId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: dto.gender,
        address: dto.address,
        occupation: dto.occupation,
        bloodGroup: dto.bloodGroup,
        genotype: dto.genotype,
        height: dto.height,
        weight: dto.weight,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactRelationship: dto.emergencyContactRelationship,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
    });

    return patient;
  }

  async getProfile(userId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phoneNumber: true,
          },
        },
      },
    });

    if (!patient) {
      throw new NotFoundException('Patient profile not found');
    }

    return patient;
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const patient = await this.prisma.patient.update({
      where: { userId },
      data: {
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        gender: dto.gender,
        address: dto.address,
        occupation: dto.occupation,
        bloodGroup: dto.bloodGroup,
        genotype: dto.genotype,
        height: dto.height,
        weight: dto.weight,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactRelationship: dto.emergencyContactRelationship,
        emergencyContactPhone: dto.emergencyContactPhone,
      },
    });

    return patient;
  }

  async getHealthRecords(patientId: string) {
    const records = await this.prisma.consultation.findMany({
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

    return records;
  }

  async getConsultationHistory(patientId: string) {
    return this.prisma.consultation.findMany({
      where: { patientId },
      include: {
        professional: {
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
        notes: true,
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}

export class CreatePatientProfileDto {
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  occupation?: string;
  bloodGroup?: string;
  genotype?: string;
  height?: number;
  weight?: number;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}

export class UpdatePatientProfileDto {
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  occupation?: string;
  bloodGroup?: string;
  genotype?: string;
  height?: number;
  weight?: number;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}