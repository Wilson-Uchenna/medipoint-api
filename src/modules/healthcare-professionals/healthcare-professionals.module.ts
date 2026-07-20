import { Module } from '@nestjs/common';
import { HealthcareProfessionalsService } from './healthcare-professionals.service';
import { HealthcareProfessionalsController } from './healthcare-professionals.controller';

@Module({
  providers: [HealthcareProfessionalsService],
  controllers: [HealthcareProfessionalsController]
})
export class HealthcareProfessionalsModule {}
