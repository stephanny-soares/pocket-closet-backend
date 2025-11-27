import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEventoDto {
  @IsString()
  nombre: string;

  @IsDateString()
  fecha: string; // Formato: YYYY-MM-DD

  @IsOptional()
  @IsString()
  descripcion?: string;
}
