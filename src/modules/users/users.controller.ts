import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreatePreferencesDto } from './dto/create-preferences.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdatePerfilDto } from './dto/update-perfil.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../../common/services/storage.service';

@ApiTags('users')
@Controller('api/users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly storageService: StorageService,
  ) {}

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
        avatar: 'https://storage.googleapis.com/...',
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

   /**
   * PUT /api/users/perfil
   * Actualizar perfil del usuario (nombre, ciudad y/o avatar)
   * Acepta multipart/form-data para manejar archivo + JSON
   */

  @Put('perfil')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Actualizar perfil del usuario',
    description:
      'Actualiza nombre, ciudad y/o avatar del usuario. Todos los campos son opcionales.',
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
          avatar: 'https://storage.googleapis.com/...',
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
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    try {
      let perfilActualizado = await this.usersService.obtenerPerfil(usuario);

      // Actualizar datos de perfil (name, ciudad)
      if (updatePerfilDto.name || updatePerfilDto.ciudad) {
        perfilActualizado = await this.usersService.actualizarPerfil(
          usuario.id,
          updatePerfilDto,
        );
      }

      // Actualizar avatar si viene archivo
      if (archivo) {
        // Validar que sea imagen
        if (!archivo.mimetype.startsWith('image/')) {
          throw new BadRequestException('El archivo debe ser una imagen');
        }

        // Validar tamaño (máx 5MB)
        if (archivo.size > 50 * 1024 * 1024) {
          throw new BadRequestException('La imagen no debe superar 50MB');
        }

        const userId = usuario.id;

        // Eliminar avatar anterior si existe
        if (perfilActualizado.avatar) {
          await this.storageService.eliminarAvatar(userId);
        }

        // Subir nuevo avatar a GCS
        const urlAvatar = await this.storageService.subirAvatar(
          archivo,
          userId,
        );

        // Actualizar avatar en BD
        perfilActualizado = await this.usersService.actualizarAvatar(
          userId,
          urlAvatar,
        );
      }

      console.log('🔍 Perfil actualizado:', perfilActualizado); // ← AGREGAR

      return { ok: true, usuario: perfilActualizado };
    } catch (error) {
      throw new BadRequestException(
        `Error al actualizar perfil: ${error.message}`,
      );
    }
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
