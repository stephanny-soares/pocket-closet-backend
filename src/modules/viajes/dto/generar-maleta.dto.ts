import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max } from 'class-validator';

export class GenerarMaletaDto {
  @ApiProperty({
    description:
      'Cantidad de outfits a generar (si no se especifica, se calcula automáticamente por duración)',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  cantidadOutfits?: number;

  @ApiProperty({
    description: 'Categoría de outfits a priorizar',
    enum: ['casual', 'formal', 'deporte', 'elegante', 'todos'],
    example: 'casual',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoriaPrioridad?: string;

  @ApiProperty({
    description: 'Notas adicionales para personalizar la maleta',
    example: 'Me gustaría más opciones casuales',
    required: false,
  })
  @IsOptional()
  @IsString()
  notas?: string;
}