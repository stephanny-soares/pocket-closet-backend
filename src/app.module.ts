import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { LoggerService } from './common/logger/logger.service';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }), // permite usar process.env en todo el proyecto
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || `3306`, 10),
      username: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      autoLoadEntities: true,
      synchronize: true, // crea las tablas automáticamente según entidades (solo para desarrollo, no usar en producción).
    }),
    UsersModule,
    AuthModule, // 👈 ESTE IMPORT ES CLAVE
  ],
  controllers: [AppController],
  providers: [LoggerService], // 👈 Inyectamos LoggerService aquí para usarlo en los middlewares y filtros
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Middleware aplicado a todas las rutas
  }
}
