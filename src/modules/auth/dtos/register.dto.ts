// src/auth/dtos/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '../../../generated/prisma/client';
import { ProfessionalType } from 'src/generated/prisma/enums';

class PatientDataDto {
  @ApiPropertyOptional({ description: 'Date of birth (ISO 8601)', example: '1990-05-15' })
  @IsOptional()
  dateOfBirth?: string;

  @ApiPropertyOptional({ description: 'Gender', example: 'Female' })
  @IsOptional()
  gender?: string;

  @ApiPropertyOptional({ description: 'Blood group', example: 'O+' })
  @IsOptional()
  bloodGroup?: string;

  @ApiPropertyOptional({ description: 'Home address', example: '123 Main St, Lagos' })
  @IsOptional()
  address?: string;

  @ApiPropertyOptional({ description: 'Emergency contact full name', example: 'Jane Doe' })
  @IsOptional()
  emergencyContactName?: string;

  @ApiPropertyOptional({ description: 'Emergency contact phone number', example: '+2348012345678' })
  @IsOptional()
  emergencyContactPhone?: string;

  @ApiPropertyOptional({ description: 'Relationship to emergency contact', example: 'Sister' })
  @IsOptional()
  emergencyContactRelationship?: string;
}

class ProfessionalDataDto {
  @ApiProperty({
    description: 'Type of healthcare professional',
    enum: ProfessionalType,
    example: ProfessionalType.DOCTOR,
  })
  @IsEnum(ProfessionalType)
  professionalType: ProfessionalType;

  @ApiProperty({ description: 'Professional license number', example: 'MDCN-12345' })
  @IsString()
  licenseNumber: string;

  @ApiPropertyOptional({ description: 'Area of specialty', example: 'Cardiology' })
  @IsOptional()
  specialty?: string;

  @ApiPropertyOptional({ description: 'Years of professional experience', example: 5 })
  @IsOptional()
  @IsNumber()
  yearsOfExperience?: number;

  @ApiPropertyOptional({ description: 'Short professional biography', example: 'Board-certified cardiologist with 5 years of experience.' })
  @IsOptional()
  bio?: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Email address', example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Password (min 8 characters)', example: 'password123', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ description: 'Password confirmation, must match password', example: 'password123' })
  @IsString()
  confirmPassword: string;

  @ApiProperty({ description: 'First name', example: 'John' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Last name', example: 'Doe' })
  @IsString()
  lastName: string;

  @ApiProperty({ description: 'Phone number', example: '+2348012345678' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({
    description: 'Account role. ADMIN cannot be self-registered.',
    enum: UserRole,
    example: UserRole.PATIENT,
  })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({
    description: 'Required when role is PATIENT',
    type: PatientDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PatientDataDto)
  patientData?: PatientDataDto;

  @ApiPropertyOptional({
    description: 'Required when role is DOCTOR, PHARMACIST, DIETITIAN, or OPTOMETRIST',
    type: ProfessionalDataDto,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ProfessionalDataDto)
  professionalData?: ProfessionalDataDto;
}