import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePerfilDto {
  @ApiProperty({
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Ciudad de residencia',
    example: 'Buenos Aires',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudad?: string;
}