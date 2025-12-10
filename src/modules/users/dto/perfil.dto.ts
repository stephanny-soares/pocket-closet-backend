import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class PerfilDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  id: string;

  @ApiProperty({
    example: 'Juan Pérez',
  })
  userName: string;

  @ApiProperty({
    example: 'juan@example.com',
  })
  email: string;

  @ApiProperty({
    example: 'Alicante',
    required: false,
  })
  @IsOptional()
  @IsString()
  ciudad?: string;

  @ApiProperty({
    example: '2025-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Foto de perfil',
    required: false,
  })
  @IsOptional()
  avatar?: string | null;
}