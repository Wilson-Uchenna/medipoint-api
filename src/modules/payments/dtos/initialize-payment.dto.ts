import { IsEnum, IsOptional, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../../../generated/prisma/enums';

export class InitializePaymentDto {
  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CARD })
  @IsEnum(PaymentMethod)
  method!: PaymentMethod;

  @ApiPropertyOptional({ example: 'https://www.medipointhq.com/dashboard/patient/payment/callback' })
  @IsOptional()
  @IsUrl()
  callbackUrl?: string;
}