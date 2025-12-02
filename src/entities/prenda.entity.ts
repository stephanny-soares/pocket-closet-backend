import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('prendas')
export class Prenda {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  nombre: string; // Generado por IA (ej: "Camiseta azul marino")

  @Column()
  tipo: string; // Generado por IA (ej: "camiseta", "pantalón", "zapato")

  @Column()
  color: string; // Generado por IA

  @Column({ nullable: true })
  marca?: string;

  @Column({ type: 'longtext' })
  imagen: string; // URL o base64

  @Column({ nullable: true })
  ocasion?: string; // casual, formal, deporte

  @Column({ nullable: true })
  estacion?: string; // verano, invierno, primavera, otoño

  @Column({ nullable: true })
  seccion?: string; // superior, inferior, calzado, accesorios, vestido

  @Column({ type: 'json', nullable: true })
  metadatos?: object; // Confianza de IA, características

  @ManyToOne(() => User, (user) => user.prendas, { onDelete: 'CASCADE' })
  usuario: User;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
