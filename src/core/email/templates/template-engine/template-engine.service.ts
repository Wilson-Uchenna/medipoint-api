import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Handlebars from 'handlebars';
import * as fs from 'fs/promises';
import * as path from 'path';
import { watch, FSWatcher } from 'chokidar';
import {
  TemplateConfig,
  TemplateMetadata,
  RenderedTemplateContent,
  TemplateValidationResult,
  TemplateEngineOptions,
  BaseTemplateData,
} from '../../interfaces/template-data.interface';

interface CompiledTemplate {
  config: TemplateConfig;
  htmlTemplate: Handlebars.TemplateDelegate;
  textTemplate?: Handlebars.TemplateDelegate;
  subjectTemplate: Handlebars.TemplateDelegate;
}

@Injectable()
export class TemplateEngineService implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(TemplateEngineService.name);
  private readonly templates: Map<string, CompiledTemplate> = new Map();
  private readonly partials: Map<string, string> = new Map();
  private readonly layouts: Map<string, string> = new Map();
  private fileWatcher?: FSWatcher;
  private debounceTimeout?: NodeJS.Timeout;
  private readonly templateDir: string;
  private readonly options: TemplateEngineOptions;

  constructor(private readonly configService: ConfigService) {
    this.templateDir = path.join(process.cwd(), 'src/core/email/templates');
    this.options = {
      enableCache: this.configService.get<boolean>(
        'EMAIL_TEMPLATE_CACHE',
        true,
      ),
      enablePartials: true,
      enableLayouts: true,
      enableHelpers: true,
      watchFiles: !this.configService.get<boolean>('app.inProduction', false),
      strictMode: this.configService.get<boolean>(
        'EMAIL_TEMPLATE_STRICT',
        true,
      ),
    };
  }

  async onModuleInit() {
    this.registerHelpers();
    await this.loadPartials();
    await this.loadLayouts();
    await this.loadTemplates();

    if (this.options.watchFiles) {
      this.setupFileWatcher();
    }

    this.logger.log(
      `Template engine initialized with ${this.templates.size} templates`,
    );
  }

  async onModuleDestroy() {
    // Clean up debounce timeout
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = undefined;
    }

    // Close file watcher to prevent memory leak
    if (this.fileWatcher) {
      await this.fileWatcher.close();
      this.fileWatcher = undefined;
      this.logger.log('Template file watcher closed');
    }
  }

  /**
   * Get template metadata
   */
  async getTemplateMetadata(name: string): Promise<TemplateMetadata | null> {
    const template = this.templates.get(name);
    if (!template) return null;

    const templatePath = path.join(
      this.templateDir,
      this.getTemplatePath(name),
    );
    const stats = await fs.stat(templatePath);

    return {
      name,
      path: templatePath,
      config: template.config,
      lastModified: stats.mtime,
      size: stats.size,
    };
  }

  /**
   * List all available templates
   */
  getAvailableTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: string): TemplateMetadata[] {
    return Array.from(this.templates.entries())
      .filter(([, template]) => template.config.category === category)
      .map(([name]) => ({ name }) as TemplateMetadata);
  }

  /**
   * Render a template with data
   */
  async renderTemplate(
    templateName: string,
    data: Record<string, any>,
  ): Promise<RenderedTemplateContent> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    try {
      // Merge with default data and add helper data
      const enrichedData = this.enrichTemplateData(data, template.config);

      // Validate required variables if in strict mode
      if (this.options.strictMode) {
        const validation = this.validateTemplateData(
          templateName,
          enrichedData,
        );
        if (!validation.isValid) {
          throw new Error(
            `Template validation failed: ${validation.errors.join(', ')}`,
          );
        }
      }

      // Render templates
      const html = template.htmlTemplate(enrichedData);
      const text = template.textTemplate
        ? template.textTemplate(enrichedData)
        : undefined;
      const subject = template.subjectTemplate(enrichedData);

      return { html, text, subject };
    } catch (error) {
      this.logger.error(`Failed to render template '${templateName}':`, error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  /**
   * Validate template data
   */
  validateTemplateData(
    templateName: string,
    data: Record<string, any>,
  ): TemplateValidationResult {
    const template = this.templates.get(templateName);
    if (!template) {
      return {
        isValid: false,
        errors: [`Template '${templateName}' not found`],
        warnings: [],
        missingRequiredVars: [],
        unusedVars: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    const missingRequiredVars: string[] = [];
    const unusedVars: string[] = [];

    // Check required variables
    for (const required of template.config.requiredVariables) {
      if (
        !(required in data) ||
        data[required] === undefined ||
        data[required] === null
      ) {
        missingRequiredVars.push(required);
        errors.push(`Missing required variable: ${required}`);
      }
    }

    // Check for unused variables (warnings only)
    const allRequiredAndOptional = [
      ...template.config.requiredVariables,
      ...(template.config.optionalVariables || []),
    ];

    for (const key of Object.keys(data)) {
      if (!allRequiredAndOptional.includes(key)) {
        unusedVars.push(key);
        warnings.push(`Unused variable: ${key}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      missingRequiredVars,
      unusedVars,
    };
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    templateName: string,
  ): Promise<RenderedTemplateContent> {
    const template = this.templates.get(templateName);
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }

    // Use preview data from config or generate sample data
    const previewData =
      template.config.previewData || this.generateSampleData(template.config);

    return this.renderTemplate(templateName, previewData);
  }

  /**
   * Reload a specific template
   */
  async reloadTemplate(templateName: string): Promise<void> {
    this.logger.log(`Reloading template: ${templateName}`);

    try {
      const templatePath = this.getTemplatePath(templateName);
      const compiledTemplate = await this.loadSingleTemplate(
        templatePath,
        templateName,
      );

      if (compiledTemplate) {
        this.templates.set(templateName, compiledTemplate);
        this.logger.log(`Template '${templateName}' reloaded successfully`);
      }
    } catch (error) {
      this.logger.error(`Failed to reload template '${templateName}':`, error);
    }
  }

  /**
   * Reload all templates
   */
  async reloadAllTemplates(): Promise<void> {
    this.logger.log('Reloading all templates...');
    this.templates.clear();
    await this.loadTemplates();
  }
  private registerHelpers() {
    // Current year helper
    Handlebars.registerHelper('currentYear', () => new Date().getFullYear());

    // Date formatting helper
    Handlebars.registerHelper(
      'formatDate',
      (date: Date | string, format: string = 'YYYY-MM-DD') => {
        const d = new Date(date);
        if (format === 'YYYY-MM-DD') return d.toISOString().split('T')[0];
        if (format === 'MM/DD/YYYY') return d.toLocaleDateString('en-US');
        return d.toLocaleDateString();
      },
    );

    // String helpers
    Handlebars.registerHelper(
      'uppercase',
      (str: string) => str?.toUpperCase() || '',
    );
    Handlebars.registerHelper(
      'lowercase',
      (str: string) => str?.toLowerCase() || '',
    );
    Handlebars.registerHelper('capitalize', (str: string) =>
      str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '',
    );

    // URL helpers
    Handlebars.registerHelper(
      'addUtmParams',
      (url: string, source: string, campaign: string) => {
        if (!url) return '';
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}utm_source=${source}&utm_campaign=${campaign}`;
      },
    );

    // Math helpers
    Handlebars.registerHelper('add', (a: number, b: number) => a + b);
    Handlebars.registerHelper('subtract', (a: number, b: number) => a - b);

    // Comparison helpers
    Handlebars.registerHelper('eq', (a: any, b: any) => a === b);
    Handlebars.registerHelper('ne', (a: any, b: any) => a !== b);
    Handlebars.registerHelper('gt', (a: number, b: number) => a > b);
    Handlebars.registerHelper('lt', (a: number, b: number) => a < b);

    this.logger.debug('Handlebars helpers registered');
  }

  private async loadPartials() {
    if (!this.options.enablePartials) return;

    try {
      const partialsDir = path.join(this.templateDir, 'partials');
      const files = await fs.readdir(partialsDir, { recursive: true });

      for (const file of files) {
        if (file.toString().endsWith('.hbs')) {
          const partialPath = path.join(partialsDir, file.toString());
          const content = await fs.readFile(partialPath, 'utf-8');
          const name = file.toString().replace('.hbs', '');

          Handlebars.registerPartial(name, content);
          this.partials.set(name, content);
        }
      }

      this.logger.debug(`Loaded ${this.partials.size} partials`);
    } catch (error) {
      this.logger.warn('Failed to load partials:', error.message);
    }
  }

  private async loadLayouts() {
    if (!this.options.enableLayouts) return;

    try {
      const layoutsDir = path.join(this.templateDir, 'layouts');
      const files = await fs.readdir(layoutsDir, { recursive: true });

      for (const file of files) {
        if (file.toString().endsWith('.hbs')) {
          const layoutPath = path.join(layoutsDir, file.toString());
          const content = await fs.readFile(layoutPath, 'utf-8');
          const name = `layouts/${file.toString().replace('.hbs', '')}`;

          Handlebars.registerPartial(name, content);
          this.layouts.set(name, content);
        }
      }

      this.logger.debug(`Loaded ${this.layouts.size} layouts`);
    } catch (error) {
      this.logger.warn('Failed to load layouts:', error.message);
    }
  }

  private async loadTemplates() {
    try {
      const categories = [
        'auth',
        'onboarding',
        'notifications',
        'hr',
        'system',
      ];

      for (const category of categories) {
        const categoryDir = path.join(this.templateDir, category);

        try {
          const templates = await fs.readdir(categoryDir);

          for (const templateName of templates) {
            const templatePath = path.join(category, templateName);
            await this.loadSingleTemplate(templatePath, templateName);
          }
        } catch (error) {
          // Category directory might not exist
          this.logger.debug(`Category '${category}' not found, skipping`);
        }
      }

      this.logger.log(`Loaded ${this.templates.size} email templates`);
    } catch (error) {
      this.logger.error('Failed to load templates:', error);
    }
  }

  private async loadSingleTemplate(
    templatePath: string,
    templateName: string,
  ): Promise<CompiledTemplate | null> {
    try {
      const fullPath = path.join(this.templateDir, templatePath);

      // Load template configuration
      const configPath = path.join(fullPath, 'template.json');
      const configContent = await fs.readFile(configPath, 'utf-8');
      const config: TemplateConfig = JSON.parse(configContent);

      // Load HTML template
      const htmlPath = path.join(fullPath, 'content.hbs');
      const htmlContent = await fs.readFile(htmlPath, 'utf-8');
      const htmlTemplate = Handlebars.compile(htmlContent);

      // Load text template (optional)
      let textTemplate: Handlebars.TemplateDelegate | undefined;
      try {
        const textPath = path.join(fullPath, 'content.txt');
        const textContent = await fs.readFile(textPath, 'utf-8');
        textTemplate = Handlebars.compile(textContent);
      } catch {
        // Text template is optional
      }

      // Compile subject template
      const subjectTemplate = Handlebars.compile(config.subject);

      const compiledTemplate: CompiledTemplate = {
        config,
        htmlTemplate,
        textTemplate,
        subjectTemplate,
      };

      this.templates.set(templateName, compiledTemplate);
      return compiledTemplate;
    } catch (error) {
      this.logger.error(`Failed to load template '${templateName}':`, error);
      return null;
    }
  }

  private getTemplatePath(templateName: string): string {
    // Simple mapping - could be made more sophisticated
    const categoryMappings: Record<string, string> = {
      'patient': 'onboarding/patient-welcome',
      'professional-welcome': 'onboarding/professional-welcome',
      'password-reset': 'auth/password-reset',
      'email-verification': 'auth/email-verification',
      'employee-invitation': 'onboarding/employee-invitation',
      'leave-request-approval': 'hr/leave-request-approval',
      'performance-review-reminder': 'hr/performance-review-reminder',
      'system-notification': 'notifications/system-notification',
    };

    return categoryMappings[templateName] || `notifications/${templateName}`;
  }

  private enrichTemplateData(
    data: Record<string, any>,
    config: TemplateConfig,
  ): Record<string, any> {
    const enriched = {
      ...config.defaultData,
      ...data,
      currentYear: new Date().getFullYear(),
    };

    // Add base template data if not provided
    const baseData: BaseTemplateData = {
      currentYear: enriched.currentYear,
      companyName: (enriched as any).companyName || 'MedipointHq',
      supportUrl: (enriched as any).supportUrl || 'https://help.medipointhq.com',
    };

    return { ...baseData, ...enriched };
  }

  private generateSampleData(config: TemplateConfig): Record<string, any> {
    const sampleData: Record<string, any> = {
      currentYear: new Date().getFullYear(),
      companyName: 'Acme Corp',
      supportEmail: 'support@acme.com',
    };

    // Generate sample data based on required variables
    for (const variable of config.requiredVariables) {
      if (!sampleData[variable]) {
        sampleData[variable] = this.generateSampleValue(variable);
      }
    }

    return sampleData;
  }

  private generateSampleValue(variableName: string): any {
    const sampleMappings: Record<string, any> = {
      name: 'John Doe',
      adminName: 'Jane Admin',
      employeeName: 'John Employee',
      managerName: 'Jane Manager',
      organizationName: 'Acme Corporation',
      email: 'user@example.com',
      loginUrl: 'https://app.hoomanshr.com/login',
      resetUrl: 'https://app.hoomanshr.com/reset-password?token=abc123',
      verificationUrl: 'https://app.hoomanshr.com/verify?token=xyz789',
      expiryHours: 24,
      expiryDays: 7,
    };

    return sampleMappings[variableName] || `[${variableName}]`;
  }

  private setupFileWatcher() {
    this.fileWatcher = watch(this.templateDir, {
      persistent: true,
      ignoreInitial: true,
    });

    this.fileWatcher
      .on('change', (filePath) => {
        this.logger.debug(`Template file changed: ${filePath}`);
        this.handleFileChange(filePath);
      })
      .on('add', (filePath) => {
        this.logger.debug(`Template file added: ${filePath}`);
        this.handleFileChange(filePath);
      })
      .on('unlink', (filePath) => {
        this.logger.debug(`Template file removed: ${filePath}`);
        this.handleFileRemoval(filePath);
      });

    this.logger.log('Template file watcher enabled for development');
  }

  private handleFileChange(filePath: string) {
    // Clear existing timeout to debounce rapid file changes
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }

    this.debounceTimeout = setTimeout(async () => {
      if (filePath.includes('/partials/')) {
        await this.loadPartials();
      } else if (filePath.includes('/layouts/')) {
        await this.loadLayouts();
      } else {
        // Determine which template changed and reload it
        const templateName = this.extractTemplateNameFromPath(filePath);
        if (templateName) {
          await this.reloadTemplate(templateName);
        }
      }
    }, 300);
  }

  private handleFileRemoval(filePath: string) {
    const templateName = this.extractTemplateNameFromPath(filePath);
    if (templateName && this.templates.has(templateName)) {
      this.templates.delete(templateName);
      this.logger.log(`Template '${templateName}' removed from cache`);
    }
  }

  private extractTemplateNameFromPath(filePath: string): string | null {
    // Extract template name from file path
    const relativePath = path.relative(this.templateDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length >= 2) {
      return parts[1]; // category/template-name/file.ext
    }

    return null;
  }
}
