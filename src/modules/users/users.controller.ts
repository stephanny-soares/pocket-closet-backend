import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePreferencesDto } from './dto/create-preferences.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';

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

  @Put('perfil')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar perfil del usuario',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Nombre completo del usuario',
          example: 'Juan Pérez',
        },
        ciudad: {
          type: 'string',
          description: 'Ciudad de residencia',
          example: 'Buenos Aires',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Perfil actualizado correctamente',
    schema: {
      example: {
        ok: true,
        usuario: {
          id: 'uuid-1',
          userName: 'Juan Pérez',
          email: 'juan@example.com',
          ciudad: 'Buenos Aires',
          createdAt: '2025-01-15T10:30:00Z',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuario no encontrado',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async actualizarPerfil(
    @Req() req: Express.Request,
    @Body() updatePerfilDto: UpdatePerfilDto,
  ) {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const perfilActualizado = await this.usersService.actualizarPerfil(
      usuario.id,
      updatePerfilDto,
    );

    return { ok: true, usuario: perfilActualizado };
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

  // 🆕 POST - Guardar preferencias (primera vez)
  @Post('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Guardar preferencias del cuestionario',
    description:
      'Guarda las respuestas del cuestionario de estilo y preferencias. Solo funciona la primera vez.',
  })
  @ApiBody({
    schema: {
      example: {
        ciudad: 'Alicante',
        entorno: 'Oficina',
        estilo: ['Casual', 'Minimalista'],
        colores: ['Neutros', 'Tierra'],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Preferencias guardadas exitosamente',
    example: {
      ok: true,
      preferences: {
        id: 'uuid-1',
        ciudad: 'Alicante',
        entorno: 'Oficina',
        estilo: ['Casual', 'Minimalista'],
        colores: ['Neutros', 'Tierra'],
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'El usuario ya tiene preferencias guardadas',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async savePreferences(
    @Req() req: Express.Request,
    @Body() createPreferencesDto: CreatePreferencesDto,
  ) {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const preferences = await this.usersService.savePreferences(
      usuario.id,
      createPreferencesDto,
    );

    return { ok: true, preferences };
  }

  // 🆕 PUT - Actualizar preferencias
  @Put('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Actualizar preferencias del usuario',
    description: 'Actualiza total o parcialmente las preferencias existentes',
  })
  @ApiBody({
    schema: {
      example: {
        ciudad: 'Valencia',
        estilo: ['Elegante', 'Minimalista'],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias actualizadas exitosamente',
  })
  @ApiResponse({
    status: 404,
    description: 'Preferencias no encontradas',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async updatePreferences(
    @Req() req: Express.Request,
    @Body() updatePreferencesDto: UpdatePreferencesDto,
  ) {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const preferences = await this.usersService.updatePreferences(
      usuario.id,
      updatePreferencesDto,
    );

    return { ok: true, preferences };
  }

  // 🆕 GET - Obtener preferencias del usuario
  @Get('preferences')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Obtener preferencias del usuario autenticado',
    description: 'Retorna todas las preferencias guardadas del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Preferencias obtenidas exitosamente',
    example: {
      ok: true,
      preferences: {
        id: 'uuid-1',
        ciudad: 'Alicante',
        entorno: 'Oficina',
        estilo: ['Casual', 'Minimalista'],
        colores: ['Neutros', 'Tierra'],
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Preferencias no encontradas',
  })
  @ApiResponse({
    status: 401,
    description: 'No autorizado',
  })
  async getPreferences(@Req() req: Express.Request) {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    const preferences = await this.usersService.getPreferences(usuario.id);

    return { ok: true, preferences };
  }
}
