import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ConsultationsService, CreateBookingDto, RescheduleDto } from './consultations.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Consultations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('consultations')
export class ConsultationsController {
  constructor(private consultationsService: ConsultationsService) {}

  @Post()
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Book a consultation' })
  async createBooking(
    @ActiveUser() userId: string,
    @Body() dto: CreateBookingDto,
  ) {
    return this.consultationsService.createBooking(userId, dto);
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