import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { UtilsService } from './utils.service';

@ApiTags('utils')
@Controller('api/utils')
export class UtilsController {
  constructor(private readonly utilsService: UtilsService) {}

  @Post('reverse-geocode')
  @ApiOperation({
    summary: 'Obtener ciudad por coordenadas GPS',
    description: 'Realiza reverse geocoding para obtener el nombre de la ciudad',
  })
  @ApiBody({
    schema: {
      example: {
        latitude: 38.3478,
        longitude: -0.4974,
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Ciudad obtenida',
    example: {
      ok: true,
      ciudad: 'Alicante',
    },
  })
  async reversGeocode(
    @Body() body: { latitude: number; longitude: number },
  ) {
    const ciudad = await this.utilsService.obtenerCiudadPorCoordenadas(
      body.latitude,
      body.longitude,
    );
    return { ok: true, ciudad };
  }
}