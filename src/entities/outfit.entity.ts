import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { Prenda } from './prenda.entity';
import { Evento } from './evento.entity';

@Entity('outfits')
export class Outfit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string; // Ej: "Outfit casual viernes"

  @Column({ type: 'longtext', nullable: true })
  imagen?: string; // URL o base64 - Foto del outfit (opcional)

  @Column({ nullable: true })
  categoria?: string; // casual, formal, deporte, etc.

  @Column({ nullable: true })
  estacion?: string; // verano, invierno, primavera, otoño

  @ManyToMany(() => Prenda, { eager: true })
  @JoinTable({
    name: 'outfit_prendas',
    joinColumn: { name: 'outfit_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'prenda_id', referencedColumnName: 'id' },
  })
  prendas: Prenda[];

  @ManyToOne(() => User, (user) => user.outfits, { onDelete: 'CASCADE' })
  usuario: User;

  @ManyToOne(() => Evento, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'evento_id' })
  evento?: Evento;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
