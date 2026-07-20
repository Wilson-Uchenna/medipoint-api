import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailModule } from './email/email.module';
import jwtConfig from 'src/config/jwt.config';

const ENV = process.env.NODE_ENV;

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [!ENV ? '.env' : `.env.${ENV}`],
      cache: true,
      expandVariables: true,
      load: [jwtConfig],
    }),
    EmailModule,
  ],
  exports: [ConfigModule],
})
export class CoreModule {}
