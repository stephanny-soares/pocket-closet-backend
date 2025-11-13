import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { UsersModule } from './modules/users/users.module';
import { AuthModule } from './modules/auth/auth.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { LoggerModule } from './common/logger/logger.module';  // usae el módulo en lugar del provider directo
import { PrendasModule } from './modules/prendas/prendas.module';
import { User } from './entities/user.entity';
import { Prenda } from './entities/prenda.entity';
import { RedisModule } from './common/redis/redis.module';
import { AuditoriaUsuario } from './entities/auditoria-usuario.entity';
import { OutfitsModule } from './modules/outfits/outfits.module';



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
      entities: [User, Prenda, AuditoriaUsuario],
      autoLoadEntities: true,
      synchronize: true, // crea las tablas automáticamente según entidades (solo para desarrollo, no usar en producción).
    }),
    LoggerModule, // ✅ se importa el módulo global
    RedisModule,
    UsersModule,
    AuthModule,
    PrendasModule, // 👈 ESTE IMPORT ES CLAVE
    OutfitsModule,
  ],
  controllers: [AppController],
  //providers: [LoggerService], // 👈 Inyectamos LoggerService aquí para usarlo en los middlewares y filtros
})
export class AppModule implements NestModule {
   configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes('*'); // Middleware aplicado a todas las rutas
  }
}
