import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType, ConsultationDuration } from '../../../generated/prisma/enums';

export class CreateBookingDto {
  @ApiProperty({ example: 'professional-uuid' })
  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @ApiProperty({ enum: ConsultationType, example: ConsultationType.VIRTUAL })
  @IsEnum(ConsultationType)
  consultationType!: ConsultationType;

  @ApiProperty({
    enum: ConsultationDuration,
    example: ConsultationDuration.MIN_30,
    description: 'Session length, which determines price: MIN_15 = ₦2,000, MIN_30 = ₦3,000, HOUR_1 = ₦5,000',
  })
  @IsEnum(ConsultationDuration)
  duration!: ConsultationDuration;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  preferredDate!: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  preferredTime!: string;

  @ApiProperty({
    example: 'Persistent headache for the past 3 days',
    description: 'Free-text reason for the visit. Stored separately from this booking record as clinical content.',
  })
  @IsString()
  @IsNotEmpty()
  reasonForConsultation!: string;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;
}