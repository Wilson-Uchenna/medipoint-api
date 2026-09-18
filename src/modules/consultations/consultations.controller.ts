import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { ConsultationsService, } from './consultations.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../../generated/prisma/client';
import { CreateBookingDto } from './dtos/create-booking.dto';
import { RescheduleDto } from './dtos/reschedule.dto';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@ApiTags('Consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consultations')
export class ConsultationsController {
  constructor(private consultationsService: ConsultationsService) {}

 @Post()
@Roles(UserRole.PATIENT)
@ApiOperation({
  summary: 'Book a consultation',
  description:
    'Creates a new consultation booking. Price is determined automatically by the selected duration ' +
    '(MIN_15 = ₦2,000, MIN_30 = ₦3,000, HOUR_1 = ₦5,000). The reason for consultation is stored as ' +
    'clinical content, separate from this booking record.',
})
@ApiBody({
  type: CreateBookingDto,
  examples: {
    example1: {
      summary: '30-minute booking',
      value: {
        professionalId: 'professional-uuid',
        consultationType: 'VIRTUAL',
        duration: 'MIN_30',
        preferredDate: '2026-10-01',
        preferredTime: '14:30',
        reasonForConsultation: 'Persistent headache for the past 3 days',
      },
    },
  },
})
@ApiResponse({ status: 201, description: 'Consultation booked successfully, pending payment.' })
@ApiResponse({ status: 400, description: 'Validation failed on one or more fields.' })
@ApiResponse({ status: 404, description: 'Patient profile not found for the authenticated user.' })
async createBooking(
  @ActiveUser() currentUser: ActiveUserData,
  @Body() dto: CreateBookingDto,
) {
  return this.consultationsService.createBooking(currentUser.sub, dto);
}
  @Get(':id')
  @ApiOperation({ summary: 'Get consultation details' })
  async getById(
    @Param('id') id: string,
    @ActiveUser() user: any,
  ) {
    return this.consultationsService.getById(id, user.id, user.role);
  }

  @Post(':id/cancel')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Cancel consultation' })
  async cancel(
    @ActiveUser() userId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.consultationsService.cancelConsultation(id, userId, reason);
  }

  @Put(':id/reschedule')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Reschedule consultation' })
  async reschedule(
    @ActiveUser() userId: string,
    @Param('id') id: string,
    @Body() dto: RescheduleDto,
  ) {
    return this.consultationsService.rescheduleConsultation(id, userId, dto);
  }
}