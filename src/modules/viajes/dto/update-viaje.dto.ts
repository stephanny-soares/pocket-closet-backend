import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsArray, IsOptional, IsEnum } from 'class-validator';

export class UpdateViajeDto {
  @ApiProperty({
    description: 'Destino del viaje',
    example: 'Barcelona',
    required: false,
  })
  @IsOptional()
  @IsString()
  destino?: string;

  @ApiProperty({
    description: 'Ciudad de destino',
    example: 'Barcelona, España',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({
    description: 'Fecha de inicio (formato ISO)',
    example: '2025-12-20',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fechaInicio?: string;

  @ApiProperty({
    description: 'Fecha de fin (formato ISO)',
    example: '2025-12-27',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  fechaFin?: string;

  @ApiProperty({
    description: 'Método de transporte',
    enum: ['Avión', 'Tren', 'Coche', 'Bus', 'Barco'],
    example: 'Avión',
    required: false,
  })
  @IsOptional()
  @IsEnum(['Avión', 'Tren', 'Coche', 'Bus', 'Barco'])
  transporte?: string;

  @ApiProperty({
    description: 'Actividades planeadas',
    type: [String],
    example: ['Playa', 'Compras'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  actividades?: string[];

  @ApiProperty({
    description: 'Descripción del viaje',
    example: 'Viaje de vacaciones a la playa',
    required: false,
  })
  @IsOptional()
  @IsString()
  descripcion?: string;
}