import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { LoggerModule } from 'src/common/logger/logger.module';
import { AuditoriaUsuariosModule } from '../auditoria-usuarios/auditoria-usuarios.module';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy'; 
import { RedisModule } from 'src/common/redis/redis.module'; // ← AGREGAR

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule,
    LoggerModule,
    AuditoriaUsuariosModule,
    RedisModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'secretkey',
      signOptions: { expiresIn: '1h' },
    }),
  ],
  providers: [AuthService, JwtStrategy],
  controllers: [AuthController],
  exports: [JwtModule, PassportModule, JwtStrategy],
})
export class AuthModule {}
