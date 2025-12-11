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
import { Viaje } from './viaje.entity';
import { Prenda } from './prenda.entity'

@Entity('maleta-outfits')
export class MaletaOutfit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @Column({ type: 'varchar', length: 100, default: 'casual' })
  categoria: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tipo: string; // outfit_completo, prendas_sueltas

  @Column({ type: 'longtext', nullable: true })
  imagen: string;

  @Column({ type: 'boolean', default: false })
  empacado: boolean;

  @Column({ type: 'int', default: 1 })
  cantidad: number;

  @Column({ type: 'text', nullable: true })
  notas: string;

  @ManyToOne(() => Viaje, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'viaje_id' })
  viaje: Viaje;

  @ManyToMany(() => Prenda)
  @JoinTable({
    name: 'maleta_prenda',
    joinColumn: { name: 'maleta_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'prenda_id', referencedColumnName: 'id' },
  })
  prendas: Prenda[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}