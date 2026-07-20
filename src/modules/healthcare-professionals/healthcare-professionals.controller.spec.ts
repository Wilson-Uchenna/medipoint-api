import { Test, TestingModule } from '@nestjs/testing';
import { HealthcareProfessionalsController } from './healthcare-professionals.controller';

describe('HealthcareProfessionalsController', () => {
  let controller: HealthcareProfessionalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthcareProfessionalsController],
    }).compile();

    controller = module.get<HealthcareProfessionalsController>(HealthcareProfessionalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
