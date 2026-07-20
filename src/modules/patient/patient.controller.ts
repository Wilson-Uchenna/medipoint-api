import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PatientsService, CreatePatientProfileDto, UpdatePatientProfileDto } from './patient.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Create patient profile' })
  async createProfile(
    @ActiveUser() userId: string,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientsService.createProfile(userId, dto);
  }

  @Get('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get patient profile' })
  async getProfile(@ActiveUser() userId: string) {
    return this.patientsService.getProfile(userId);
  }

  @Put('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update patient profile' })
  async updateProfile(
    @ActiveUser() userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(userId, dto);
  }

  @Get('health-records')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get patient health records' })
  async getHealthRecords(@ActiveUser() userId: string) {
    const patient = await this.patientsService.getProfile(userId);
    return this.patientsService.getHealthRecords(patient.id);
  }

  @Get('consultations')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get consultation history' })
  async getConsultations(@ActiveUser() userId: string) {
    const patient = await this.patientsService.getProfile(userId);
    return this.patientsService.getConsultationHistory(patient.id);
  }
}
