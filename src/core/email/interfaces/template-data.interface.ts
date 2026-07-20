/**
 * Base template data that all templates can use
 */
export interface BaseTemplateData {
  companyName?: string;
  supportEmail?: string;
  supportUrl?: string;
  currentYear: number;
  unsubscribeUrl?: string;
  customFooter?: string;
}


/**
 * Password reset template data
 */
export interface PasswordResetTemplateData extends BaseTemplateData {
  name: string;
  resetUrl: string;
  expiryHours: number;
}

/**
 * Email verification template data
 */
export interface EmailVerificationTemplateData extends BaseTemplateData {
  name: string;
  verificationUrl: string;
  expiryHours: number;
}

/**
 * System notification template data
 */
export interface SystemNotificationTemplateData extends BaseTemplateData {
  recipientName: string;
  notificationType: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
}

/**
 * Patient welcome email template data
 */
export interface PatientWelcomeTemplateData extends BaseTemplateData {
  patientName: string;
  organizationName: string;
  loginUrl: string;
  primaryCareProvider?: string;
  appointmentDate?: string; // ISO string format or formatted date
  appointmentTime?: string;
}

/**
 * Healthcare professional welcome email template data
 */
export interface ProfessionalWelcomeTemplateData extends BaseTemplateData {
  providerName: string;
  organizationName: string;
  loginUrl: string;
  departmentName?: string;
  facilityLocation?: string;
  npiNumber?: string;
  activationDeadline?: string; // ISO string format or formatted date
}


export type TemplateData = 
  | PasswordResetTemplateData
  | EmailVerificationTemplateData
  | SystemNotificationTemplateData
  | ProfessionalWelcomeTemplateData
  | PatientWelcomeTemplateData;

/**
 * Template data type mapping for type-safe template usage
 */
export interface TemplateDataMap {
  'password-reset': PasswordResetTemplateData;
  'email-verification': EmailVerificationTemplateData;
  'system-notification': SystemNotificationTemplateData;
  'patient-welcome': PatientWelcomeTemplateData;
  'professional-welcome': ProfessionalWelcomeTemplateData;

}

/**
 * Template configuration interface
 */
export interface TemplateConfig {
  name: string;
  description: string;
  category: 'auth' | 'onboarding' | 'notifications' | 'system';
  tags: string[];
  version: string;
  subject: string;
  requiredVariables: string[];
  optionalVariables?: string[];
  defaultData?: Record<string, any>;
  previewData?: Record<string, any>;
}


/**
 * Template validation result
 */
export interface TemplateValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequiredVars: string[];
  unusedVars: string[];
}

/**
 * Rendered template content
 */
export interface RenderedTemplateContent {
  html: string;
  text?: string;
  subject: string;
}

/**
 * Template metadata for listing and management
 */
export interface TemplateMetadata {
  name: string;
  path: string;
  config: TemplateConfig;
  lastModified: Date;
  size: number;
}

/**
 * Template engine options
 */
export interface TemplateEngineOptions {
  enableCache?: boolean;
  enablePartials?: boolean;
  enableLayouts?: boolean;
  enableHelpers?: boolean;
  watchFiles?: boolean;
  strictMode?: boolean;
}