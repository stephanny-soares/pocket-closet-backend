import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Outfit } from '../../entities/outfit.entity';
import { Prenda } from '../../entities/prenda.entity';
import { OutfitsService } from './outfits.service';
import { OutfitsController } from './outfits.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Outfit, Prenda])],
  providers: [OutfitsService],
  controllers: [OutfitsController],
})
export class OutfitsModule {}