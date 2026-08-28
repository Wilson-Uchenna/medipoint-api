import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HealthcareProfessionalsService, CreateProfessionalProfileDto } from './healthcare-professionals.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../generated/prisma/client';

@ApiTags('Healthcare Professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('healthcare-professionals')
export class HealthcareProfessionalsController {
  constructor(private professionalsService: HealthcareProfessionalsService) {}

  @Post('profile')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Create professional profile' })
  async createProfile(
    @ActiveUser() userId: string,
    @Body() dto: CreateProfessionalProfileDto,
  ) {
    return this.professionalsService.createProfile(userId, dto);
  }

  @Get('profile')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get professional profile' })
  async getProfile(@ActiveUser() userId: string) {
    return this.professionalsService.getProfile(userId);
  }

  @Get('appointments')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Get assigned appointments' })
  async getAppointments(@ActiveUser() userId: string) {
    const professional = await this.professionalsService.getProfile(userId);
    return this.professionalsService.getAppointments(professional.id);
  }

  @Get('patients/:patientId/history')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'View patient medical history' })
  async getPatientHistory(
    @ActiveUser() userId: string,
    @Param('patientId') patientId: string,
  ) {
    const professional = await this.professionalsService.getProfile(userId);
    return this.professionalsService.getPatientHistory(professional.id, patientId);
  }

  @Post('consultations/:id/accept')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Accept a consultation' })
  async acceptConsultation(
    @ActiveUser() userId: string,
    @Param('id') consultationId: string,
  ) {
    const professional = await this.professionalsService.getProfile(userId);
    return this.professionalsService.acceptConsultation(professional.id, consultationId);
  }

  @Post('consultations/:id/complete')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({ summary: 'Mark consultation as complete' })
  async completeConsultation(
    @ActiveUser() userId: string,
    @Param('id') consultationId: string,
  ) {
    const professional = await this.professionalsService.getProfile(userId);
    return this.professionalsService.completeConsultation(professional.id, consultationId);
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available professionals (public)' })
  async getAvailableProfessionals(@Query('type') type?: string) {
    return this.professionalsService.getAvailableProfessionals(type);
  }
}