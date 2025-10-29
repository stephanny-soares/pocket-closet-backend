import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerService } from './common/logger/logger.service'; 

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggerService);

  // Registrar el filtro global
  app.useGlobalFilters(new HttpExceptionFilter(logger));

  await app.listen(process.env.PORT || 5000);
  console.log(`Server running on port ${process.env.PORT || 5000}`);
}
bootstrap();
