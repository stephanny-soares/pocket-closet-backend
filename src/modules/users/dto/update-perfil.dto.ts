import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePerfilDto {
  @ApiProperty({
    type: 'string',
    description: 'Nombre completo del usuario',
    example: 'Juan Pérez',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    type: 'string',
    description: 'Ciudad de residencia',
    example: 'Buenos Aires',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto de perfil (máx 5MB)',
    required: false,
  })
  @IsOptional()
  avatar?: Express.Multer.File;
}