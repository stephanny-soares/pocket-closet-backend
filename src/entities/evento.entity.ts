import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from 'typeorm';
import { User } from './user.entity';

@Entity('eventos')
export class Evento {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string; // Ej: "Boda de María", "Cumpleaños"

  @Column()
  fecha: string; // Formato: YYYY-MM-DD

  @Column({ nullable: true })
  descripcion?: string; // Descripción opcional del evento

  @ManyToOne(() => User, (user) => user.eventos, { onDelete: 'CASCADE' })
  usuario: User;

  @Column({ nullable: true })
  tipo?: string; // "boda", "cumpleaños", "trabajo", "casual", etc.

  @Column({ nullable: true })
  ubicacion?: string; // "salón", "jardín", "playa", "restaurante", etc.

  @Column({ nullable: true })
  ciudad?: string; // Para obtener clima local

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
