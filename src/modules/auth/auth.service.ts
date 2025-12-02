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
import { RedisService } from '../../common/redis/redis.service';


@Injectable()
export class AuthService {
  // Para Redis - PC-75
  private readonly MAX_ATTEMPTS = 5;
  private  BLOCK_DURATION_SECONDS: number; // tiempo

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly logger: LoggerService,
    private readonly auditoriaUsuariosService: AuditoriaUsuariosService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {
    // Leer desde .env, default: 2 min en dev, 15 min en prod
    this.BLOCK_DURATION_SECONDS = parseInt(
      process.env.REDIS_BLOCK_DURATION || '900',
      10,
    );
  }

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
   * Endpoint POST /login
   * Verificar cuenta activa
   * Anti-brute-force por IP
   * Verificar email confirmado
   */
  async login(loginDto: LoginDto, correlationId?: string, ip?: string) {
    const { email, password } = loginDto;
    const ipAddress = ip || 'unknown';
    const attemptKey = `login_attempts:${ipAddress}`;
    const blockKey = `login_blocked:${ipAddress}`;

    // Verificar si la IP está bloqueada
    const isBlocked = await this.redisService.get(blockKey);
    if (isBlocked) {
      this.logger.warn({
        event: 'IpBloqueada',
        message: `IP bloqueada por múltiples intentos fallidos: ${ipAddress}`,
        ip: ipAddress,
        correlationId,
      });
      await this.auditoriaUsuariosService.registrarEvento(
        'LoginAttemptBlockedIP',
        null,
        'warn',
        `Intento de login desde IP bloqueada: ${ipAddress}`,
        '/auth/login',
        correlationId,
        ipAddress
      );
      throw new UnauthorizedException('Demasiados intentos fallidos. Intenta más tarde.');
    }

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
      // Incrementar intentos fallidos
      await this.incrementLoginAttempts(attemptKey, blockKey, ipAddress, correlationId);

      this.logger.warn({
        event: 'UsuarioNoEncontrado',
        message: `Intento de login con email no registrado: ${email}`,
        ip: ipAddress,
        correlationId,
      });
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // Verificar que la cuenta esté activa
    if (!user.is_active) {
      await this.incrementLoginAttempts(attemptKey, blockKey, ipAddress, correlationId);

      this.logger.warn({
        event: 'CuentaInactiva',
        message: `Intento de login en cuenta inactiva: ${email}`,
        userId: user.id,
        ip: ipAddress,
        correlationId,
      });
      await this.auditoriaUsuariosService.registrarEvento(
        'LoginAttemptInactiveAccount',
        user.id,
        'warn',
        'Intento de login en cuenta inactiva',
        '/auth/login',
        correlationId,
        ipAddress
      );
      throw new UnauthorizedException('Cuenta no activada');
    }

    // Verificar que el email esté confirmado
    if (!user.email_confirmed) {
      await this.incrementLoginAttempts(attemptKey, blockKey, ipAddress, correlationId);

      this.logger.warn({
        event: 'EmailNoConfirmado',
        message: `Intento de login con email no confirmado: ${email}`,
        userId: user.id,
        ip: ipAddress,
        correlationId,
      });
      await this.auditoriaUsuariosService.registrarEvento(
        'LoginAttemptUnconfirmedEmail',
        user.id,
        'warn',
        'Intento de login con email no confirmado',
        '/auth/login',
        correlationId,
        ipAddress
      );
      throw new UnauthorizedException('Email no confirmado');
    }

    // Validar contraseña
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      // Incrementar intentos fallidos
      await this.incrementLoginAttempts(attemptKey, blockKey, ipAddress, correlationId);

      this.logger.warn({
        event: 'ContraseñaInvalida',
        message: `Intento de login con contraseña incorrecta: ${email}`,
        ip: ipAddress,
        correlationId,
      });
      throw new UnauthorizedException('Email o contraseña incorrectos');
    }

    // ✅ LOGIN EXITOSO: Limpiar intentos fallidos
    await this.redisService.del(attemptKey);

    // Registrar en auditoría
    await this.auditoriaUsuariosService.registrarEvento(
      'UserLoggedIn',
      user.id,
      'info',
      'Usuario inició sesión exitosamente',
      '/auth/login',
      correlationId,
      ipAddress
    );

    // Registrar en logs
    this.logger.info({
      event: 'UsuarioLoginExitoso',
      userId: user.id,
      email: user.email,
      ip: ipAddress,
      correlationId,
      message: 'Usuario inició sesión exitosamente',
    });

    // Generar JWT
    const payload = { id: user.id, email: user.email };
    const token = this.jwtService.sign(payload);

    return { ok: true, usuario: user, token };
  }

  /**
   * Incrementar contador de intentos fallidos
   * y bloquear IP si excede límite
   */
  private async incrementLoginAttempts(
    attemptKey: string,
    blockKey: string,
    ip: string,
    correlationId?: string,
  ) {
    const attempts = await this.redisService.increment(attemptKey);

    // Primera vez, setear expiración
    if (attempts === 1) {
      await this.redisService.expire(attemptKey, this.BLOCK_DURATION_SECONDS);
    }

    this.logger.warn({
      event: 'LoginAttemptFailed',
      message: `Intento de login fallido. Intento ${attempts}/${this.MAX_ATTEMPTS}`,
      ip,
      attempts,
      correlationId,
    });

    // Si alcanza el límite, bloquear IP
    if (attempts >= this.MAX_ATTEMPTS) {
      await this.redisService.setEx(blockKey, this.BLOCK_DURATION_SECONDS, 'blocked');

      this.logger.warn({
        event: 'IpBloqueadaPorIntentosMultiples',
        message: `IP bloqueada por ${this.BLOCK_DURATION_SECONDS} segundos`,
        ip,
        correlationId,
      });

      await this.auditoriaUsuariosService.registrarEvento(
        'LoginAttemptsExceeded',
        null,
        'warn',
        `IP bloqueada por múltiples intentos fallidos: ${ip}`,
        '/auth/login',
        correlationId,
        ip
      );
    }
  }

  /**
   * Validación de usuario por ID (usado por JwtStrategy)
   */
  async validarUsuarioPorId(id: string) {
    console.log('🔍 Buscando usuario con ID:', id); // ← AGREGAR
    const usuario = await this.userRepository.findOne({ where: { id } });
    console.log('👤 Usuario encontrado:', usuario); // ← AGREGAR
    return usuario || null;
  }
}