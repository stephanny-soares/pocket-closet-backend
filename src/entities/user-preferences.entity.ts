import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('user_preferences')
export class UserPreferences {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (user) => user.preferences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  user_id: string;

  @Column()
  ciudad: string;

  @Column()
  entorno: string; // Oficina, Casa, Universidad, Exterior

  @Column('simple-array')
  estilo: string[]; // Casual, Elegante, Deportivo, Minimalista, Streetwear

  @Column('simple-array')
  colores: string[]; // Neutros, Tierra, Pasteles, Vibrantes, Oscuros

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}