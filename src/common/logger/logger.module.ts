import { Global, Module } from '@nestjs/common';
import { LoggerService } from './logger.service';

@Global() // Se hace global para no tener que importarlo en todos los módulos
@Module({
  providers: [LoggerService],
  exports: [LoggerService],
})
export class LoggerModule {}
