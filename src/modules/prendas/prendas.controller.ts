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

@Controller('api/prendas')
@UseGuards(JwtAuthGuard)
export class PrendasController {
  constructor(private readonly prendasService: PrendasService) {}

  @Post()
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
  async obtener(@Req() req: Express.Request) {
    const usuario = (req as any).user;
    const prendas = await this.prendasService.obtenerPrendas(usuario);
    return { ok: true, prendas };
  }

  @Get(':id')
  async obtenerPorId(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    const prenda = await this.prendasService.obtenerPrendaPorId(id, usuario);
    return { ok: true, prenda };
  }

  @Put(':id')
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
  async eliminar(
    @Param('id') id: string,
    @Req() req: Express.Request,
  ) {
    const usuario = (req as any).user;
    await this.prendasService.eliminarPrenda(id, usuario);
    return { ok: true, message: 'Prenda eliminada' };
  }
}
