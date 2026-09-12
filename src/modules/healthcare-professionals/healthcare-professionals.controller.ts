import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import {
  HealthcareProfessionalsService,
} from './healthcare-professionals.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import {
  ActiveUser,
  CurrentUser,
} from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../generated/prisma/client';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { CreateProfessionalProfileDto } from './dtos/create-professional-profile.dto';

@ApiTags('Healthcare Professionals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('healthcare-professionals')
export class HealthcareProfessionalsController {
  constructor(private professionalsService: HealthcareProfessionalsService) {}

  @Post('profile')
  @Roles(UserRole.DOCTOR, UserRole.PHARMACIST)
  @ApiOperation({
    summary: 'Create professional profile',
    description:
      'Creates the professional-specific profile (license, specialty, bio, etc.) for the currently ' +
      'authenticated user. Requires the DOCTOR or PHARMACIST role. Each user can only have one ' +
      'professional profile, which typically requires admin verification before appearing in search results.',
  })
  @ApiBody({
    type: CreateProfessionalProfileDto,
    examples: {
      example1: {
        summary: 'Doctor profile',
        value: {
          professionalType: 'DOCTOR',
          licenseNumber: 'MDCN-12345-LG',
          specialty: 'Cardiology',
          bio: 'Board-certified cardiologist with 10 years experience...',
          yearsOfExperience: 10,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Professional profile created successfully.',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed on one or more fields.',
  })
  @ApiResponse({
    status: 401,
    description: 'Missing, invalid, or expired access token.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Authenticated user does not have the DOCTOR or PHARMACIST role.',
  })
  @ApiResponse({
    status: 409,
    description: 'A professional profile already exists for this user.',
  })
  async createProfile(
    @ActiveUser() currentUser: ActiveUserData,
    @Body() dto: CreateProfessionalProfileDto,
  ) {
    return this.professionalsService.createProfile(currentUser.sub, dto);
  }

  @Get('profile')
  @Roles(
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.OPTOMETRIST,
    UserRole.DIETITIAN,
  )
  @ApiOperation({ summary: 'Get professional profile' })
  async getProfile(@ActiveUser() currentUser: ActiveUserData) {
    return this.professionalsService.getProfile(currentUser.sub);
  }

  @Get('appointments')
  @Roles(
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.OPTOMETRIST,
    UserRole.DIETITIAN,
  )
  @ApiOperation({ summary: 'Get assigned appointments' })
  async getAppointments(@ActiveUser() currentUser: ActiveUserData) {
    const professional = await this.professionalsService.getProfile(
      currentUser.sub,
    );
    return this.professionalsService.getAppointments(professional.id);
  }

  @Get('patients/:patientId/history')
  @Roles(
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.OPTOMETRIST,
    UserRole.DIETITIAN,
  )
  @ApiOperation({ summary: 'View patient medical history' })
  async getPatientHistory(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('patientId') patientId: string,
  ) {
    const professional = await this.professionalsService.getProfile(
      currentUser.sub,
    );
    return this.professionalsService.getPatientHistory(
      professional.id,
      patientId,
    );
  }

  @Post('consultations/:id/accept')
  @Roles(
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.OPTOMETRIST,
    UserRole.DIETITIAN,
  )
  @ApiOperation({ summary: 'Accept a consultation' })
  async acceptConsultation(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') consultationId: string,
  ) {
    const professional = await this.professionalsService.getProfile(
      currentUser.sub,
    );
    return this.professionalsService.acceptConsultation(
      professional.id,
      consultationId,
    );
  }

  @Post('consultations/:id/complete')
  @Roles(
    UserRole.DOCTOR,
    UserRole.PHARMACIST,
    UserRole.OPTOMETRIST,
    UserRole.DIETITIAN,
  )
  @ApiOperation({ summary: 'Mark consultation as complete' })
  async completeConsultation(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') consultationId: string,
  ) {
    const professional = await this.professionalsService.getProfile(
      currentUser.sub,
    );
    return this.professionalsService.completeConsultation(
      professional.id,
      consultationId,
    );
  }

  @Get('available')
  @ApiOperation({ summary: 'Get available professionals (public)' })
  async getAvailableProfessionals(@Query('type') type?: string) {
    return this.professionalsService.getAvailableProfessionals(type);
  }
}
