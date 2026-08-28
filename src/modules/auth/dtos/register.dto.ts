// src/auth/dtos/register.dto.ts
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserRole } from '../../../generated/prisma/client';
import { ProfessionalType } from 'src/generated/prisma/enums';

class PatientDataDto {
  @IsOptional() dateOfBirth?: string;
  @IsOptional() gender?: string;
  @IsOptional() bloodGroup?: string;
  @IsOptional() address?: string;
  @IsOptional() emergencyContactName?: string;
  @IsOptional() emergencyContactPhone?: string;
  @IsOptional() emergencyContactRelationship?: string;
}

class ProfessionalDataDto {
  @IsEnum(ProfessionalType) professionalType: ProfessionalType;
  @IsString() licenseNumber: string;
  @IsOptional() specialty?: string;
  @IsOptional() yearsOfExperience?: number;
  @IsOptional() bio?: string;
}

export class RegisterDto {
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
  @IsString() confirmPassword: string;
  @IsString() firstName: string;
  @IsString() lastName: string;
  @IsString() phoneNumber: string;
  @IsEnum(UserRole) role: UserRole;

  @IsOptional()
  @ValidateNested()
  @Type(() => PatientDataDto)
  patientData?: PatientDataDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => ProfessionalDataDto)
  professionalData?: ProfessionalDataDto;
}
