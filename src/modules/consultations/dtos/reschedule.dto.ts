import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RescheduleDto {
  @ApiProperty({ example: '2024-07-20' })
  @IsString()
  @IsNotEmpty()
  preferredDate!: string;

  @ApiProperty({ example: '10:00' })
  @IsString()
  @IsNotEmpty()
  preferredTime!: string;
}