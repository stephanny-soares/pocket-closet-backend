import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // <--- importar UsersModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { LoggerModule } from 'src/common/logger/logger.module';
import { AuditoriaUsuariosModule } from '../auditoria-usuarios/auditoria-usuarios.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule, // <--- importante para inyectar repositorio.
    LoggerModule,
    AuditoriaUsuariosModule,

   
    // Módulo JWT centralizado
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey', // usa variable de entorno en producción
      signOptions: { expiresIn: '1h' }, // tiempo de expiración del token
    }),

  ],

  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
