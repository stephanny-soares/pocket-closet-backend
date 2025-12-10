import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UserPreferences } from '../../entities/user-preferences.entity';
import * as bcrypt from 'bcrypt';
import { PerfilDto } from './dto/perfil.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { CreatePreferencesDto } from './dto/create-preferences.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { PreferencesDto } from './dto/preferences.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserPreferences)
    private readonly preferencesRepository: Repository<UserPreferences>,
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
    return usuarios.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      fecha_registro: u.createdAt,
    }));
  }

  async obtenerPerfil(usuario: any): Promise<PerfilDto> {
    const usuarioCompleto = await this.userRepository.findOneBy({
      id: usuario.id,
    });

    if (!usuarioCompleto) {
      throw new Error('Usuario no encontrado');
    }

    return {
      id: usuarioCompleto.id,
      userName: usuarioCompleto.name,
      email: usuarioCompleto.email,
      avatar: usuarioCompleto.avatar,
      ciudad: usuarioCompleto.ciudad,
      createdAt: usuarioCompleto.createdAt,
    };
  }

  async actualizarPerfil(
  userId: string,
  updatePerfilDto: UpdatePerfilDto,
): Promise<PerfilDto> {
  const usuario = await this.userRepository.findOneBy({ id: userId });

  if (!usuario) {
    throw new NotFoundException('Usuario no encontrado');
  }

  // Actualizar solo los campos que lleguen
  if (updatePerfilDto.name) {
    usuario.name = updatePerfilDto.name;
  }
  if (updatePerfilDto.ciudad) {
    usuario.ciudad = updatePerfilDto.ciudad;
  }

  const updated = await this.userRepository.save(usuario);

  return {
    id: updated.id,
    userName: updated.name,
    email: updated.email,
    ciudad: updated.ciudad,
    createdAt: updated.createdAt,
  };
}

/**
 * Actualizar avatar del usuario
 */
async actualizarAvatar(userId: string, urlAvatar: string): Promise<PerfilDto> {
  const usuario = await this.userRepository.findOneBy({ id: userId });

  console.log('🔍 Guardando avatar para usuario:', userId); 
  console.log('🔍 URL a guardar:', urlAvatar); 

  if (!usuario) {
    throw new NotFoundException('Usuario no encontrado');
  }

  usuario.avatar = urlAvatar;
  const updated = await this.userRepository.save(usuario);

   console.log('🔍 Avatar guardado en BD:', updated.avatar); // ← AGREGAR

  return {
    id: updated.id,
    userName: updated.name,
    email: updated.email,
    avatar: updated.avatar,
    ciudad: updated.ciudad,
    createdAt: updated.createdAt,
  };
}

  // 🆕 Guardar preferencias del cuestionario
  async savePreferences(
    userId: string,
    createPreferencesDto: CreatePreferencesDto,
  ): Promise<PreferencesDto> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Verificar si ya existen preferencias
    const existingPreferences = await this.preferencesRepository.findOneBy({
      user_id: userId,
    });

    if (existingPreferences) {
      throw new BadRequestException(
        'El usuario ya tiene preferencias guardadas. Use PUT para actualizar.',
      );
    }

    // Crear nuevas preferencias
    const preferences = this.preferencesRepository.create({
      user_id: userId,
      ...createPreferencesDto,
    });

    const saved = await this.preferencesRepository.save(preferences);

    return this.mapToPreferencesDto(saved);
  }

  // 🆕 Actualizar preferencias
  async updatePreferences(
    userId: string,
    updatePreferencesDto: UpdatePreferencesDto,
  ): Promise<PreferencesDto> {
    // Verificar que el usuario existe
    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Buscar preferencias existentes
    const preferences = await this.preferencesRepository.findOneBy({
      user_id: userId,
    });

    if (!preferences) {
      throw new NotFoundException(
        'Preferencias no encontradas para este usuario',
      );
    }

    // Actualizar solo los campos proporcionados
    Object.assign(preferences, updatePreferencesDto);

    const updated = await this.preferencesRepository.save(preferences);

    return this.mapToPreferencesDto(updated);
  }

  // 🆕 Obtener preferencias del usuario
  async getPreferences(userId: string): Promise<PreferencesDto> {
    const preferences = await this.preferencesRepository.findOneBy({
      user_id: userId,
    });

    if (!preferences) {
      throw new NotFoundException(
        'Preferencias no encontradas para este usuario',
      );
    }

    return this.mapToPreferencesDto(preferences);
  }

  // 🆕 Verificar si el usuario tiene preferencias
  async hasPreferences(userId: string): Promise<boolean> {
    const preferences = await this.preferencesRepository.findOneBy({
      user_id: userId,
    });
    return !!preferences;
  }

  // 🆕 Helper para mapear a DTO
  private mapToPreferencesDto(preferences: UserPreferences): PreferencesDto {
    return {
      id: preferences.id,
      ciudad: preferences.ciudad,
      entorno: preferences.entorno,
      estilo: preferences.estilo,
      colores: preferences.colores,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
    };
  }
}
