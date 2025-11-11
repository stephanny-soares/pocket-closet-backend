import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * Entidad para almacenar logs de auditoría de usuarios
 * según el estándar PocketCloset_Logging_Spec_v1.md
 */
@Entity({ name: 'auditoria_usuarios' })
export class AuditoriaUsuario {
  @PrimaryGeneratedColumn('uuid')
  id: string; // Identificador único del registro de auditoría

  @Column({ type: 'uuid', nullable: true })
  userId: string | null; // ID del usuario afectado, puede ser null si no aplica

  @Column({ type: 'varchar', length: 50 })
  level: string; // Nivel de log: info, warn, error, debug

  @Column({ type: 'varchar', length: 100 })
  event: string; // Nombre técnico del evento: UserCreated, LoginFailed, etc.

  @Column({ type: 'varchar', length: 100, nullable: true })
  requestId: string | null; // ID único de la solicitud HTTP

  @Column({ type: 'varchar', length: 100, nullable: true })
  correlationId: string | null; // ID global para trazabilidad entre servicios

   @Column({ type: 'varchar', length: 45, nullable: true }) 
  ip: string | null; // PC-76: Registrar IP del cliente

  @Column({ type: 'text' })
  message: string; // Descripción resumida del evento

  @CreateDateColumn({ type: 'timestamp' })
  timestamp: Date; // Fecha y hora del evento (se genera automáticamente)
}
