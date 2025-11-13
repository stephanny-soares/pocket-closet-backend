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
import { OutfitsService } from './outfits.service';
import { CreateOutfitDto } from './dto/create-outfit.dto';
import { UpdateOutfitDto } from './dto/update-outfit.dto';

@ApiTags('outfits')
@Controller('api/outfits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo outfit',
    description: 'Crea un nuevo outfit asociando prendas del usuario',
  })
  @ApiBody({
    schema: {
      example: {
        nombre: 'Outfit casual viernes',
        imagen: 'https://images.unsplash.com/photo-1234567890?w=400',
        categoria: 'casual',
        estacion: 'primavera',
        prendasIds: ['uuid-prenda-1', 'uuid-prenda-2', 'uuid-prenda-3'],
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Outfit creado exitosamente',
    example: {
      ok: true,
      outfit: {
        id: 'uuid',
        nombre: 'Outfit casual viernes',
        imagen: 'https://...',
        categoria: 'casual',
        estacion: 'primavera',
        prendas: [
          { id: 'uuid-1', nombre: 'Camiseta azul', imagen: '...' },
          { id: 'uuid-2', nombre: 'Pantalón negro', imagen: '...' },
          { id: 'uuid-3', nombre: 'Zapatos blancos', imagen: '...' },
        ],
        createdAt: '2025-11-13T13:30:00Z',
      },
    },
  })
  async crear(
    @Body() createOutfitDto: CreateOutfitDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.crearOutfit(createOutfitDto, usuario);
    return { ok: true, outfit };
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener mis outfits',
    description: 'Lista todos los outfits del usuario',
  })
  @ApiResponse({
    status: 200,
    description: 'Outfits del usuario',
    example: {
      ok: true,
      outfits: [
        {
          id: 'uuid-1',
          nombre: 'Outfit casual',
          imagen: '...',
          categoria: 'casual',
          estacion: 'primavera',
          prendas: [
            { id: 'uuid', nombre: 'Camiseta', imagen: '...' },
          ],
          createdAt: '2025-11-13T13:30:00Z',
        },
      ],
    },
  })
  async obtener(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const outfits = await this.outfitsService.obtenerOutfits(usuario);
    return { ok: true, outfits };
  }

  @Get('categoria/:categoria')
  @ApiParam({
    name: 'categoria',
    example: 'casual',
    description: 'casual, formal, deporte, etc.',
  })
  @ApiOperation({
    summary: 'Obtener outfits por categoría',
  })
  @ApiResponse({
    status: 200,
    description: 'Outfits filtrados por categoría',
  })
  async obtenerPorCategoria(
    @Param('categoria') categoria: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfits = await this.outfitsService.obtenerOutfitsPorCategoria(
      usuario,
      categoria,
    );
    return { ok: true, outfits };
  }

  @Get('estacion/:estacion')
  @ApiParam({
    name: 'estacion',
    example: 'primavera',
    description: 'verano, invierno, primavera, otoño',
  })
  @ApiOperation({
    summary: 'Obtener outfits por estación',
  })
  @ApiResponse({
    status: 200,
    description: 'Outfits filtrados por estación',
  })
  async obtenerPorEstacion(
    @Param('estacion') estacion: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfits = await this.outfitsService.obtenerOutfitsPorEstacion(
      usuario,
      estacion,
    );
    return { ok: true, outfits };
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Obtener outfit específico',
  })
  @ApiResponse({
    status: 200,
    description: 'Outfit encontrado',
  })
  @ApiResponse({
    status: 404,
    description: 'Outfit no encontrado',
  })
  async obtenerPorId(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.obtenerOutfitPorId(id, usuario);
    return { ok: true, outfit };
  }

  @Put(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Actualizar outfit',
  })
  @ApiBody({
    schema: {
      example: {
        nombre: 'Outfit casual viernes ACTUALIZADO',
        categoria: 'formal',
        prendasIds: ['uuid-prenda-1', 'uuid-prenda-2'],
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Outfit actualizado',
  })
  async actualizar(
    @Param('id') id: string,
    @Body() updateOutfitDto: UpdateOutfitDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.actualizarOutfit(
      id,
      updateOutfitDto,
      usuario,
    );
    return { ok: true, outfit };
  }

  @Delete(':id')
  @ApiParam({
    name: 'id',
    example: 'uuid-1',
  })
  @ApiOperation({
    summary: 'Eliminar outfit',
  })
  @ApiResponse({
    status: 200,
    description: 'Outfit eliminado',
    example: {
      ok: true,
      message: 'Outfit eliminado',
    },
  })
  async eliminar(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    await this.outfitsService.eliminarOutfit(id, usuario);
    return { ok: true, message: 'Outfit eliminado' };
  }
}