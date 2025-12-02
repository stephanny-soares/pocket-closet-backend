import { Controller, Get, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';

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
