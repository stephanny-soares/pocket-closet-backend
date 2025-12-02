import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggerService } from './common/logger/logger.service';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = app.get(LoggerService);

  // Habilitar CORS
  app.enableCors({
    origin: '*', //['http://localhost:8081', 'http://localhost:3000', 'http://localhost:5000'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // SWAGGER SETUP (NUEVO)
  const config = new DocumentBuilder()
    .setTitle('PocketCloset API')
    .setDescription(
      'API de gestión inteligente de guardarropa con clasificación por IA',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('auth', 'Autenticación de usuarios')
    .addTag('users', 'Gestión de usuarios')
    .addTag('prendas', 'Gestión de prendas (requiere autenticación)')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // Registrar el filtro global
  app.useGlobalFilters(new HttpExceptionFilter(logger));
  //app.useGlobalGuards(new JwtAuthGuard());

  await app.listen(process.env.PORT || 5000, '0.0.0.0');
  console.log(`Server running on port ${process.env.PORT || 5000}`); // Solo desarrollo `0.0.0.0`
  console.log(`Swagger docs: http://localhost:5000/api/docs`);
}
bootstrap();
