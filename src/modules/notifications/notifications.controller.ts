import { Controller, Get, Put, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications' })
  async getNotifications(@ActiveUser() currentUser: ActiveUserData) {
    return this.notificationsService.getUserNotifications(currentUser.sub);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@ActiveUser() currentUser: ActiveUserData) {
    return this.notificationsService.getUnreadCount(currentUser.sub);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Mark notification as read' })
  async markAsRead(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(id, currentUser.sub);
  }

  @Put('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  async markAllAsRead(@ActiveUser() currentUser: ActiveUserData) {
    return this.notificationsService.markAllAsRead(currentUser.sub);
  }
}