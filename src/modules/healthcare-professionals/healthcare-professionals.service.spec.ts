import { Test, TestingModule } from '@nestjs/testing';
import { HealthcareProfessionalsService } from './healthcare-professionals.service';

describe('HealthcareProfessionalsService', () => {
  let service: HealthcareProfessionalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [HealthcareProfessionalsService],
    }).compile();

    service = module.get<HealthcareProfessionalsService>(HealthcareProfessionalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
