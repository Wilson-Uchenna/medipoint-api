import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationNotesService } from './consultation-notes.service';

describe('ConsultationNotesService', () => {
  let service: ConsultationNotesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ConsultationNotesService],
    }).compile();

    service = module.get<ConsultationNotesService>(ConsultationNotesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
