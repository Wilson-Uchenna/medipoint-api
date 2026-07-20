import { Test, TestingModule } from '@nestjs/testing';
import { ConsultationNotesController } from './consultation-notes.controller';

describe('ConsultationNotesController', () => {
  let controller: ConsultationNotesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsultationNotesController],
    }).compile();

    controller = module.get<ConsultationNotesController>(ConsultationNotesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
