import { Module } from '@nestjs/common';
import { HealthcareProfessionalsService } from './healthcare-professionals.service';
import { HealthcareProfessionalsController } from './healthcare-professionals.controller';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from 'src/core/email/email.service';
import { ResendProvider } from 'src/core/email/providers/resend.provider';
import { DebugProvider } from 'src/core/email/providers/debug-provider';
import { TemplateEngineService } from 'src/core/email/templates/template-engine/template-engine.service';
import { TemplateService } from 'src/core/email/templates/template.service';

@Module({
  providers: [
    HealthcareProfessionalsService,
    NotificationsService,
    EmailService,
    ResendProvider,
    DebugProvider,
    TemplateEngineService,
    TemplateService
  ],
  controllers: [HealthcareProfessionalsController],
})
export class HealthcareProfessionalsModule {}
