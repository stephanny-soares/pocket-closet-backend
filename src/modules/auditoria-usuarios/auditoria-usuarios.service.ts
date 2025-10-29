import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditoriaUsuario } from '../../entities/auditoria-usuario.entity';

@Injectable()
export class AuditoriaUsuariosService {
  constructor(
    @InjectRepository(AuditoriaUsuario)
    private readonly auditoriaRepo: Repository<AuditoriaUsuario>,
  ) {}

  /**
   * Registra un evento crítico en la tabla auditoria_usuarios
   * @param event Nombre técnico del evento (UserRegistered, LoginFailed, etc.)
   * @param userId ID del usuario afectado (nullable si no aplica)
   * @param level Nivel de severidad: info, warn, error
   * @param message Descripción legible del evento
   * @param requestId ID único de la solicitud HTTP (opcional)
   * @param correlationId ID global para trazabilidad (opcional)
   */
  async registrarEvento(
    event: string,
    userId: string | null,
    level: 'info' | 'warn' | 'error',
    message: string,
    requestId?: string,
    correlationId?: string,
  ) {
    // Debemos usar los nombres de propiedad EXACTOS de la entidad
    const registro = this.auditoriaRepo.create({
      event,         // nombre correcto
      userId,
      level,
      message,
      requestId,
      correlationId,
    });

    return this.auditoriaRepo.save(registro);
  }
}
