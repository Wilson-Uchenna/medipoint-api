import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from '../../generated/prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard statistics' })
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users' })
  async getUsers(
    @Query('role') role?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getUsers({ role, status, page, limit });
  }

  @Put('users/:id/status')
  @ApiOperation({ summary: 'Update user status' })
  async updateUserStatus(
    @ActiveUser() adminId: string,
    @Param('id') userId: string,
    @Body('status') status: UserStatus,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.updateUserStatus(adminId, userId, status, reason);
  }

  @Get('professionals/pending')
  @ApiOperation({ summary: 'Get pending professional approvals' })
  async getPendingProfessionals() {
    return this.adminService.getPendingProfessionals();
  }

  @Put('professionals/:id/approve')
  @ApiOperation({ summary: 'Approve a healthcare professional' })
  async approveProfessional(
    @ActiveUser() adminId: string,
    @Param('id') professionalId: string,
  ) {
    return this.adminService.approveProfessional(adminId, professionalId);
  }

  @Put('professionals/:id/reject')
  @ApiOperation({ summary: 'Reject a healthcare professional' })
  async rejectProfessional(
    @ActiveUser() adminId: string,
    @Param('id') professionalId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectProfessional(adminId, professionalId, reason);
  }

  @Get('consultations')
  @ApiOperation({ summary: 'View all consultations' })
  async getConsultations(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getConsultations({ status, page, limit });
  }

  @Get('payments')
  @ApiOperation({ summary: 'View all payments' })
  async getPayments(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.getPayments({ status, page, limit });
  }
}