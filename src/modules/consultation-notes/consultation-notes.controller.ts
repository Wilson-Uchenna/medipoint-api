import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsultationNotesService, CreateNotesDto, UpdateNotesDto } from './consultation-notes.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Consultation Notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consultations/:consultationId/notes')
export class ConsultationNotesController {
  constructor(private notesService: ConsultationNotesService, private prisma: PrismaService) {}

  @Post()
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Create consultation notes' })
  async createNotes(
    @ActiveUser() userId: string,
    @Param('consultationId') consultationId: string,
    @Body() dto: CreateNotesDto,
  ) {
    const professional = await this.prisma.healthcareProfessional.findUnique({ where: { userId } });
    return this.notesService.createNotes(professional!.id, consultationId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get notes for consultation' })
  async getNotes(
    @Param('consultationId') consultationId: string,
    @ActiveUser() user: any,
  ) {
    return this.notesService.getNotesForConsultation(consultationId, user.id, user.role);
  }

  @Put(':noteId')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Update consultation notes' })
  async updateNotes(
    @ActiveUser() userId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNotesDto,
  ) {
    const professional = await this.prisma.healthcareProfessional.findUnique({ where: { userId } });
    return this.notesService.updateNotes(professional!.id, noteId, dto);
  }
}