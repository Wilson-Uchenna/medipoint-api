import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsultationStatus } from '../../generated/prisma/client';

@Injectable()
export class ConsultationNotesService {
  constructor(private prisma: PrismaService) {}

  async createNotes(professionalId: string, consultationId: string, dto: CreateNotesDto) {
    const consultation = await this.prisma.consultation.findFirst({
      where: {
        id: consultationId,
        professionalId,
        status: ConsultationStatus.COMPLETED,
      },
    });

    if (!consultation) {
      throw new ForbiddenException('Can only document completed consultations');
    }

    // A note record already exists from booking time (holding reasonForConsultation
    // and reportedBy). This call fills in the clinical fields on that same record
    // for the first time.
    const existing = await this.prisma.consultationNote.findUnique({
      where: { consultationId },
    });

    if (!existing) {
      throw new NotFoundException('No note record found for this consultation — expected one to exist from booking.');
    }

    if (existing.documentedBy) {
      throw new ForbiddenException('Clinical documentation already exists — use the update endpoint to revise it.');
    }

    return this.prisma.consultationNote.update({
      where: { consultationId },
      data: {
        symptoms: dto.symptoms,
        diagnosis: dto.diagnosis,
        prescription: dto.prescription,
        notes: dto.notes,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        documentedBy: professionalId,
      },
    });
  }

  async updateNotes(professionalId: string, noteId: string, dto: UpdateNotesDto) {
    const note = await this.prisma.consultationNote.findUnique({
      where: { id: noteId },
      include: { consultation: true },
    });

    if (!note || note.consultation.professionalId !== professionalId) {
      throw new ForbiddenException('Not authorized to update these notes');
    }

    // Real clinical work needs revision — diagnoses get refined, prescriptions
    // change, follow-up notes get added. No restriction on repeat updates here.
    return this.prisma.consultationNote.update({
      where: { id: noteId },
      data: {
        symptoms: dto.symptoms,
        diagnosis: dto.diagnosis,
        prescription: dto.prescription,
        notes: dto.notes,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : undefined,
      },
    });
  }

  async getNotesForConsultation(consultationId: string, userId: string, userRole: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: { patient: true, professional: true },
    });

    if (!consultation) throw new NotFoundException('Consultation not found');

    const isPatient = consultation.patient.userId === userId;
    const isProfessional = consultation.professional.userId === userId;

    if (!isPatient && !isProfessional && userRole !== 'ADMIN') {
      throw new ForbiddenException('Not authorized to view these notes');
    }

    return this.prisma.consultationNote.findUnique({
      where: { consultationId },
    });
  }
}

export class CreateNotesDto {
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string;
}

export class UpdateNotesDto {
  symptoms?: string;
  diagnosis?: string;
  prescription?: string;
  notes?: string;
  followUpDate?: string;
}