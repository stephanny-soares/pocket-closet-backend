import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async crearUsuario(name: string, email: string, password: string) {
    const password_hash = await bcrypt.hash(password, 10);
    const usuario = this.userRepository.create({ name, email, password_hash });
    return this.userRepository.save(usuario);
  }

  async buscarPorEmail(email: string): Promise<User | null> {
    return this.userRepository.findOneBy({ email });
  }

  async obtenerUsuarios(): Promise<Partial<User>[]> {
    const usuarios = await this.userRepository.find();
    return usuarios.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      fecha_registro: u.createdAt,
    }));
  }
}
