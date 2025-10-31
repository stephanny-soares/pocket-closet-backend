import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrendasController } from './prendas.controller';
import { PrendasService } from './prendas.service';
import { Prenda } from '../../entities/prenda.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Prenda])],
  controllers: [PrendasController],
  providers: [PrendasService],
  exports: [PrendasService],
})
export class PrendasModule {}
