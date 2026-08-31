import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiQuery } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dtos/register.dto';
import { LoginDto } from './dtos/login.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new user account with the provided credentials and profile details. ' +
      'Sends a verification email to confirm the address before the account can be fully activated. ' +
      'Passwords are hashed before storage and never returned in any response.',
  })
  @ApiBody({
    type: RegisterDto,
    examples: {
      example1: {
        summary: 'Create User',
        value: {
          name: 'John Doe',
          email: 'user@example.com',
          password: 'password123',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. A verification email has been sent.',
    schema: {
      example: {
        id: 'uuid',
        email: 'user@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'PATIENT',
        emailVerified: false,
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation failed (e.g. missing fields, weak password, invalid email format).',
  })
  @ApiResponse({ status: 409, description: 'A user with this email already exists.' })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'User login',
    description:
      'Authenticates a user with email and password. On success, returns a short-lived access token ' +
      'and a long-lived refresh token, along with minimal user info. Use the access token as a Bearer ' +
      'token on subsequent authenticated requests, and the refresh token with POST /auth/refresh to ' +
      'obtain a new access token once it expires.',
  })
  @ApiBody({
    type: LoginDto,
    examples: {
      example1: {
        summary: 'Login',
        value: { email: 'user@example.com', password: 'password123' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful.',
    schema: {
      example: {
        accessToken: 'eyJhbG...',
        refreshToken: 'eyJhbG...',
        user: { id: 'uuid', name: 'John Doe', email: 'user@example.com' },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Invalid email or password.' })
  @ApiResponse({ status: 403, description: 'Email not verified — verify your email before logging in.' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('verify-email')
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Confirms a user\'s email address using the single-use token sent to them during registration ' +
      'or via /auth/resend-verification. This is typically called from a link in the verification email.',
  })
  @ApiQuery({
    name: 'token',
    description: 'The verification token issued in the verification email.',
    example: 'a1b2c3d4-e5f6-...',
  })
  @ApiResponse({ status: 200, description: 'Email verified successfully.' })
  @ApiResponse({ status: 400, description: 'Token is invalid or has expired.' })
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Issues a new verification token and re-sends the verification email for an unverified account.',
  })
  @ApiBody({
    schema: { example: { email: 'user@example.com' } },
  })
  @ApiResponse({ status: 200, description: 'Verification email resent, if the account exists and is unverified.' })
  @ApiResponse({ status: 404, description: 'No account found for this email.' })
  async resendVerification(@Body('email') email: string) {
    return this.authService.resendVerification(email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset link to the provided email if an account exists. ' +
      'Always returns 200 regardless of whether the email is registered, to avoid leaking account existence.',
  })
  @ApiBody({
    schema: { example: { email: 'user@example.com' } },
  })
  @ApiResponse({ status: 200, description: 'If an account exists for this email, a reset link has been sent.' })
  async forgotPassword(@Body('email') email: string) {
    return this.authService.forgotPassword(email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reset password with token',
    description: 'Sets a new password using the single-use token issued by /auth/forgot-password.',
  })
  @ApiBody({
    schema: {
      example: { token: 'a1b2c3d4-e5f6-...', newPassword: 'newSecurePassword123' },
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset successfully.' })
  @ApiResponse({ status: 400, description: 'Token is invalid or has expired.' })
  async resetPassword(
    @Body('token') token: string,
    @Body('newPassword') newPassword: string,
  ) {
    return this.authService.resetPassword(token, newPassword);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Refresh access token',
    description:
      'Exchanges a valid refresh token for a new access token (and typically a rotated refresh token). ' +
      'Call this when the access token has expired instead of requiring the user to log in again.',
  })
  @ApiBody({
    schema: { example: { refreshToken: 'eyJhbG...' } },
  })
  @ApiResponse({
    status: 200,
    description: 'New tokens issued.',
    schema: {
      example: { accessToken: 'eyJhbG...', refreshToken: 'eyJhbG...' },
    },
  })
  @ApiResponse({ status: 401, description: 'Refresh token is invalid, expired, or has been revoked.' })
  async refreshToken(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshToken(refreshToken);
  }
}