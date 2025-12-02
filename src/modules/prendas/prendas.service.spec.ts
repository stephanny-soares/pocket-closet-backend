import { Test, TestingModule } from '@nestjs/testing';
import { PrendasService } from './prendas.service';

describe('PrendasService', () => {
  let service: PrendasService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrendasService],
    }).compile();

    service = module.get<PrendasService>(PrendasService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
