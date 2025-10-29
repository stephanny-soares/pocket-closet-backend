import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditoriaUsuariosService } from './auditoria-usuarios.service';
import { AuditoriaUsuario } from '../../entities/auditoria-usuario.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AuditoriaUsuario])],
  providers: [AuditoriaUsuariosService],
  exports: [AuditoriaUsuariosService], // exportamos para poder inyectarlo en AuthService y otros servicios
})
export class AuditoriaUsuariosModule {}
