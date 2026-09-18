import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackProvider } from './provider/paystack.provider';

@Module({
  imports: [],
  providers: [PaymentsService, PaystackProvider],
  controllers: [PaymentsController]
})
export class PaymentsModule {}
