import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Viaje } from '../../entities/viaje.entity';
import { MaletaOutfit } from '../../entities/maleta-outfits.entity';
import { Prenda } from '../../entities/prenda.entity';
import { ViajesController } from './viajes.controller';
import { ViajesService } from './viajes.service';

@Module({
  imports: [TypeOrmModule.forFeature([Viaje, MaletaOutfit, Prenda])],
  controllers: [ViajesController],
  providers: [ViajesService],
  exports: [ViajesService],
})
export class ViajesModule {}