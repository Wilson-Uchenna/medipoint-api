import { Controller, Get, Post, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { PatientsService } from './patient.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../generated/prisma/client';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { CreatePatientProfileDto } from './dtos/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dtos/update-patient-profile.dto';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private patientsService: PatientsService) {}

  @Post('profile')
@Roles(UserRole.PATIENT)
@ApiOperation({
  summary: 'Create patient profile',
  description:
    'Creates the patient-specific profile (medical details, emergency contact, etc.) for the ' +
    'currently authenticated user. A user must already be registered with the PATIENT role. ' +
    'Each user can only have one patient profile.',
})
@ApiBody({
  type: CreatePatientProfileDto,
  examples: {
    example1: {
      summary: 'Create patient profile',
      value: {
        dateOfBirth: '1990-05-15',
        gender: 'MALE',
        address: '123 Main St, Lagos',
        occupation: 'Software Engineer',
        bloodGroup: 'O+',
        genotype: 'AA',
        height: 175.5,
        weight: 70.0,
        emergencyContactName: 'Jane Doe',
        emergencyContactRelationship: 'Sister',
        emergencyContactPhone: '+2348098765432',
      },
    },
  },
})
@ApiResponse({ status: 201, description: 'Patient profile created successfully.' })
@ApiResponse({ status: 400, description: 'Validation failed on one or more fields.' })
@ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
@ApiResponse({ status: 403, description: 'Authenticated user does not have the PATIENT role.' })
@ApiResponse({ status: 409, description: 'A patient profile already exists for this user.' })
  async createProfile(
    @ActiveUser() currentUser: ActiveUserData,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientsService.createProfile(currentUser.sub, dto);
  }

  @Get('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get patient profile',
    description: 'Returns the patient profile belonging to the currently authenticated user.',
  })
  @ApiResponse({ status: 200, description: 'Patient profile retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  @ApiResponse({ status: 403, description: 'Authenticated user does not have the PATIENT role.' })
  @ApiResponse({ status: 404, description: 'No patient profile exists for this user yet.' })
  async getProfile(@ActiveUser() currentUser: ActiveUserData) {
    return this.patientsService.getProfile(currentUser.sub);
  }

  @Put('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Update patient profile',
    description:
      'Updates the patient profile for the currently authenticated user. All fields are optional — ' +
      'only the fields provided in the request body will be updated.',
  })
  @ApiResponse({ status: 200, description: 'Patient profile updated successfully.' })
  @ApiResponse({ status: 400, description: 'Validation failed on one or more fields.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  @ApiResponse({ status: 403, description: 'Authenticated user does not have the PATIENT role.' })
  @ApiResponse({ status: 404, description: 'No patient profile exists for this user yet.' })
  async updateProfile(
    @ActiveUser() currentUser: ActiveUserData,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(currentUser.sub, dto);
  }

  @Get('health-records')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get patient health records',
    description: 'Returns the medical/health record history associated with the authenticated patient.',
  })
  @ApiResponse({ status: 200, description: 'Health records retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  @ApiResponse({ status: 403, description: 'Authenticated user does not have the PATIENT role.' })
  @ApiResponse({ status: 404, description: 'No patient profile exists for this user yet.' })
  async getHealthRecords(@ActiveUser() currentUser: ActiveUserData) {
    const patient = await this.patientsService.getProfile(currentUser.sub);
    return this.patientsService.getHealthRecords(patient.id);
  }

  @Get('consultations')
  @Roles(UserRole.PATIENT)
  @ApiOperation({
    summary: 'Get consultation history',
    description: 'Returns the full consultation booking history for the authenticated patient.',
  })
  @ApiResponse({ status: 200, description: 'Consultation history retrieved successfully.' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  @ApiResponse({ status: 403, description: 'Authenticated user does not have the PATIENT role.' })
  @ApiResponse({ status: 404, description: 'No patient profile exists for this user yet.' })
  async getConsultations(@ActiveUser() currentUser: ActiveUserData) {
    const patient = await this.patientsService.getProfile(currentUser.sub);
    return this.patientsService.getConsultationHistory(patient.id);
  }
}