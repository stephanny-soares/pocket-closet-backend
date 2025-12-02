import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outfit } from '../../entities/outfit.entity';
import { Prenda } from '../../entities/prenda.entity';
import { OutfitsService } from './outfits.service';
import { OutfitsController } from './outfits.controller';
import { Evento } from '../../entities/evento.entity';



@Module({
  imports: [TypeOrmModule.forFeature([Outfit, Prenda, Evento])],
  providers: [OutfitsService],
  controllers: [OutfitsController],
  exports: [OutfitsService],
})
export class OutfitsModule {}
