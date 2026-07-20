import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { PatientModule } from './modules/patient/patient.module';

import { HealthcareProfessionalsModule } from './modules/healthcare-professionals/healthcare-professionals.module';
import { ConsultationsModule } from './modules/consultations/consultations.module';
import { ConsultationNotesModule } from './modules/consultation-notes/consultation-notes.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule, UsersModule, PatientModule, HealthcareProfessionalsModule, ConsultationsModule, ConsultationNotesModule, PaymentsModule, NotificationsModule, AdminModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
