import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PaystackProvider } from './provider/paystack.provider';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from 'src/core/email/email.service';
import { ResendProvider } from 'src/core/email/providers/resend.provider';
import { DebugProvider } from 'src/core/email/providers/debug-provider';
import { TemplateService } from 'src/core/email/templates/template.service';
import { TemplateEngineService } from 'src/core/email/templates/template-engine/template-engine.service';

@Module({
  imports: [],
  providers: [
    PaymentsService,
    PaystackProvider,
    ResendProvider,
    DebugProvider,
    TemplateService,
    TemplateEngineService,
    NotificationsService,
    EmailService,
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
