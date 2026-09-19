import { IsString, IsNotEmpty, IsEnum, IsDateString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType, ConsultationDuration, ProfessionalType } from '../../../generated/prisma/enums';

export class CreateBookingDto {
  @ApiProperty({ enum: ProfessionalType, example: ProfessionalType.DOCTOR })
  @IsEnum(ProfessionalType)
  requestedProfessionalType!: ProfessionalType;

  @ApiPropertyOptional({ example: 'Cardiology', description: 'Specific specialty within the chosen professional type, if applicable.' })
  @IsOptional()
  @IsString()
  requestedSpecialty?: string;

  @ApiProperty({ enum: ConsultationType, example: ConsultationType.VIRTUAL })
  @IsEnum(ConsultationType)
  consultationType!: ConsultationType;

  @ApiProperty({ enum: ConsultationDuration, example: ConsultationDuration.MIN_30 })
  @IsEnum(ConsultationDuration)
  duration!: ConsultationDuration;

  @ApiProperty({ example: '2026-10-01' })
  @IsDateString()
  preferredDate!: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  preferredTime!: string;

  @ApiProperty({ example: 'Persistent headache for the past 3 days' })
  @IsString()
  @IsNotEmpty()
  reasonForConsultation!: string;
}