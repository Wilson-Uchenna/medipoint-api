import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotesDto {
  @ApiPropertyOptional({ example: 'Chest pain, shortness of breath, fatigue' })
  @IsOptional()
  @IsString()
  symptoms?: string;

  @ApiPropertyOptional({ example: 'Mild angina pectoris' })
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @ApiPropertyOptional({ example: 'Aspirin 75mg daily, Nitroglycerin PRN' })
  @IsOptional()
  @IsString()
  prescription?: string;

  @ApiPropertyOptional({ example: 'Patient advised to reduce stress and monitor blood pressure' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: '2024-07-22' })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}