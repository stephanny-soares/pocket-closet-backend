import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { GoogleLoginDto } from './dto/google-login.dto';
import { AppleLoginDto } from './dto/apple-login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  @ApiOperation({
    summary: 'Registrar nuevo usuario',
    description: 'Crear una nueva cuenta en PocketCloset',
  })
  @ApiBody({
    description: 'Datos de registro',
    schema: {
      example: {
        name: 'Juan Pérez',
        email: 'juan@example.com',
        password: 'contraseña123',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado exitosamente',
    example: {
      ok: true,
      user: { id: 'uuid', name: 'Juan Pérez', email: 'juan@example.com' },
      token: 'eyJhbGciOi...',
    },
  })
  @ApiResponse({
    status: 400,
    description: 'El email ya está registrado',
  })
  async register(
    @Body() createUserDto: CreateUserDto,
    @Req() req: Express.Request,
  ) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.register(
        createUserDto,
        correlationId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Iniciar sesión',
    description: 'Autenticarse en PocketCloset y obtener token JWT',
  })
  @ApiBody({
    description: 'Credenciales de login',
    schema: {
      example: {
        email: 'juan@example.com',
        password: 'contraseña123',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    example: {
      ok: true,
      user: { id: 'uuid', name: 'Juan Pérez', email: 'juan@example.com' },
      token: 'eyJhbGciOi...',
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Demasiados intentos fallidos',
  })
  @ApiResponse({
    status: 400,
    description: 'Email o contraseña incorrectos',
  })
  async login(@Body() loginDto: LoginDto, @Req() req: Express.Request) {
    try {
      const correlationId = (req as any).correlationId || null;
      const ip = this.getClientIp(req); // ← AGREGAR IP para redis
      const result = await this.authService.login(loginDto, correlationId, ip);
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Obtener IP del cliente
   */
  private getClientIp(req: any): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  }

  @Post('oauth/google')
  @Public()
  @ApiOperation({
    summary: 'Login con Google',
    description: 'Autenticarse con cuenta de Google',
  })
  @ApiBody({
    description: 'Google ID Token',
    schema: {
      example: { id_token: 'eyJhbGciOi...' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    example: {
      ok: true,
      user: { id: 'uuid', name: 'Juan', email: 'juan@gmail.com' },
      token: 'eyJhbGciOi...',
    },
  })
  async googleLogin(
    @Body() googleLoginDto: GoogleLoginDto,
    @Req() req: Express.Request,
  ) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.googleLogin(
        googleLoginDto,
        correlationId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('oauth/apple')
  @Public()
  @ApiOperation({
    summary: 'Login con Apple',
    description: 'Autenticarse con cuenta de Apple',
  })
  @ApiBody({
    description: 'Apple ID Token',
    schema: {
      example: { id_token: 'eyJhbGciOi...' },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Login exitoso',
    example: {
      ok: true,
      user: { id: 'uuid', name: 'Juan', email: 'juan@icloud.com' },
      token: 'eyJhbGciOi...',
    },
  })
  async appleLogin(
    @Body() appleLoginDto: AppleLoginDto,
    @Req() req: Express.Request,
  ) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.appleLogin(
        appleLoginDto,
        correlationId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('forgot-password')
  @Public()
  @ApiOperation({
    summary: 'Solicitar recuperación de contraseña',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          description: 'Email registrado',
          example: 'juan@example.com',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Solicitud procesada (mismo mensaje si existe o no)',
    schema: {
      example: {
        ok: true,
        message: 'Si el email existe, recibirás un enlace de recuperación',
        token: 'abc123xyz...', // Solo en desarrollo
      },
    },
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Express.Request,
  ) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.forgotPassword(
        forgotPasswordDto.email,
        correlationId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('reset-password')
  @Public()
  @ApiOperation({
    summary: 'Cambiar contraseña con token de recuperación',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token recibido por email',
          example: 'abc123xyz789...',
        },
        newPassword: {
          type: 'string',
          description: 'Nueva contraseña (mínimo 8 caracteres)',
          example: 'newPassword123!',
        },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Contraseña cambiada exitosamente',
    schema: {
      example: {
        ok: true,
        message: 'Contraseña actualizada correctamente',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Token inválido o expirado',
  })
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Express.Request,
  ) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.resetPassword(
        resetPasswordDto.token,
        resetPasswordDto.newPassword,
        correlationId,
      );
      return result;
    } catch (error) {
      throw new HttpException(
        { ok: false, error: error.message },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
