import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { EventosService } from './eventos.service';
import { CreateEventoDto } from './dto/create-evento.dto';
import { UpdateEventoDto } from './dto/update-evento.dto';

@ApiTags('eventos')
@Controller('api/eventos')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class EventosController {
  constructor(private readonly eventosService: EventosService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo evento',
    description: 'Crea un nuevo evento asociado al usuario autenticado',
  })
  @ApiBody({
    schema: {
      example: {
        nombre: 'Boda de María',
        fecha: '2025-12-15',
        descripcion: 'Ceremonia a las 14:00 en el jardín',
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Evento creado exitosamente',
    example: {
      ok: true,
      evento: {
        id: 'uuid-1',
        nombre: 'Boda de María',
        fecha: '2025-12-15',
        descripcion: 'Ceremonia a las 14:00 en el jardín',
        createdAt: '2025-11-27T10:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Error al crear el evento',
  })
  async crear(
    @Body() createEventoDto: CreateEventoDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const evento = await this.eventosService.crearEvento(
      createEventoDto,
      usuario,
    );
    return { ok: true, evento };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos los eventos',
    description: 'Lista todos los eventos del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos del usuario',
    example: {
      ok: true,
      eventos: [
        {
          id: 'uuid-1',
          nombre: 'Boda de María',
          fecha: '2025-12-15',
          descripcion: 'Ceremonia en el jardín',
          createdAt: '2025-11-27T10:30:00Z',
        },
      ],
    },
  })
  async obtener(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const eventos = await this.eventosService.obtenerEventos(usuario);
    return { ok: true, eventos };
  }

  @Get('fecha/:fecha')
  @ApiParam({
    name: 'fecha',
    example: '2025-12-15',
    description: 'Fecha en formato YYYY-MM-DD',
  })
  @ApiOperation({
    summary: 'Obtener eventos por fecha',
  })
  @ApiResponse({
    status: 200,
    description: 'Eventos filtrados por fecha',
  })
  async obtenerPorFecha(
    @Param('fecha') fecha: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const eventos = await this.eventosService.obtenerEventosPorFecha(
      usuario,
      fecha,
    );
    return { ok: true, eventos };
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Obtener evento específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Evento encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Evento no encontrado',
  })
  async obtenerPorId(@Param('id') id: string, @Req() req: Express.Request) {
    const usuario = (req as any).user;
    const evento = await this.eventosService.obtenerEventoPorId(id, usuario);
    return { ok: true, evento };
  }

  @Put(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Actualizar evento',
  })
  @ApiBody({
    schema: {
      example: {
        nombre: 'Boda de María ACTUALIZADO',
        fecha: '2025-12-16',
        descripcion: 'Cambio de fecha',
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Evento actualizado',
  })
  async actualizar(
    @Param('id') id: string,
    @Body() updateEventoDto: UpdateEventoDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const evento = await this.eventosService.actualizarEvento(
      id,
      updateEventoDto,
      usuario,
    );
    return { ok: true, evento };
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Eliminar evento',
  })
  @ApiResponse({
    status: 200,
    description: 'Evento eliminado',
    example: {
      ok: true,
      message: 'Evento eliminado',
    },
  })
  async eliminar(@Param('id') id: string, @Req() req: Express.Request) {
    const usuario = (req as any).user;
    await this.eventosService.eliminarEvento(id, usuario);
    return { ok: true, message: 'Evento eliminado' };
  }
}
