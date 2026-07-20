import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  BulkEmailResult,
  EmailAddress,
  EmailAttachment
} from '../interfaces/email.interface';

interface ResendEmailData {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
  reply_to?: string | string[];
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
    disposition?: string;
    content_id?: string;
  }>;
  tags?: Array<{
    name: string;
    value: string;
  }>;
  headers?: Record<string, string>;
}

interface ResendResponse {
  data: {
    id: string;
    from: string;
    to: string[];
    created_at: string;
  } | null;
  error: any;
}

@Injectable()
export class ResendProvider implements EmailProvider {
  private readonly logger = new Logger(ResendProvider.name);
  public readonly name = 'resend';
  private readonly resendClient: Resend | null = null;
  private readonly apiKey?: string;
  private readonly domain: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('EMAIL_RESEND_API_KEY');
    this.domain = this.configService.get<string>(
      'EMAIL_RESEND_DOMAIN',
      'mail.medipointhq.com'
    );

    if (this.apiKey) {
      this.resendClient = new Resend(this.apiKey);
      this.logger.log('Resend client initialized successfully');
    } else {
      this.logger.warn(
        'Resend API key not provided. Email sending will be disabled.'
      );
    }
}

isConfigured(): boolean {
    return !!(this.apiKey && this.resendClient);
  }

  async verifyConfiguration(): Promise<boolean> {
    if (!this.isConfigured()) {
      return false;
    }

    try {
      // Test the API key with a minimal dry-run - just check if the client is working
      // We'll assume it's valid if the client was created successfully
      // Real verification happens when actually sending emails
      return true;
    } catch (error) {
      this.logger.error('Resend configuration verification failed', error);
      return false;
    }
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    if (!this.isConfigured()) {
      throw new Error('Resend provider is not properly configured');
    }

    const recipient = this.extractFirstRecipient(options.to);

    try {
      const emailData = this.buildResendEmailData(options);

      this.logger.debug(`Sending email via Resend to: ${recipient}`);

      const response = await this.resendClient!.emails.send(emailData);

      if (response.error) {
        this.logger.error(
          `Failed to send email via Resend to ${recipient}`,
          response.error
        );

        return {
          success: false,
          error: response.error.message || 'Unknown Resend error',
          timestamp: new Date(),
          recipient
        };
      }

      this.logger.log(
        `Email sent successfully via Resend. ID: ${response.data.id}, To: ${recipient}`
      );

      return {
        success: true,
        messageId: response.data.id,
        providerId: 'resend',
        timestamp: new Date(),
        recipient
      };
    } catch (error) {
      this.logger.error(
        `Failed to send email via Resend to ${recipient}`,
        error
      );

      return {
        success: false,
        error: error.message || 'Unknown Resend error',
        timestamp: new Date(),
        recipient
      };
    }
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<BulkEmailResult> {
    if (!this.isConfigured()) {
      throw new Error('Resend provider is not properly configured');
    }

    this.logger.log(`Sending bulk email via Resend: ${emails.length} emails`);

    const results: EmailResult[] = [];
    const errors: string[] = [];

    // Resend doesn't have a native bulk API, so we send individually
    // We could batch these for better performance
    for (const emailOptions of emails) {
      try {
        const result = await this.sendEmail(emailOptions);
        results.push(result);

        if (!result.success) {
          errors.push(`${result.recipient}: ${result.error}`);
        }

        // Small delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        const recipient = this.extractFirstRecipient(emailOptions.to);
        results.push({
          success: false,
          error: error.message,
          timestamp: new Date(),
          recipient
        });
        errors.push(`${recipient}: ${error.message}`);
      }
    }

    const totalSent = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSent;

    this.logger.log(
      `Bulk email completed via Resend: ${totalSent}/${results.length} successful`
    );

    return {
      success: totalFailed === 0,
      results,
      totalSent,
      totalFailed,
      errors: errors.length > 0 ? errors : undefined
    };
  }
 async getDeliveryStats(): Promise<any> {
    if (!this.isConfigured()) {
      return null;
    }

    return {
      provider: 'resend',
      status: 'configured',
      domain: this.domain,
      apiKeyValid: this.isConfigured(),
      note: 'API key validation occurs during email sending'
    };
  }

  private buildResendEmailData(options: EmailOptions): any {
    const emailData: any = {
      from: this.formatFromAddress(options.from),
      to: this.formatRecipientsForResend(options.to),
      subject: options.subject
    };

    if (options.html) {
      emailData.html = options.html;
    }

    if (options.text) {
      emailData.text = options.text;
    }

    if (options.cc) {
      emailData.cc = this.formatRecipientsForResend(options.cc);
    }

    if (options.bcc) {
      emailData.bcc = this.formatRecipientsForResend(options.bcc);
    }

    if (options.replyTo) {
      emailData.reply_to = this.formatEmailAddress(options.replyTo);
    }

    if (options.attachments && options.attachments.length > 0) {
      emailData.attachments = this.formatAttachments(options.attachments);
    }

    if (options.tags && options.tags.length > 0) {
      emailData.tags = options.tags.map((tag, index) => ({
        name: `tag_${index}`,
        value: tag
      }));
    }

    if (options.headers) {
      emailData.headers = options.headers;
    }

    return emailData;
  }

  private formatFromAddress(from?: string | EmailAddress): string {
    if (!from) {
      return this.domain;
    }

    if (typeof from === 'string') {
      return from;
    }

    return from.name ? `${from.name} <${from.email}>` : from.email;
  }

  private formatRecipients(
    recipients: string | string[] | EmailAddress | EmailAddress[]
  ): string[] {
    if (typeof recipients === 'string') {
      return [recipients];
    }

    if (Array.isArray(recipients)) {
      return recipients.map((r) => this.formatEmailAddress(r));
    }

    return [this.formatEmailAddress(recipients)];
  }

  private formatRecipientsForResend(
    recipients: string | string[] | EmailAddress | EmailAddress[]
  ): string | string[] {
    if (typeof recipients === 'string') {
      return recipients;
    }

    if (Array.isArray(recipients)) {
      const formatted = recipients.map((r) => this.formatEmailAddress(r));
      return formatted.length === 1 ? formatted[0] : formatted;
    }

    return this.formatEmailAddress(recipients);
  }

  private formatEmailAddress(address: string | EmailAddress): string {
    if (typeof address === 'string') {
      return address;
    }

    return address.name ? `${address.name} <${address.email}>` : address.email;
  }

  private extractFirstRecipient(
    recipients: string | string[] | EmailAddress | EmailAddress[]
  ): string {
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

  private formatAttachments(attachments: EmailAttachment[]): Array<{
    filename: string;
    content: string | Buffer;
    type?: string;
    disposition?: string;
    content_id?: string;
  }> {
    return attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      type: attachment.contentType,
      disposition: attachment.cid ? 'inline' : 'attachment',
      content_id: attachment.cid
    }));
  }
}