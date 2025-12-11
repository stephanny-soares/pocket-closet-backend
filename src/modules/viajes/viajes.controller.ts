import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Viaje } from '../../entities/viaje.entity';
import { MaletaOutfit } from '../../entities/maleta-outfits.entity';
import { ViajesService } from './viajes.service';
import { CreateViajeDto } from './dto/create-viaje.dto';
import { UpdateViajeDto } from './dto/update-viaje.dto';
import { GenerarMaletaDto } from './dto/generar-maleta.dto';
import { CreateMaletaOutfitDto } from './dto/create-maleta-outfit.dto';
import { UpdateMaletaOutfitDto } from './dto/update-maleta-outfit.dto';

@ApiTags('viajes')
@Controller('api/viajes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ViajesController {
  constructor(private readonly viajesService: ViajesService) {}

  // ============================================================
  // CRUD VIAJES
  // ============================================================

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nuevo viaje',
    description:
      'Crea un nuevo viaje con destino, fechas, transporte y actividades',
  })
  @ApiBody({
    type: CreateViajeDto,
    examples: {
      example1: {
        value: {
          destino: 'Barcelona',
          ciudad: 'Barcelona, España',
          fechaInicio: '2025-12-20',
          fechaFin: '2025-12-27',
          transporte: 'Avión',
          actividades: ['Playa', 'Compras'],
          descripcion: 'Viaje de vacaciones navideñas',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Viaje creado exitosamente',
    type: Viaje,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos',
  })
  async crearViaje(
    @Body() createViajeDto: CreateViajeDto,
    @Req() req: Express.Request,
  ): Promise<Viaje> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.crearViaje(createViajeDto, usuario);
  }

  @Get()
  @ApiOperation({
    summary: 'Obtener todos mis viajes',
    description: 'Lista todos los viajes del usuario autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de viajes',
    type: [Viaje],
  })
  async obtenerViajes(@Req() req: Express.Request): Promise<Viaje[]> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.obtenerViajes(usuario);
  }

  @Get(':id')
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Obtener viaje específico',
    description: 'Obtiene los detalles de un viaje y su maleta',
  })
  @ApiResponse({
    status: 200,
    description: 'Viaje encontrado',
    type: Viaje,
  })
  @ApiResponse({
    status: 404,
    description: 'Viaje no encontrado',
  })
  async obtenerViajePorId(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ): Promise<Viaje> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.obtenerViajePorId(id, usuario);
  }

  @Put(':id')
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiOperation({
    summary: 'Actualizar viaje',
    description: 'Actualiza los detalles de un viaje existente',
  })
  @ApiBody({
    type: UpdateViajeDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Viaje actualizado',
    type: Viaje,
  })
  async actualizarViaje(
    @Param('id') id: string,
    @Body() updateViajeDto: UpdateViajeDto,
    @Req() req: Express.Request,
  ): Promise<Viaje> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.actualizarViaje(id, updateViajeDto, usuario);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiOperation({
    summary: 'Eliminar viaje',
    description: 'Elimina un viaje y su maleta asociada',
  })
  @ApiResponse({
    status: 204,
    description: 'Viaje eliminado',
  })
  async eliminarViaje(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ): Promise<void> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.eliminarViaje(id, usuario);
  }

  // ============================================================
  // GENERAR MALETA (⭐ ENDPOINT PRINCIPAL CON IA)
  // ============================================================

  @Post(':id/maleta/generar')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiOperation({
    summary: '⭐ Generar maleta con IA',
    description:
      'La IA analiza el viaje (clima, duración, actividades, tipo de maleta) y genera recomendaciones personalizadas de outfits y prendas sueltas para empacar. Considera el clima del destino, la estación, y crea una lista inteligente de lo que llevar.',
  })
  @ApiBody({
    type: GenerarMaletaDto,
    required: false,
  })
  @ApiResponse({
    status: 201,
    description: 'Maleta generada con éxito',
    type: [MaletaOutfit],
  })
  @ApiResponse({
    status: 400,
    description: 'Necesitas al menos 2 prendas en tu armario',
  })
  @ApiResponse({
    status: 404,
    description: 'Viaje no encontrado',
  })
  async generarMaleta(
    @Param('id') id: string,
    @Body() generarMaletaDto: GenerarMaletaDto = {},
    @Req() req: Express.Request,
  ): Promise<MaletaOutfit[]> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.generarMaleta(id, usuario, generarMaletaDto);
  }

  // ============================================================
  // GESTIÓN DE MALETA
  // ============================================================

  @Get(':id/maleta')
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiOperation({
    summary: 'Obtener maleta del viaje',
    description:
      'Obtiene todos los outfits y prendas recomendadas para este viaje',
  })
  @ApiResponse({
    status: 200,
    description: 'Items de maleta',
    type: [MaletaOutfit],
  })
  async obtenerMaletaViaje(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ): Promise<MaletaOutfit[]> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.obtenerMaletaViaje(id, usuario);
  }

  @Post(':id/maleta')
  @HttpCode(HttpStatus.CREATED)
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiOperation({
    summary: 'Crear outfit manualmente en la maleta',
    description:
      'El usuario puede crear y agregar un outfit personalizado a su maleta, seleccionando prendas específicas de su armario',
  })
  @ApiBody({
    type: CreateMaletaOutfitDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Outfit agregado a la maleta',
    type: MaletaOutfit,
  })
  async crearMaletaOutfit(
    @Param('id') id: string,
    @Body() createMaletaOutfitDto: CreateMaletaOutfitDto,
    @Req() req: Express.Request,
  ): Promise<MaletaOutfit> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.crearMaletaOutfit(
      id,
      usuario,
      createMaletaOutfitDto,
    );
  }

  @Put(':id/maleta/:maletaId')
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiParam({
    name: 'maletaId',
    description: 'ID del item de maleta',
  })
  @ApiOperation({
    summary: 'Actualizar item de maleta',
    description:
      'Marca un outfit como empacado, cambia la cantidad o agrega notas',
  })
  @ApiBody({
    type: UpdateMaletaOutfitDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Item actualizado',
    type: MaletaOutfit,
  })
  async actualizarMaletaOutfit(
    @Param('id') id: string,
    @Param('maletaId') maletaId: string,
    @Body() updateMaletaDto: UpdateMaletaOutfitDto,
    @Req() req: Express.Request,
  ): Promise<MaletaOutfit> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.actualizarMaletaOutfit(
      id,
      maletaId,
      usuario,
      updateMaletaDto,
    );
  }

  @Delete(':id/maleta/:maletaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'id',
    description: 'ID del viaje',
  })
  @ApiParam({
    name: 'maletaId',
    description: 'ID del item de maleta',
  })
  @ApiOperation({
    summary: 'Eliminar item de maleta',
    description: 'Elimina un outfit o prendas de la maleta del viaje',
  })
  @ApiResponse({
    status: 204,
    description: 'Item eliminado',
  })
  async eliminarMaletaOutfit(
    @Param('id') id: string,
    @Param('maletaId') maletaId: string,
    @Req() req: Express.Request,
  ): Promise<void> {
    const usuario = (req as any).user;

    if (!usuario) {
      throw new BadRequestException('Usuario no autenticado');
    }

    return await this.viajesService.eliminarMaletaOutfit(id, maletaId, usuario);
  }
}