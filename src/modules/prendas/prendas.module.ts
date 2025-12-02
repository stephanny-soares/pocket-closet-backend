import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrendasController } from './prendas.controller';
import { PrendasService } from './prendas.service';
import { Prenda } from '../../entities/prenda.entity';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Prenda])],
  controllers: [PrendasController],
  providers: [PrendasService, StorageService],
  exports: [PrendasService],
})
export class PrendasModule {}
