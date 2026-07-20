import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import {
  EmailProvider,
  EmailOptions,
  EmailResult,
  BulkEmailResult,
  EmailAddress
} from '../interfaces/email.interface';

@Injectable()
export class DebugProvider implements EmailProvider {
  private readonly logger = new Logger(DebugProvider.name);
  public readonly name = 'debug';
  private readonly logToConsole: boolean;
  private readonly saveToFile: boolean;
  private readonly filePath: string;

  constructor(private readonly configService: ConfigService) {
    this.logToConsole = this.configService.get<boolean>(
      'EMAIL_DEBUG_LOG_CONSOLE',
      true
    );
    this.saveToFile = this.configService.get<boolean>(
      'EMAIL_DEBUG_SAVE_FILE',
      false
    );
    this.filePath = this.configService.get<string>(
      'EMAIL_DEBUG_FILE_PATH',
      './logs/debug-emails.log'
    );

    this.logger.log('Debug email provider initialized');
    if (this.saveToFile) {
      this.ensureLogDirectory();
    }
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      const dir = path.dirname(this.filePath);
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      this.logger.error(
        'Failed to create log directory for debug emails',
        error
      );
    }
  }

  isConfigured(): boolean {
    return true; // Debug provider is always configured
  }

  async verifyConfiguration(): Promise<boolean> {
    return true; // Debug provider is always valid
  }

  async sendEmail(options: EmailOptions): Promise<EmailResult> {
    const recipient = this.extractFirstRecipient(options.to);
    const timestamp = new Date();

    // Create a unique message ID for tracking
    const messageId = `debug_${timestamp.getTime()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Build debug email info
    const emailInfo = this.buildDebugEmailInfo(options, messageId, timestamp);

    // Log to console if enabled
    if (this.logToConsole) {
      this.logEmailToConsole(emailInfo);
    }

    // Save to file if enabled
    if (this.saveToFile) {
      await this.saveEmailToFile(emailInfo);
    }

    // Simulate a small delay to mimic real email sending
    await new Promise((resolve) =>
      setTimeout(resolve, Math.random() * 200 + 50)
    );

    // Simulate occasional failures for testing (1% chance)
    if (Math.random() < 0.01) {
      const error = 'Simulated debug provider failure';
      this.logger.error(`Debug email failure simulation: ${error}`);

      return {
        success: false,
        error,
        timestamp,
        recipient
      };
    }

    return {
      success: true,
      messageId,
      providerId: 'debug',
      timestamp,
      recipient
    };
  }

  async sendBulkEmail(emails: EmailOptions[]): Promise<BulkEmailResult> {
    this.logger.log(`Debug bulk email sending: ${emails.length} emails`);

    const results: EmailResult[] = [];
    const errors: string[] = [];

    // Process each email
    for (let i = 0; i < emails.length; i++) {
      const emailOptions = emails[i];

      try {
        const result = await this.sendEmail(emailOptions);
        results.push(result);

        if (!result.success) {
          errors.push(`Email ${i + 1}: ${result.error}`);
        }
      } catch (error: any) {
        const recipient = this.extractFirstRecipient(emailOptions.to);
        results.push({
          success: false,
          error: error.message,
          timestamp: new Date(),
          recipient
        });
        errors.push(`Email ${i + 1} (${recipient}): ${error.message}`);
      }
    }

    const totalSent = results.filter((r) => r.success).length;
    const totalFailed = results.length - totalSent;

    if (this.logToConsole) {
      console.log(`\n📧 DEBUG BULK EMAIL SUMMARY:`);
      console.log(`   Total: ${results.length}`);
      console.log(`   Sent: ${totalSent}`);
      console.log(`   Failed: ${totalFailed}`);
      if (errors.length > 0) {
        console.log(`   Errors: ${errors.length}`);
      }
    }

    return {
      success: totalFailed === 0,
      results,
      totalSent,
      totalFailed,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  async getDeliveryStats(): Promise<any> {
    return {
      provider: 'debug',
      status: 'active',
      features: {
        logToConsole: this.logToConsole,
        saveToFile: this.saveToFile,
        filePath: this.saveToFile ? this.filePath : null
      },
      note: 'Debug provider simulates email sending for development'
    };
  }

  private buildDebugEmailInfo(
    options: EmailOptions,
    messageId: string,
    timestamp: Date
  ): any {
    return {
      messageId,
      timestamp: timestamp.toISOString(),
      from: this.formatEmailAddress(options.from || 'debug@localhost'),
      to: this.formatRecipients(options.to),
      cc: options.cc ? this.formatRecipients(options.cc) : undefined,
      bcc: options.bcc ? this.formatRecipients(options.bcc) : undefined,
      replyTo: options.replyTo
        ? this.formatEmailAddress(options.replyTo)
        : undefined,
      subject: options.subject,
      content: {
        text: options.text || null,
        html: options.html || null,
        template: options.template || null,
        templateData: options.templateData || null
      },
      attachments:
        options.attachments?.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size:
            typeof att.content === 'string'
              ? att.content.length
              : att.content?.length || 0,
          cid: att.cid
        })) || [],
      metadata: {
        tags: options.tags || [],
        headers: options.headers || {},
        priority: options.priority || 'normal',
        customMetadata: options.metadata || {}
      }
    };
  }

  private logEmailToConsole(emailInfo: any): void {
    console.log('\n📧 DEBUG EMAIL:');
    console.log('─'.repeat(60));
    console.log(`📬 Message ID: ${emailInfo.messageId}`);
    console.log(`🕐 Timestamp: ${emailInfo.timestamp}`);
    console.log(`📧 From: ${emailInfo.from}`);
    console.log(
      `📮 To: ${
        Array.isArray(emailInfo.to) ? emailInfo.to.join(', ') : emailInfo.to
      }`
    );

    if (emailInfo.cc) {
      console.log(
        `📄 CC: ${
          Array.isArray(emailInfo.cc) ? emailInfo.cc.join(', ') : emailInfo.cc
        }`
      );
    }

    if (emailInfo.bcc) {
      console.log(
        `📄 BCC: ${
          Array.isArray(emailInfo.bcc)
            ? emailInfo.bcc.join(', ')
            : emailInfo.bcc
        }`
      );
    }

    console.log(`📝 Subject: ${emailInfo.subject}`);

    if (emailInfo.content.template) {
      console.log(`🎨 Template: ${emailInfo.content.template}`);
      if (emailInfo.content.templateData) {
        console.log(
          `📊 Template Data:`,
          JSON.stringify(emailInfo.content.templateData, null, 2)
        );
      }
    }

    if (emailInfo.content.text) {
      console.log('📄 Text Content:');
      console.log(
        emailInfo.content.text.substring(0, 200) +
          (emailInfo.content.text.length > 200 ? '...' : '')
      );
    }

    if (emailInfo.content.html) {
      console.log('🌐 HTML Content:');
      console.log(
        emailInfo.content.html.substring(0, 200) +
          (emailInfo.content.html.length > 200 ? '...' : '')
      );
    }

    if (emailInfo.attachments && emailInfo.attachments.length > 0) {
      console.log(`📎 Attachments: ${emailInfo.attachments.length}`);
      emailInfo.attachments.forEach((att: any, i: number) => {
        console.log(
          `   ${i + 1}. ${att.filename} (${att.contentType || 'unknown'}, ${
            att.size
          } bytes)`
        );
      });
    }

    if (emailInfo.metadata.tags.length > 0) {
      console.log(`🏷️  Tags: ${emailInfo.metadata.tags.join(', ')}`);
    }

    console.log('─'.repeat(60));
  }

  private async saveEmailToFile(emailInfo: any): Promise<void> {
    try {
      const logEntry = {
        ...emailInfo,
        separator: '='.repeat(80)
      };

      const logLine =
        JSON.stringify(logEntry, null, 2) + '\n' + '='.repeat(80) + '\n';
      await fs.appendFile(this.filePath, logLine);
    } catch (error) {
      this.logger.error('Failed to save debug email to file', error);
    }
  }

  private formatRecipients(
    recipients: string | string[] | EmailAddress | EmailAddress[]
  ): string | string[] {
    if (typeof recipients === 'string') {
      return recipients;
    }

    if (Array.isArray(recipients)) {
      return recipients.map((r) => this.formatEmailAddress(r));
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
      if (recipients.length === 0) return 'unknown@localhost';
      const first = recipients[0];
      return typeof first === 'string' ? first : first.email;
    }

    return typeof recipients === 'string' ? recipients : recipients.email;
  }
}
