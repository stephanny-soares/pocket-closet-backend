import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los usuarios',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuarios',
    example: {
      ok: true,
      usuarios: [
        { id: 'uuid-1', name: 'Juan', email: 'juan@example.com' },
        { id: 'uuid-2', name: 'María', email: 'maria@example.com' },
      ],
    },
  })
  async obtenerUsuarios() {
    const usuarios = await this.usersService.obtenerUsuarios();
    return { ok: true, usuarios };
  }

  @Get('perfil')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtener perfil del usuario autenticado',
    description: 'Retorna los datos del perfil del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil del usuario obtenido exitosamente',
    example: {
      ok: true,
      usuario: {
        id: 'uuid-1',
        userName: 'Juan Pérez',
        email: 'juan@example.com',
        ciudad: 'Alicante',
        createdAt: '2025-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado - token inválido o expirado',
  })
  async obtenerPerfil(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const perfil = await this.usersService.obtenerPerfil(usuario);
    return { ok: true, usuario: perfil };
  }

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo usuario',
  })
  @ApiBody({
    schema: {
      example: {
        name: 'Nuevo Usuario',
        email: 'nuevo@example.com',
        password: 'password123!',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario creado',
  })
  async crearUsuario(
    @Body('name') name: string,
    @Body('email') email: string,
    @Body('password') password: string,
  ) {
    const usuario = await this.usersService.crearUsuario(name, email, password);
    // no devolver el password_hash por seguridad
    const { password_hash, ...safe } = usuario as any;
    return { ok: true, usuario: safe };
  }
}
