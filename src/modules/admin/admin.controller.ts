import { Controller, Get, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, UserStatus } from '../../generated/prisma/client';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

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

  @Put('users/:id/role')
@ApiOperation({ summary: 'Update user role' })
async updateUserRole(
  @ActiveUser() currentUser: ActiveUserData,
  @Param('id') userId: string,
  @Body('role') role: UserRole,
) {
  return this.adminService.updateUserRole(currentUser.sub, userId, role);
}

  @Get('professionals/pending')
  @ApiOperation({ summary: 'Get pending professional approvals' })
  async getPendingProfessionals() {
    return this.adminService.getPendingProfessionals();
  }

  @Put('professionals/:id/approve')
  @ApiOperation({ summary: 'Approve a healthcare professional' })
  async approveProfessional(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') professionalId: string,
  ) {
    return this.adminService.approveProfessional(currentUser.sub, professionalId);
  }

  @Put('professionals/:id/reject')
  @ApiOperation({ summary: 'Reject a healthcare professional' })
  async rejectProfessional(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') professionalId: string,
    @Body('reason') reason?: string,
  ) {
    return this.adminService.rejectProfessional(currentUser.sub, professionalId, reason);
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