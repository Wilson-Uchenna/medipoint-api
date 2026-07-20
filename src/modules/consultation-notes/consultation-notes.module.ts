import { Module } from '@nestjs/common';
import { ConsultationNotesService } from './consultation-notes.service';
import { ConsultationNotesController } from './consultation-notes.controller';

@Module({
  providers: [ConsultationNotesService],
  controllers: [ConsultationNotesController]
})
export class ConsultationNotesModule {}
