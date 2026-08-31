import { Controller, Get, Post, Body, Param, Query, UseGuards, Headers, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActiveUser, CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, PaymentMethod } from '../../generated/prisma/client';
import { InitializePaymentDto } from './dtos/initialize-payment.dto';

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post('consultations/:consultationId/pay')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Initialize payment for consultation', description: "Creates a payment record for a patient" })
  @ApiBody({
    type: InitializePaymentDto
  })
  @ApiResponse({ status: HttpStatus.OK, description: "Payment record created successfully"})
  @ApiResponse({ status: 400, description: "Details provided are invalid"})
  async initializePayment(
    @ActiveUser() userId: string,
    @Param('consultationId') consultationId: string,
    @Body('method') method: PaymentMethod,
  ) {
    return this.paymentsService.initializePayment(userId, consultationId, method);
  }

  @Get('verify')
  @ApiOperation({ summary: 'Verify payment (webhook callback)' })
  async verifyPayment(@Query('reference') reference: string) {
    return this.paymentsService.verifyPayment(reference);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive payment webhooks' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-paystack-signature') signature?: string,
  ) {
    // TODO: Verify webhook signature
    return this.paymentsService.handleWebhook(payload);
  }

  @Get('history')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get payment history', description: "Get payment records" })
  @ApiResponse({status: 200, description: "Payment record has been retrieved successfully"})
  async getHistory(@ActiveUser() userId: string) {
    return this.paymentsService.getPaymentHistory(userId);
  }
}