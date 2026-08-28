import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import jwtConfig from 'src/config/jwt.config';
import { EmailModule } from 'src/core/email/email.module';
import { EmailService } from 'src/core/email/email.service';
import { ResendProvider } from 'src/core/email/providers/resend.provider';
import { DebugProvider } from 'src/core/email/providers/debug-provider';
import { TemplateService } from 'src/core/email/templates/template.service';
import { TemplateEngineService } from 'src/core/email/templates/template-engine/template-engine.service';


@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, EmailService, ResendProvider, DebugProvider, TemplateService, TemplateEngineService],
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt'}),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
          issuer: configService.get('jwt.issuer'),
          audience: configService.get('jwt.audience'),
        },
      }),
    }),
   
  ]
})
export class AuthModule {

}
