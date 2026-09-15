import { ApiProperty } from '@nestjs/swagger';

export class JoinSessionDto {
  @ApiProperty({
    description: 'Short-lived Twilio access token, valid for 1 hour, scoped to this room only.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'The Twilio room name to connect to using the access token.',
    example: 'consultation-3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  })
  roomName: string;
}