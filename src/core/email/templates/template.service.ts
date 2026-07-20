import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailTemplate } from '../interfaces/email.interface';
import { TemplateEngineService } from '../templates/template-engine/template-engine.service';
import {
  RenderedTemplateContent,
  TemplateDataMap,
  TemplateValidationResult,
} from '../interfaces/template-data.interface';

interface RenderedContent {
  html: string;
  text?: string;
}

@Injectable()
export class TemplateService {
  private readonly logger = new Logger(TemplateService.name);
  private legacyTemplates: Map<string, EmailTemplate> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly templateEngine: TemplateEngineService,
  ) {
    this.loadDefaultTemplates();
  }

  /**
   * Get a template by name (new file-based templates)
   */
  async getTemplate(name: string): Promise<EmailTemplate | null> {
    // Try new template engine first
    try {
      const metadata = await this.templateEngine.getTemplateMetadata(name);
      if (metadata) {
        return {
          name: metadata.config.name,
          subject: metadata.config.subject,
          htmlTemplate: '', // Not used in new system
          textTemplate: '', // Not used in new system
          requiredVariables: metadata.config.requiredVariables,
          description: metadata.config.description,
        };
      }
    } catch (error) {
      this.logger.debug(
        `Template '${name}' not found in new engine, checking legacy`,
      );
    }

    // Fallback to legacy templates
    return this.legacyTemplates.get(name) || null;
  }

  /**
   * Render a template with data (using new template engine)
   */
  async renderTemplate(
    template: EmailTemplate,
    data: Record<string, any>,
  ): Promise<RenderedContent> {
    try {
      // Try new template engine first
      const rendered = await this.templateEngine.renderTemplate(
        template.name,
        data,
      );
      return {
        html: rendered.html,
        text: rendered.text,
      };
    } catch (error) {
      this.logger.debug(
        `New template engine failed for '${template.name}', using legacy`,
      );

      // Fallback to legacy rendering
      try {
        const html = await this.renderString(template.htmlTemplate, data);
        const text = template.textTemplate
          ? await this.renderString(template.textTemplate, data)
          : undefined;
        return { html, text };
      } catch (legacyError) {
        this.logger.error(
          `Failed to render template: ${template.name}`,
          legacyError,
        );
        throw new Error(`Template rendering failed: ${legacyError.message}`);
      }
    }
  }

  /**
   * Type-safe template rendering
   */
  async renderTypedTemplate<T extends keyof TemplateDataMap>(
    templateName: T,
    data: TemplateDataMap[T],
  ): Promise<RenderedTemplateContent> {
    return await this.templateEngine.renderTemplate(templateName, data);
  }

  /**
   * Validate template data before rendering
   */
  async validateTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<TemplateValidationResult> {
    return this.templateEngine.validateTemplateData(templateName, data);
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateName: string,
  ): Promise<RenderedTemplateContent> {
    return await this.templateEngine.previewTemplate(templateName);
  }

  /**
   * Render a string template with data
   */
  async renderString(
    template: string,
    data: Record<string, any>,
  ): Promise<string> {
    // Simple template rendering using template literals style {{variable}}
    let rendered = template;

    // Replace all {{variable}} with actual values
    rendered = rendered.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
      const trimmedKey = key.trim();
      const value = this.getNestedValue(data, trimmedKey);

      if (value === undefined || value === null) {
        this.logger.warn(`Template variable not found: ${trimmedKey}`);
        return match; // Keep the placeholder if value not found
      }

      return String(value);
    });

    return rendered;
  }

  /**
   * Register a new legacy template
   */
  registerLegacyTemplate(template: EmailTemplate): void {
    this.legacyTemplates.set(template.name, template);
    this.logger.log(`Registered legacy email template: ${template.name}`);
  }

  /**
   * Get all available templates
   */
  getAvailableTemplates(): string[] {
    const newTemplates = this.templateEngine.getAvailableTemplates();
    const legacyTemplates = Array.from(this.legacyTemplates.keys());
    return [...new Set([...newTemplates, ...legacyTemplates])];
  }

  /**
   * Load default templates
   */
  private loadDefaultTemplates(): void {
    // Legacy templates - kept for backward compatibility
    // New templates are now file-based in src/core/email/templates/

    // Organization Welcome Template (legacy)
    this.registerLegacyTemplate({
      name: 'organization-welcome',
      subject: 'Welcome to {{organizationName}} - Your HR Platform is Ready!',
      htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {{organizationName}}</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 12px 24px; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .highlight { background: #fef3c7; padding: 10px; border-radius: 4px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Welcome to {{organizationName}}!</h1>
            <p>Your HR Management Platform is ready to use</p>
        </div>
        
        <div class="content">
            <div class="card">
                <h2>Hello {{adminName}}!</h2>
                <p>Congratulations! Your organization <strong>{{organizationName}}</strong> has been successfully set up on our HR Management Platform.</p>
                
                <div class="highlight">
                    <p><strong>🚀 You're all set!</strong> Your admin account has been created and you can now start using all the features of our comprehensive HR platform.</p>
                </div>
            </div>

            <div class="card">
                <h3>🔑 Next Steps:</h3>
                <ol>
                    <li><strong>Access your platform:</strong> Click the button below to log in</li>
                    <li><strong>Complete your profile:</strong> Add company information and branding</li>
                    <li><strong>Set up departments:</strong> Create your organizational structure</li>
                    <li><strong>Invite your team:</strong> Add employees and assign roles</li>
                    <li><strong>Configure settings:</strong> Customize leave policies, approval workflows, and more</li>
                </ol>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="{{loginUrl}}" class="btn">Access Your HR Platform →</a>
                </p>
            </div>

            <div class="card">
                <h3>💼 What you can do:</h3>
                <ul>
                    <li><strong>Employee Management:</strong> Manage employee profiles, contracts, and documents</li>
                    <li><strong>Leave Management:</strong> Set up leave types, approve requests, and track balances</li>
                    <li><strong>Performance Reviews:</strong> Conduct 360-degree reviews and set goals</li>
                    <li><strong>Workflow Automation:</strong> Streamline onboarding and offboarding processes</li>
                    <li><strong>Reporting & Analytics:</strong> Get insights with comprehensive reports</li>
                </ul>
            </div>
        </div>

        <div class="footer">
            <p>Need help? Contact our support team or visit our documentation.</p>
            <p>© {{year}} HR Management Platform. All rights reserved.</p>
        </div>
    </div>
</body>
</html>`,
      textTemplate: `
Welcome to {{organizationName}}!

Hello {{adminName}},

Congratulations! Your organization "{{organizationName}}" has been successfully set up on our HR Management Platform.

🚀 You're all set! Your admin account has been created and you can now start using all the features of our comprehensive HR platform.

Next Steps:
1. Access your platform: {{loginUrl}}
2. Complete your profile: Add company information and branding
3. Set up departments: Create your organizational structure
4. Invite your team: Add employees and assign roles
5. Configure settings: Customize leave policies, approval workflows, and more

What you can do:
• Employee Management: Manage employee profiles, contracts, and documents
• Leave Management: Set up leave types, approve requests, and track balances
• Performance Reviews: Conduct 360-degree reviews and set goals
• Workflow Automation: Streamline onboarding and offboarding processes
• Reporting & Analytics: Get insights with comprehensive reports

Access your platform: {{loginUrl}}

Need help? Contact our support team or visit our documentation.

© {{year}} HR Management Platform. All rights reserved.
`,
      requiredVariables: ['adminName', 'organizationName', 'loginUrl', 'year'],
      description: 'Welcome email sent to new organization admins after setup',
    });

    // Password Reset Template (legacy)
    this.registerLegacyTemplate({
      name: 'password-reset',
      subject: 'Reset Your Password',
      htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
        .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px; margin: 10px 0; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Password Reset Request</h1>
        </div>
        
        <div class="content">
            <div class="card">
                <h2>Hello {{name}},</h2>
                <p>You requested a password reset for your HR platform account.</p>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="{{resetUrl}}" class="btn">Reset Your Password</a>
                </p>
                
                <div class="warning">
                    <p><strong>⚠️ Security Notice:</strong></p>
                    <ul>
                        <li>This link expires in {{expiryHours}} hours</li>
                        <li>If you didn't request this reset, please ignore this email</li>
                        <li>Never share this link with anyone</li>
                    </ul>
                </div>
            </div>
        </div>

        <div class="footer">
            <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
            <p>{{resetUrl}}</p>
        </div>
    </div>
</body>
</html>`,
      textTemplate: `
Password Reset Request

Hello {{name}},

You requested a password reset for your HR platform account.

Reset your password: {{resetUrl}}

⚠️ Security Notice:
• This link expires in {{expiryHours}} hours
• If you didn't request this reset, please ignore this email
• Never share this link with anyone

If you're having trouble with the link above, copy and paste this URL into your browser:
{{resetUrl}}
`,
      requiredVariables: ['name', 'resetUrl', 'expiryHours'],
      description: 'Password reset email with secure token',
    });

    // Email Verification Template (legacy)
    this.registerLegacyTemplate({
      name: 'email-verification',
      subject: 'Verify Your Email Address',
      htmlTemplate: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verify Your Email</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; }
        .card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .btn { display: inline-block; padding: 12px 24px; background: #059669; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
        .footer { background: #374151; color: #9ca3af; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>✅ Verify Your Email</h1>
        </div>
        
        <div class="content">
            <div class="card">
                <h2>Hello {{name}},</h2>
                <p>Please verify your email address to complete your account setup.</p>
                
                <p style="text-align: center; margin-top: 30px;">
                    <a href="{{verificationUrl}}" class="btn">Verify Email Address</a>
                </p>
                
                <p><strong>This verification link expires in {{expiryHours}} hours.</strong></p>
            </div>
        </div>

        <div class="footer">
            <p>If you're having trouble with the button above, copy and paste this URL into your browser:</p>
            <p>{{verificationUrl}}</p>
        </div>
    </div>
</body>
</html>`,
      textTemplate: `
Verify Your Email Address

Hello {{name}},

Please verify your email address to complete your account setup.

Verify your email: {{verificationUrl}}

This verification link expires in {{expiryHours}} hours.

If you're having trouble with the link above, copy and paste this URL into your browser:
{{verificationUrl}}
`,
      requiredVariables: ['name', 'verificationUrl', 'expiryHours'],
      description: 'Email verification for new accounts',
    });

    this.logger.log(
      `Loaded ${this.legacyTemplates.size} legacy email templates`,
    );
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }
}
