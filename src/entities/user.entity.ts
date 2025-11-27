import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToMany,
} from 'typeorm';
import { Prenda } from './prenda.entity';
import { Outfit } from './outfit.entity';
import { Evento } from './evento.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column({ default: true, name: 'is_active' })
  is_active: boolean; // PC-74: Verificar que la cuenta esté activa

  // true para desarrollo
  @Column({ default: true, name: 'email_confirmed' })
  email_confirmed: boolean; // PC-77: Verificar que el email esté confirmado

  @Column({ nullable: true })
  ciudad?: string; // Ej: "Villena", "Alicante"

  @Column({ type: 'timestamp', nullable: true, name: 'confirmed_at' })
  confirmed_at: Date | null; // Fecha cuando se confirmó el email

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @OneToMany(() => Prenda, (prenda) => prenda.usuario, { cascade: true })
  prendas: Prenda[];

  @OneToMany(() => Outfit, (outfit) => outfit.usuario)
  outfits: Outfit[];

  @OneToMany(() => Evento, (evento) => evento.usuario, { cascade: true })
  eventos: Evento[];
}
