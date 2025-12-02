import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Evento } from '../../entities/evento.entity';
import { EventosService } from './eventos.service';
import { EventosController } from './eventos.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Evento])],
  providers: [EventosService],
  controllers: [EventosController],
  exports: [EventosService],
})
export class EventosModule {}
