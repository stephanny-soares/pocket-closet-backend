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
import { CreateOutfitPorPrendaDto } from './dto/create-outfitPorPrenda.dto';
import { CreateOutfitPorEventoDto } from './dto/create-outfitPorEvento.dto';
import { CreateOutfitPorClimaDto } from './dto/create-outfitPorClima.dto';

@ApiTags('outfits')
@Controller('api/outfits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class OutfitsController {
  constructor(private readonly outfitsService: OutfitsService) {}

  @Post('sugerir')
  @ApiOperation({
    summary: 'Sugerir outfits con IA',
    description:
      'Genera 3 sugerencias de outfits variados (casual, formal, deportivo) basadas en las prendas cargadas del usuario utilizando Gemini AI',
  })
  @ApiResponse({
    status: 201,
    description: 'Outfits sugeridos exitosamente',
    example: {
      ok: true,
      outfits: [
        {
          id: 'uuid-1',
          nombre: 'Casual viernes',
          categoria: 'casual',
          estacion: 'todas',
          prendas: [
            { id: 'uuid-prenda-1', nombre: 'Camiseta azul', color: 'azul' },
            { id: 'uuid-prenda-2', nombre: 'Pantalón negro', color: 'negro' },
            { id: 'uuid-prenda-3', nombre: 'Zapatos blancos', color: 'blanco' },
          ],
          createdAt: '2025-11-20T22:45:00Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Necesitas al menos 3 prendas para generar sugerencias',
  })
  async sugerir(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const outfits = await this.outfitsService.sugerirOutfits(usuario);
    return { ok: true, outfits };
  }

  @Post('por-prenda')
  @ApiOperation({
    summary: 'Crear outfit por prenda',
    description:
      'Crea un outfit basado en una prenda seleccionada, IA completa el resto',
  })
  @ApiBody({
    schema: {
      example: {
        prendaId: '550e8400-e29b-41d4-a716-446655440000',
        categoria: 'casual',
        estacion: 'verano',
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
        nombre: 'Outfit con Camiseta azul',
        imagen: 'https://...',
        categoria: 'casual',
        estacion: 'todas',
        prendas: [
          { id: 'uuid-1', nombre: 'Camiseta azul', imagen: '...' },
          { id: 'uuid-2', nombre: 'Pantalón negro', imagen: '...' },
          { id: 'uuid-3', nombre: 'Zapatos blancos', imagen: '...' },
        ],
        createdAt: '2025-11-25T14:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Prenda no encontrada o necesitas al menos 2 prendas',
  })
  async crearPorPrenda(
    @Body() createOutfitDto: CreateOutfitPorPrendaDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.crearOutfitPorPrenda(
      createOutfitDto,
      usuario,
    );
    return { ok: true, outfit };
  }

  @Post('por-evento')
  @ApiOperation({
    summary: 'Crear outfit por evento',
    description:
      'Crea un outfit basado en un evento específico (boda, trabajo, gym, etc)',
  })
  @ApiBody({
    schema: {
      example: {
        evento: 'boda',
        categoria: 'formal',
        estacion: 'todas',
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
        nombre: 'Outfit elegante para boda',
        imagen: 'https://...',
        categoria: 'formal',
        estacion: 'todas',
        prendas: [
          { id: 'uuid-1', nombre: 'Vestido negro', imagen: '...' },
          { id: 'uuid-2', nombre: 'Tacones plateados', imagen: '...' },
          { id: 'uuid-3', nombre: 'Collar de perlas', imagen: '...' },
        ],
        createdAt: '2025-11-25T14:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Necesitas al menos 2 prendas para generar un outfit',
  })
  async crearPorEvento(
    @Body() createOutfitDto: CreateOutfitPorEventoDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.crearOutfitPorEvento(
      createOutfitDto,
      usuario,
    );
    return { ok: true, outfit };
  }

  @Post('por-clima')
  @ApiOperation({
    summary: 'Crear outfit por clima',
    description: 'Crea un outfit basado en el clima actual de Alicante',
  })
  @ApiBody({
    schema: {
      example: {
        categoria: 'casual',
        temperatura: 25,
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
        nombre: 'Outfit ligero para clima cálido',
        imagen: 'https://...',
        categoria: 'casual',
        estacion: 'todas',
        prendas: [
          { id: 'uuid-1', nombre: 'Camiseta blanca', imagen: '...' },
          { id: 'uuid-2', nombre: 'Pantalones cortos', imagen: '...' },
          { id: 'uuid-3', nombre: 'Sandalias', imagen: '...' },
        ],
        createdAt: '2025-11-25T14:30:00Z',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Necesitas al menos 2 prendas para generar un outfit',
  })
  async crearPorClima(
    @Body() createOutfitDto: CreateOutfitPorClimaDto,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const outfit = await this.outfitsService.crearOutfitPorClima(
      createOutfitDto,
      usuario,
    );
    return { ok: true, outfit };
  }

  @Post()
  @ApiOperation({
    summary: 'Crear nuevo outfit',
    description:
      'Crea un nuevo outfit asociando prendas del usuario manualmente',
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
    const outfit = await this.outfitsService.crearOutfit(
      createOutfitDto,
      usuario,
    );
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
          prendas: [{ id: 'uuid', nombre: 'Camiseta', imagen: '...' }],
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
  async obtenerPorId(@Param('id') id: string, @Req() req: Express.Request) {
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
  async eliminar(@Param('id') id: string, @Req() req: Express.Request) {
    const usuario = (req as any).user;
    await this.outfitsService.eliminarOutfit(id, usuario);
    return { ok: true, message: 'Outfit eliminado' };
  }
}
