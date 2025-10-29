import { Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { CreateUserDto } from './dto/create-user.dto';
import { validarEmail, validarNombre, validarPassword } from '../../common/validators/general-validators';
import { LoggerService } from 'src/common/logger/logger.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    const { name, email, password } = createUserDto;

    // Validaciones
    if (!validarNombre(name) || !validarEmail(email) || !validarPassword(password)) {
      // Usar el logger aca
      this.logger.warn({
        event: 'DatosInvalidos',
        message: 'Intento de registro con datos inválidos',
        email,
      });
      throw new BadRequestException('Datos inválidos');
    }

    // Comprobar duplicado
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      this.logger.warn({
        event: 'EmailDuplicado',
        message: `Email ya registrado: ${email}`,
      });
      throw new ConflictException('Email ya registrado');
    }

    // Crear usuario
    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ name, email, password_hash });
    const savedUser = await this.userRepository.save(user);

    this.logger.info({
      event: 'UsuarioCreado',
      userId: savedUser.id,
      email: savedUser.email,
      message: 'Nuevo usuario creado exitosamente',
    });

    
    // Generar JWT
    const token = jwt.sign(
      { id: savedUser.id, email: savedUser.email },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '1h' },
    );

    return { ok: true, usuario: savedUser, token };
  }
}
