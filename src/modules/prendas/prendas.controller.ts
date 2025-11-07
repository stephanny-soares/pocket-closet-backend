import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PrendasService } from './prendas.service';
import { CreatePrendaDto } from './dto/create-prenda.dto';
import { UpdatePrendaDto } from './dto/update-prenda.dto';
import {ApiTags,ApiOperation,ApiResponse,ApiBody,ApiParam,ApiBearerAuth,} from '@nestjs/swagger';


@ApiTags('prendas')
@Controller('api/prendas')
@ApiBearerAuth() // ← ESTO INDICA QUE NECESITA JWT
@UseGuards(JwtAuthGuard)
export class PrendasController {
  constructor(private readonly prendasService: PrendasService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nueva prenda',
    description: 'Crea prenda y IA clasifica según imagen',
  })
  @ApiBody({
  schema: {  
    example: {
      imagen: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
    },
  },
})
  @ApiResponse({
    status: 201,
    description: 'Prenda creada y clasificada automáticamente por IA',
    example: {
      ok: true,
      prenda: {
        id: 'uuid',
        imagen: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
        // CLASIFICADO POR IA AUTOMÁTICAMENTE:
      nombre: 'Camiseta',
      tipo: 'camiseta',
      color: 'azul',
      marca: 'Nike',
      ocasion: 'casual',
      estacion: 'primavera',
      seccion: 'superior',
      created_at: '2025-01-15T10:30:00Z',
      },
    },
  })
  async crear(
    @Body() createPrendaDto: CreatePrendaDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const prenda = await this.prendasService.crearPrendaDesdeImagen(
      createPrendaDto,
      usuario,
    );
    return { ok: true, prenda };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener mis prendas',
  })
  @ApiResponse({
    status: 200,
    description: 'Prendas del usuario',
    example: {
      ok: true,
      prendas: [
        {
          id: 'uuid-1',
          nombre: 'Camiseta Azul',
          tipo: 'camiseta',
          seccion: 'superior',
        },
      ],
    },
  })
  async obtener(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const prendas = await this.prendasService.obtenerPrendas(usuario);
    return { ok: true, prendas };
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Obtener prenda específica',
  })
  @ApiResponse({
    status: 200,
    description: 'Prenda encontrada',
  })
  @ApiResponse({
    status: 404,
    description: 'Prenda no encontrada',
  })
  async obtenerPorId(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const prenda = await this.prendasService.obtenerPrendaPorId(id, usuario);
    return { ok: true, prenda };
  }

  @Put(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Actualizar prenda',
  })
  @ApiBody({
  schema: {  
    example: {
      nombre: 'Camiseta Azul Oscuro',
      color: 'azul oscuro',
    },
  },
})
  @ApiResponse({
    status: 200,
    description: 'Prenda actualizada',
  })
  async actualizar(
    @Param('id') id: string,
    @Body() updatePrendaDto: UpdatePrendaDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const prenda = await this.prendasService.actualizarPrenda(
      id,
      updatePrendaDto,
      usuario,
    );
    return { ok: true, prenda };
  }

  @Delete(':id')
   @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Eliminar prenda',
  })
  @ApiResponse({
    status: 200,
    description: 'Prenda eliminada',
    example: {
      ok: true,
      message: 'Prenda eliminada',
    },
  })
  async eliminar(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    await this.prendasService.eliminarPrenda(id, usuario);
    return { ok: true, message: 'Prenda eliminada' };
  }
}
