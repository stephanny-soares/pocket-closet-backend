import { Injectable, BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { validarEmail, validarNombre, validarPassword } from '../../common/validators/general-validators';
import { LoggerService } from 'src/common/logger/logger.service';
import { AuditoriaUsuariosService } from '../auditoria-usuarios/auditoria-usuarios.service';


@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
    private readonly auditoriaUsuariosService: AuditoriaUsuariosService,
    private readonly jwtService: JwtService,  
  ) {}

  /**
   * Registro de nuevo usuario con validaciones, auditoría y token JWT
   */
  async register(createUserDto: CreateUserDto, correlationId?: string) {
    const { name, email, password } = createUserDto;

    // Validaciones
    if (!validarNombre(name) || !validarEmail(email) || !validarPassword(password)) {
      this.logger.warn({
        event: 'DatosInvalidos',
        message: 'Intento de registro con datos inválidos',
        email,
        correlationId,
      });
      throw new BadRequestException('Datos inválidos');
    }

    // Comprobar duplicado
    const existingUser = await this.userRepository.findOneBy({ email });
    if (existingUser) {
      this.logger.warn({
        event: 'EmailDuplicado',
        message: `Email ya registrado: ${email}`,
        correlationId,
      });
      throw new ConflictException('Email ya registrado');
    }

    // Creación y guardado del nuevo usuario
    const password_hash = await bcrypt.hash(password, 10);
    const user = this.userRepository.create({ name, email, password_hash });
    const savedUser = await this.userRepository.save(user);

    // Registrar en auditoría
    await this.auditoriaUsuariosService.registrarEvento(
      'UserRegistered',
      savedUser.id,
      'info',
      'Nuevo usuario registrado exitosamente',
      '/auth/register',
      correlationId
    );

    // Registrar en logs 
    this.logger.info({
      event: 'UsuarioCreado',
      userId: savedUser.id,
      email: savedUser.email,
      correlationId,
      message: 'Nuevo usuario creado exitosamente',
    });

    // Generar JWT usando JwtService de NestJS
    const payload = { id: savedUser.id, email: savedUser.email };
    const token = this.jwtService.sign(payload);

    return { ok: true, usuario: savedUser, token };
  }

  /**
   * Login de usuario con validaciones y token JWT
   * Verificar cuenta activa
   * Verificar email confirmado
   */
  async login(loginDto: LoginDto, correlationId?: string) {
    const { email, password } = loginDto;

    // Validaciones básicas
    if (!validarEmail(email) || !password) {
      this.logger.warn({
        event: 'DatosLoginInvalidos',
        message: 'Intento de login con datos inválidos',
        email,
        correlationId,
      });
      throw new BadRequestException('Email y contraseña son requeridos');
    }

    // Buscar usuario por email
    const user = await this.userRepository.findOneBy({ email });
    if (!user) {
      this.logger.warn({
        event: 'UsuarioNoEncontrado',
        message: `Intento de login con email no registrado: ${email}`,
        correlationId,
      });
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Verificar que la cuenta esté activa
  if (!user.is_active) {
    this.logger.warn({
      event: 'CuentaInactiva',
      message: `Intento de login en cuenta inactiva: ${email}`,
      userId: user.id,
      correlationId,
    });
    await this.auditoriaUsuariosService.registrarEvento(
      'LoginAttemptInactiveAccount',
      user.id,
      'warn',
      'Intento de login en cuenta inactiva',
      '/auth/login',
      correlationId
    );
    throw new UnauthorizedException('Cuenta no activada');
  }

  // Verificar que el email esté confirmado
  if (!user.email_confirmed) {
    this.logger.warn({
      event: 'EmailNoConfirmado',
      message: `Intento de login con email no confirmado: ${email}`,
      userId: user.id,
      correlationId,
    });
    await this.auditoriaUsuariosService.registrarEvento(
      'LoginAttemptUnconfirmedEmail',
      user.id,
      'warn',
      'Intento de login con email no confirmado',
      '/auth/login',
      correlationId
    );
    throw new UnauthorizedException('Email no confirmado');
  }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      this.logger.warn({
        event: 'ContraseñaInvalida',
        message: `Intento de login con contraseña incorrecta: ${email}`,
        correlationId,
      });
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Registrar en auditoría
    await this.auditoriaUsuariosService.registrarEvento(
      'UserLoggedIn',
      user.id,
      'info',
      'Usuario inició sesión exitosamente',
      '/auth/login',
      correlationId
    );

    // Registrar en logs
    this.logger.info({
      event: 'UsuarioLoginExitoso',
      userId: user.id,
      email: user.email,
      correlationId,
      message: 'Usuario inició sesión exitosamente',
    });

    // Generar JWT
    const payload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { ok: true, usuario: user, token };
  }

  /**
   * Validación de usuario por ID (usado por JwtStrategy)
   */
  async validarUsuarioPorId(id: string) {
    const usuario = await this.userRepository.findOne({ where: { id } });
    return usuario || null;
  }
}
