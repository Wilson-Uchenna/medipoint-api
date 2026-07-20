import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  BulkEmailResult,
  EmailServiceConfig,
  EmailPriority,
} from './interfaces/email.interface';
import { ResendProvider } from './providers/resend.provider';
import { DebugProvider } from './providers/debug-provider';
import { TemplateService } from './templates/template.service';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private provider: EmailProvider;
  private readonly config: EmailServiceConfig;

  constructor(
    private readonly configService: ConfigService,
    private readonly resendProvider: ResendProvider,
    private readonly debugProvider: DebugProvider,
    private readonly templateService: TemplateService,
  ) {
    this.config = this.loadConfig();
    this.provider = this.selectProvider();

    this.logger.log(
      `Email service initialized with provider: ${this.provider.name}`,
    );
    this.verifyProvider();
  }

  private loadConfig(): EmailServiceConfig {
    return {
      defaultFrom: this.configService.get<string>(
        'EMAIL_FROM',
        'noreply@localhost',
      ),
      defaultFromName: this.configService.get<string>('EMAIL_FROM_NAME'),
      provider: this.configService.get<'resend' | 'debug' | 'smtp'>(
        'EMAIL_PROVIDER',
        'debug',
      ),
      resend: {
        apiKey: this.configService.get<string>('EMAIL_RESEND_API_KEY')!,
        domain: this.configService.get<string>('EMAIL_RESEND_DOMAIN'),
      },
      debug: {
        logToConsole: this.configService.get<boolean>(
          'EMAIL_DEBUG_LOG_CONSOLE',
          true,
        ),
        saveToFile: this.configService.get<boolean>(
          'EMAIL_DEBUG_SAVE_FILE',
          false,
        ),
        filePath: this.configService.get<string>(
          'EMAIL_DEBUG_FILE_PATH',
          './logs/debug-emails.log',
        ),
      },
      retries: {
        maxAttempts: this.configService.get<number>('EMAIL_MAX_RETRIES', 3),
        backoffMs: this.configService.get<number>('EMAIL_RETRY_BACKOFF', 1000),
      },
    };
  }

  private selectProvider(): EmailProvider {
    switch (this.config.provider) {
      case 'resend':
        if (this.resendProvider.isConfigured()) {
          return this.resendProvider;
        }
        this.logger.warn(
          'Resend provider not configured, falling back to debug provider',
        );
        return this.debugProvider;

      case 'debug':
        return this.debugProvider;

      default:
        this.logger.warn(
          `Unknown email provider: ${this.config.provider}, using debug provider`,
        );
        return this.debugProvider;
    }
  }

  private async verifyProvider(): Promise<void> {
    try {
      const isValid = await this.provider.verifyConfiguration?.();
      if (isValid === false) {
        this.logger.warn(
          `Email provider ${this.provider.name} configuration verification failed`,
        );
      }
    } catch (error) {
      this.logger.error('Email provider verification error', error);
    }
  }

  /**
   * Send a single email
   */
  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    try {
      // Process templates if needed
      const processedOptions = await this.processEmailOptions(options);

      // Add default from if not provided
      if (!processedOptions.from) {
        processedOptions.from = this.formatDefaultFrom();
      }

      // Send with retries
      return await this.sendWithRetries(processedOptions);
    } catch (error) {
      this.logger.error('Failed to send email', error);

      const recipient = this.extractFirstRecipient(options.to);
      return {
        success: false,
        error: error.message,
        timestamp: new Date(),
        recipient,
      };
    }
  }

  /**
   * Send multiple emails
   */
  async sendBulkEmail(emails: EmailOptions[]): Promise<BulkEmailResult> {
    this.logger.log(`Sending bulk email: ${emails.length} emails`);

    try {
      // Process all emails first
      const processedEmails = await Promise.all(
        emails.map((email) => this.processEmailOptions(email)),
      );

      // Add default from to all emails
      processedEmails.forEach((email) => {
        if (!email.from) {
          email.from = this.formatDefaultFrom();
        }
      });

      // Send using provider's bulk method
      return await this.provider.sendBulkEmail(processedEmails);
    } catch (error) {
      this.logger.error('Failed to send bulk email', error);

      return {
        success: false,
        results: [],
        totalSent: 0,
        totalFailed: emails.length,
        errors: [error.message],
      };
    }
  }
  

  async sendTemplateEmail(
    templateName: string,
    templateData: Record<string, any>,
    recipients: EmailOptions['to'],
    options: Partial<EmailOptions> = {},
  ): Promise<EmailResult> {
    const template = await this.templateService.getTemplate(templateName);

    if (!template) {
      throw new Error(`Email template '${templateName}' not found`);
    }

    // Render template
    const renderedContent = await this.templateService.renderTemplate(
      template,
      templateData,
    );

    const emailOptions: EmailOptions = {
      ...options,
      to: recipients,
      subject: options.subject || template.subject,
      html: renderedContent.html,
      text: renderedContent.text,
      template: templateName,
      templateData,
    };

    return this.sendEmail(emailOptions);
  }

  /**
   * Send welcome email for new organization setup (using new template system)
   */
  async sendProfessionalWelcomeEmail(
    providerEmail: string,
    organizationName: string,
    providerName: string,
    loginUrl: string,
  ): Promise<EmailResult> {
    try {
      // Use new type-safe template rendering
      const rendered = await this.templateService.renderTypedTemplate(
        'professional-welcome',
        {
          providerName,
          organizationName,
          loginUrl,
          currentYear: new Date().getFullYear(),
        },
      );

      return await this.sendEmail({
        to: providerEmail,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ['onboarding', 'organization-setup'],
        priority: 'high' as EmailPriority,
      });
    } catch (error) {
      // Fallback to legacy method
      this.logger.warn('New template failed, using legacy method', error);

      return this.sendTemplateEmail(
        'professional-welcome',
        {
          providerName,
          organizationName,
          loginUrl,
          year: new Date().getFullYear(),
        },
        providerEmail,
        {
          subject: `Welcome to ${organizationName} - Your HR Platform is Ready!`,
          tags: ['onboarding', 'organization-setup'],
          priority: 'high' as EmailPriority,
        },
      );
    }
  }

  /**
   * Send employee welcome email (using new template system)
   */
  async sendPatientWelcomeEmail(
    email: string,
    patientName: string,
    organizationName: string,
    loginUrl: string,
    options: {
      primaryCareProvider?: string;
      appointmentDate?: string;
      appointmentTime?: string;
    } = {},
  ): Promise<EmailResult> {
    try {
      // Use new type-safe template rendering
      const rendered = await this.templateService.renderTypedTemplate(
        'patient-welcome',
        {
          patientName,
          organizationName,
          loginUrl,
          primaryCareProvider: options.primaryCareProvider,
          appointmentDate: options.appointmentDate,
          appointmentTime: options.appointmentTime,
          currentYear: new Date().getFullYear(),
        },
      );

      return await this.sendEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ['onboarding', 'employee-welcome'],
        priority: 'high' as EmailPriority,
      });
    } catch (error) {
      this.logger.warn(
        'Employee welcome email template failed, skipping',
        error,
      );
      throw error;
    }
  }

  /**
   * Send password reset email (using new template system)
   */
  async sendPasswordResetEmail(
    email: string,
    name: string,
    resetUrl: string,
    expiryHours: number = 24,
  ): Promise<EmailResult> {
    try {
      // Use new type-safe template rendering
      const rendered = await this.templateService.renderTypedTemplate(
        'password-reset',
        {
          name,
          resetUrl,
          expiryHours,
          currentYear: new Date().getFullYear(),
        },
      );

      return await this.sendEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ['security', 'password-reset'],
        priority: 'high' as EmailPriority,
      });
    } catch (error) {
      // Fallback to legacy method
      this.logger.warn('New template failed, using legacy method', error);

      return this.sendTemplateEmail(
        'password-reset',
        {
          name,
          resetUrl,
          expiryHours,
        },
        email,
        {
          subject: 'Reset Your Password',
          tags: ['security', 'password-reset'],
          priority: 'high' as EmailPriority,
        },
      );
    }
  }

  /**
   * Send email verification email (using new template system)
   */
  async sendEmailVerificationEmail(
    email: string,
    name: string,
    verificationUrl: string,
    expiryHours: number = 48,
  ): Promise<EmailResult> {
    try {
      // Use new type-safe template rendering
      const rendered = await this.templateService.renderTypedTemplate(
        'email-verification',
        {
          name,
          verificationUrl,
          expiryHours,
          currentYear: new Date().getFullYear(),
        },
      );

      return await this.sendEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        tags: ['security', 'email-verification'],
        priority: 'normal' as EmailPriority,
      });
    } catch (error) {
      // Fallback to legacy method
      this.logger.warn('New template failed, using legacy method', error);

      return this.sendTemplateEmail(
        'email-verification',
        {
          name,
          verificationUrl,
          expiryHours,
        },
        email,
        {
          subject: 'Verify Your Email Address',
          tags: ['security', 'email-verification'],
          priority: 'normal' as EmailPriority,
        },
      );
    }
  }

  /**
   * Get current provider info
   */
  getProviderInfo(): { name: string; configured: boolean } {
    return {
      name: this.provider.name,
      configured: this.provider.isConfigured(),
    };
  }

  /**
   * Get delivery statistics
   */
  async getDeliveryStats(): Promise<any> {
    return this.provider.getDeliveryStats?.() || null;
  }

  /**
   * Switch email provider (for testing)
   */
  switchProvider(providerName: 'resend' | 'debug'): void {
    const oldProvider = this.provider.name;

    switch (providerName) {
      case 'resend':
        this.provider = this.resendProvider;
        break;
      case 'debug':
        this.provider = this.debugProvider;
        break;
      default:
        throw new Error(`Unknown provider: ${providerName}`);
    }

    this.logger.log(
      `Switched email provider from ${oldProvider} to ${this.provider.name}`,
    );
  }

  private async processEmailOptions(
    options: EmailOptions,
  ): Promise<EmailOptions> {
    const processed = { ...options };

    // If template is specified, render it
    if (processed.template && processed.templateData) {
      const template = await this.templateService.getTemplate(
        processed.template,
      );

      if (template) {
        const renderedContent = await this.templateService.renderTemplate(
          template,
          processed.templateData,
        );
        processed.html = renderedContent.html;
        processed.text = renderedContent.text;

        // Use template subject if not provided
        if (!processed.subject && template.subject) {
          processed.subject = await this.templateService.renderString(
            template.subject,
            processed.templateData,
          );
        }
      }
    }

    return processed;
  }

  private formatDefaultFrom(): string {
    if (this.config.defaultFromName) {
      return `${this.config.defaultFromName} <${this.config.defaultFrom}>`;
    }
    return this.config.defaultFrom;
  }

  private async sendWithRetries(options: EmailOptions): Promise<EmailResult> {
    const maxAttempts = this.config.retries?.maxAttempts || 3;
    const backoffMs = this.config.retries?.backoffMs || 1000;

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const result = await this.provider.sendEmail(options);

        if (result.success) {
          if (attempt > 1) {
            this.logger.log(`Email sent successfully on attempt ${attempt}`);
          }
          return result;
        }

        // If it's the last attempt, return the failed result
        if (attempt === maxAttempts) {
          return result;
        }

        // Wait before retrying
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * attempt),
        );
      } catch (error) {
        lastError = error;

        if (attempt === maxAttempts) {
          throw error;
        }

        this.logger.warn(
          `Email sending attempt ${attempt} failed, retrying...`,
          error.message,
        );
        await new Promise((resolve) =>
          setTimeout(resolve, backoffMs * attempt),
        );
      }
    }

    throw lastError || new Error('All email sending attempts failed');
  }

  private extractFirstRecipient(recipients: EmailOptions['to']): string {
    if (typeof recipients === 'string') {
      return recipients;
    }

    if (Array.isArray(recipients)) {
      if (recipients.length === 0) return 'unknown';
      const first = recipients[0];
      return typeof first === 'string' ? first : first.email;
    }

    return typeof recipients === 'string' ? recipients : recipients.email;
  }
}
