import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsInt, IsString, Min } from 'class-validator';

export class UpdateMaletaOutfitDto {
  @ApiProperty({
    description: 'Marcar como empacado',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  empacado?: boolean;

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
    example: 'Llevar en la maleta de mano',
    required: false,
  })
  @IsOptional()
  @IsString()
  notas?: string;
}