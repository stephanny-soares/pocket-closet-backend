import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module'; // <--- importar UsersModule
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { LoggerModule } from 'src/common/logger/logger.module';


@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    UsersModule, // <--- importante para inyectar repositorio.
    LoggerModule
  ],

  providers: [AuthService],
  controllers: [AuthController]
})
export class AuthModule {}
