import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from '../../entities/user.entity';
import { UserPreferences } from '../../entities/user-preferences.entity';
import { StorageService } from '../../common/services/storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserPreferences])],
  controllers: [UsersController],
  providers: [UsersService, StorageService],
  exports: [UsersService, TypeOrmModule], // <--- Esto es clave
})
export class UsersModule {}
