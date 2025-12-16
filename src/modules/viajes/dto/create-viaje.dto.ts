import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class CreateViajeDto {
  @ApiProperty({
    description: 'Destino del viaje',
    example: 'Barcelona',
  })
  @IsString()
  destino: string;

  @ApiProperty({
    description: 'Ciudad de destino (se usa para obtener clima y calcular tipo de maleta)',
    example: 'Barcelona, España',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({
    description: 'Fecha de inicio del viaje (formato ISO)',
    example: '2025-12-20',
  })
  @IsDateString()
  fechaInicio: string;

  @ApiProperty({
    description: 'Fecha de fin del viaje (formato ISO)',
    example: '2025-12-27',
  })
  @IsDateString()
  fechaFin: string;

  @ApiProperty({
    description: 'Método de transporte',
    enum: ['Avión', 'Tren', 'Coche', 'Bus', 'Barco'],
    example: 'Avión',
  })
  @IsEnum(['Avión', 'Tren', 'Coche', 'Bus', 'Barco'])
  transporte: string;

  @ApiProperty({
    description: 'Actividades planeadas (la IA las usa para calcular tipo de maleta)',
    type: [String],
    example: ['Playa', 'Compras'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  actividades?: string[];

  @ApiProperty({
    description: 'Descripción opcional del viaje',
    example: 'Viaje de vacaciones a la playa',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;
}