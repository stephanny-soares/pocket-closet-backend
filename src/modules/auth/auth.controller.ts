import { Body, Controller, Post, HttpException, HttpStatus, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';


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
  async register(@Body() createUserDto: CreateUserDto, @Req() req: Express.Request) {
    try {
      const correlationId = (req as any).correlationId || null;
      const result = await this.authService.register(createUserDto, correlationId);
      return result;
    } catch (error) {
      throw new HttpException({ ok: false, error: error.message }, HttpStatus.BAD_REQUEST);
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
      throw new HttpException({ ok: false, error: error.message }, HttpStatus.BAD_REQUEST);
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
}