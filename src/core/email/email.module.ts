import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { EmailService } from './email.service';
import { TemplateService } from '../email/templates/template.service';
import { TemplateEngineService } from '../email/templates/template-engine/template-engine.service';
import { ResendProvider } from './providers/resend.provider';
import { DebugProvider } from './providers/debug-provider';

/**
 * EmailModule
 *
 * Global module that provides email services with multiple provider support:
 * - Resend for production
 * - Debug for development
 * - Template rendering system
 * - Configuration-based provider switching
 *
 * Environment Variables:
 * - EMAIL_PROVIDER: 'resend' | 'debug' (default: 'debug')
 * - EMAIL_FROM: Default from address
 * - EMAIL_FROM_NAME: Default from name
 * - EMAIL_RESEND_API_KEY: Resend API key
 * - EMAIL_RESEND_DOMAIN: Resend sending domain
 * - EMAIL_DEBUG_LOG_CONSOLE: Log emails to console (default: true)
 * - EMAIL_DEBUG_SAVE_FILE: Save emails to file (default: false)
 * - EMAIL_DEBUG_FILE_PATH: File path for debug emails (default: './logs/debug-emails.log')
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    TemplateEngineService,
    TemplateService,
    ResendProvider,
    DebugProvider,
    EmailService,
  ],
  exports: [
    EmailService,
    TemplateService,
    TemplateEngineService,
  ],
})
export class EmailModule {}