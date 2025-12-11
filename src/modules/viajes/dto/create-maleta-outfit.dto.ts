import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsArray, IsOptional, IsInt, IsEnum, Min } from 'class-validator';

export class CreateMaletaOutfitDto {
  @ApiProperty({
    description: 'Nombre descriptivo del outfit o conjunto de prendas',
    example: 'Outfit casual para playa',
  })
  @IsString()
  nombre: string;

  @ApiProperty({
    description: 'Categoría del outfit',
    enum: ['casual', 'formal', 'deporte', 'elegante'],
    example: 'casual',
    required: false,
  })
  @IsOptional()
  @IsEnum(['casual', 'formal', 'deporte', 'elegante'])
  categoria?: string;

  @ApiProperty({
    description: 'Tipo de recomendación',
    enum: ['outfit_completo', 'prendas_sueltas'],
    example: 'outfit_completo',
    required: false,
  })
  @IsOptional()
  @IsEnum(['outfit_completo', 'prendas_sueltas'])
  tipo?: string;

  @ApiProperty({
    description: 'IDs de las prendas que forman parte de este outfit',
    type: [String],
    example: ['123e4567-e89b-12d3-a456-426614174000', '223e4567-e89b-12d3-a456-426614174000'],
  })
  @IsArray()
  prendasIds: string[];

  @ApiProperty({
    description: 'Cantidad de veces a llevar este outfit',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  cantidad?: number;

  @ApiProperty({
    description: 'Notas personales sobre este outfit',
    example: 'Perfecto para la playa, llevar en maleta de mano',
    required: false,
  })
  @IsOptional()
  @IsString()
  notas?: string;
}