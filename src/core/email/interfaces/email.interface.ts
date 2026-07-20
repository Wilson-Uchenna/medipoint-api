export type EmailPriority = 'low' | 'normal' | 'high' | 'critical';

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
  cid?: string; // Content-ID for inline attachments
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailOptions {
  to: string | string[] | EmailAddress | EmailAddress[];
  from?: string | EmailAddress;
  subject: string;
  text?: string;
  html?: string;
  template?: string;
  templateData?: Record<string, any>;
  cc?: string | string[] | EmailAddress | EmailAddress[];
  bcc?: string | string[] | EmailAddress | EmailAddress[];
  replyTo?: string | EmailAddress;
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
  priority?: EmailPriority;
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  providerId?: string;
  error?: string;
  timestamp: Date;
  recipient: string;
}

export interface BulkEmailResult {
  success: boolean;
  results: EmailResult[];
  totalSent: number;
  totalFailed: number;
  errors?: string[];
}

export interface EmailProvider {
  name: string;
  isConfigured(): boolean;
  sendEmail(options: EmailOptions): Promise<EmailResult>;
  sendBulkEmail(emails: EmailOptions[]): Promise<BulkEmailResult>;
  verifyConfiguration?(): Promise<boolean>;
  getDeliveryStats?(): Promise<any>;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  htmlTemplate: string;
  textTemplate?: string;
  requiredVariables: string[];
  description?: string;
  // Legacy interface - kept for backward compatibility
}

// Re-export new template interfaces
export * from './template-data.interface';

export interface EmailServiceConfig {
  defaultFrom: string;
  defaultFromName?: string;
  provider: 'resend' | 'debug' | 'smtp';
  resend?: {
    apiKey: string;
    domain?: string;
  };
  smtp?: {
    host: string;
    port: number;
    secure?: boolean;
    username: string;
    password: string;
  };
  debug?: {
    logToConsole: boolean;
    saveToFile?: boolean;
    filePath?: string;
  };
  templates?: {
    directory?: string;
    cache?: boolean;
  };
  retries?: {
    maxAttempts: number;
    backoffMs: number;
  };
}
