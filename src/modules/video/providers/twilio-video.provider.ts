import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';
import  AccessToken  from 'twilio/lib/jwt/AccessToken';
const { VideoGrant } = AccessToken;

@Injectable()
export class TwilioVideoProvider {
  private readonly client: twilio.Twilio;

  constructor(private configService: ConfigService) {
    this.client = twilio(
      this.configService.get('TWILIO_API_KEY_SID'),
      this.configService.get('TWILIO_API_KEY_SECRET'),
      { accountSid: this.configService.get('TWILIO_ACCOUNT_SID') },
    );
  }

  async createRoom(roomName: string) {
    const room = await this.client.video.v1.rooms.create({
      uniqueName: roomName,
      type: 'group', // or 'go' for 1:1, 'peer-to-peer' — pick based on your usage/cost tradeoffs
      recordParticipantsOnConnect: false, // never enable without confirming BAA coverage for recording
    });
    return { sid: room.sid, name: room.uniqueName };
  }

  generateAccessToken(identity: string, roomName: string): string {
    const token = new AccessToken(
      this.configService.get('TWILIO_ACCOUNT_SID')!,
      this.configService.get('TWILIO_API_KEY_SID')!,
      this.configService.get('TWILIO_API_KEY_SECRET')!,
      { identity, ttl: 3600 }, // 1 hour — short-lived on purpose, never persisted
    );
    token.addGrant(new VideoGrant({ room: roomName }));
    return token.toJwt();
  }

  async endRoom(roomSid: string) {
    await this.client.video.v1.rooms(roomSid).update({ status: 'completed' });
  }
}