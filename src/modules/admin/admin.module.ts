import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { EmailService } from 'src/core/email/email.service';
import { ResendProvider } from 'src/core/email/providers/resend.provider';
import { DebugProvider } from 'src/core/email/providers/debug-provider';
import { TemplateService } from 'src/core/email/templates/template.service';
import { TemplateEngineService } from 'src/core/email/templates/template-engine/template-engine.service';

@Module({
  providers: [AdminService, EmailService, ResendProvider, DebugProvider, TemplateService, TemplateEngineService],
  controllers: [AdminController]
})
export class AdminModule {}
