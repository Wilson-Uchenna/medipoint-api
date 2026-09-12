import { Injectable, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TwilioVideoProvider } from './providers/twilio-video.provider';

@Injectable()
export class VideoService {
  constructor(
    private prisma: PrismaService,
    private twilioProvider: TwilioVideoProvider,
  ) {}

  async joinSession(consultationId: string, userId: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        patient: { select: { userId: true } },
        professional: { select: { userId: true } },
        videoSession: true,
      },
    });

    if (!consultation) throw new NotFoundException('Consultation not found');

    const isParticipant =
      consultation.patient.userId === userId ||
      consultation.professional.userId === userId;
    if (!isParticipant) {
      throw new ForbiddenException('Not a participant in this consultation');
    }

    if (!['ACCEPTED', 'IN_PROGRESS'].includes(consultation.status)) {
      throw new ForbiddenException('Consultation is not ready for a video session');
    }

    let videoSession = consultation.videoSession;

    if (!videoSession) {
      const roomName = `consultation-${consultationId}`;
      const room = await this.twilioProvider.createRoom(roomName);

      videoSession = await this.prisma.videoSession.create({
        data: {
          consultationId,
          roomSid: room.sid,
          roomName: room.name,
          status: 'CREATED',
        },
      });
    }

    const accessToken = this.twilioProvider.generateAccessToken(userId, videoSession.roomName);

    return {
      accessToken,
      roomName: videoSession.roomName,
    };
  }

  async endSession(consultationId: string) {
    const videoSession = await this.prisma.videoSession.findUnique({
      where: { consultationId },
    });
    if (!videoSession) throw new NotFoundException('No video session for this consultation');

    await this.twilioProvider.endRoom(videoSession.roomSid);

    return this.prisma.videoSession.update({
      where: { consultationId },
      data: { status: 'COMPLETED', endedAt: new Date() },
    });
  }
}