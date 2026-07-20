import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProfessionalType } from '@prisma/client';

export class CreateProfessionalProfileDto {
  @ApiProperty({ enum: ProfessionalType, example: ProfessionalType.DOCTOR })
  @IsEnum(ProfessionalType)
  @IsNotEmpty()
  professionalType!: ProfessionalType;

  @ApiProperty({ example: 'MDCN-12345-LG' })
  @IsString()
  @IsNotEmpty()
  licenseNumber!: string;

  @ApiPropertyOptional({ example: 'Cardiology' })
  @IsOptional()
  @IsString()
  specialty?: string;

  @ApiPropertyOptional({ example: 'Board-certified cardiologist with 10 years experience...' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  yearsOfExperience?: number;
}