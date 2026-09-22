import { Controller, Get, Post, Body, Param, Query, UseGuards, Headers, HttpStatus, Req, UnauthorizedException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { PaystackProvider } from './provider/paystack.provider';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PaymentMethod } from '../../generated/prisma/client';
import { InitializePaymentDto } from './dtos/initialize-payment.dto';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import type { Request } from 'express';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private paystackProvider: PaystackProvider,
  ) {}

  @Post('consultations/:consultationId/pay')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Initialize payment for consultation' })
  @ApiBody({ type: InitializePaymentDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Payment initialized; redirect the user to authorizationUrl.' })
  @ApiResponse({ status: 400, description: 'Details provided are invalid.' })
 @Post('consultations/:consultationId/pay')
@Roles(UserRole.PATIENT)
async initializePayment(
  @ActiveUser() currentUser: ActiveUserData,
  @Param('consultationId') consultationId: string,
  @Body() dto: InitializePaymentDto,
) {
  return this.paymentsService.initializePayment(currentUser.sub, consultationId, dto.method, dto.callbackUrl);
}

  @Get('verify')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Manually verify a payment (fallback if webhook is delayed)' })
  async verifyPayment(
    @ActiveUser() currentUser: ActiveUserData,
    @Query('reference') reference: string,
  ) {
    return this.paymentsService.verifyPayment(reference, currentUser.sub);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Paystack webhook receiver — not for browser/client use' })
  async handleWebhook(@Req() req: Request, @Headers('x-paystack-signature') signature: string) {
    const rawBody = (req as any).rawBody?.toString();
    if (!rawBody || !signature || !this.paystackProvider.verifyWebhookSignature(rawBody, signature)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return this.paymentsService.handleWebhookEvent(JSON.parse(rawBody));
  }

  @Get('history')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get payment history' })
  @ApiResponse({ status: 200, description: 'Payment records retrieved successfully.' })
  async getHistory(@ActiveUser() currentUser: ActiveUserData) {
    return this.paymentsService.getPaymentHistory(currentUser.sub);
  }
}