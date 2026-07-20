import { IsString, IsNotEmpty, IsEnum, IsNumber, IsPositive, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConsultationType } from '@prisma/client';

export class CreateBookingDto {
  @ApiProperty({ example: 'prof-uuid-here' })
  @IsString()
  @IsNotEmpty()
  professionalId!: string;

  @ApiProperty({ enum: ConsultationType, example: ConsultationType.VIRTUAL })
  @IsEnum(ConsultationType)
  consultationType!: ConsultationType;

  @ApiProperty({ example: 'I have been experiencing chest pain for 3 days' })
  @IsString()
  @IsNotEmpty()
  reasonForConsultation!: string;

  @ApiProperty({ example: '2024-07-15' })
  @IsString()
  @IsNotEmpty()
  preferredDate!: string;

  @ApiProperty({ example: '14:30' })
  @IsString()
  @IsNotEmpty()
  preferredTime!: string;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @IsPositive()
  amount!: number;

  @ApiPropertyOptional({ example: 'NGN' })
  @IsOptional()
  @IsString()
  currency?: string;
}