import { Controller, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActiveUser } from '../auth/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { VideoService } from './video.service';

@ApiTags('Video')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('video')
export class VideoController {
  constructor(private videoService: VideoService) {}

  @Post('consultations/:id/join')
  @ApiOperation({
    summary: 'Join a consultation video session',
    description:
      'Returns a short-lived Twilio access token scoped to this consultation\'s video room. ' +
      'Only the patient and professional assigned to the consultation may join.',
  })
  @ApiParam({ name: 'id', description: 'Consultation ID' })
  @ApiResponse({ status: 200, description: 'Access token issued.' })
  @ApiResponse({ status: 403, description: 'Not a participant, or consultation not ready for video.' })
  @ApiResponse({ status: 404, description: 'Consultation not found.' })
  async join(
    @ActiveUser() currentUser: ActiveUserData,
    @Param('id') consultationId: string,
  ) {
    return this.videoService.joinSession(consultationId, currentUser.sub);
  }

  @Post('consultations/:id/end')
  @ApiOperation({ summary: 'End a consultation video session' })
  @ApiParam({ name: 'id', description: 'Consultation ID' })
  @ApiResponse({ status: 200, description: 'Session ended.' })
  @ApiResponse({ status: 404, description: 'No video session found for this consultation.' })
  async end(@Param('id') consultationId: string) {
    return this.videoService.endSession(consultationId);
  }
}