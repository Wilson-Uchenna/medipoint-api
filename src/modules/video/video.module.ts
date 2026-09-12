import { Module } from '@nestjs/common';
import { VideoController } from './video.controller';
import { VideoService } from './video.service';
import { TwilioVideoProvider } from './providers/twilio-video.provider';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [VideoController],
  providers: [VideoService, TwilioVideoProvider],
})
export class VideoModule {}