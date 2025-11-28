import { IsString, IsOptional, IsDateString } from 'class-validator';

export class CreateEventoDto {
  @IsString()
  nombre: string;

  @IsDateString()
  fecha: string; // Formato: YYYY-MM-DD

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  tipo?: string; // "boda", "cumpleaños", "trabajo", "casual", etc.

  @IsOptional()
  @IsString()
  ubicacion?: string; // "salón", "jardín", "playa", "restaurante"

  @IsOptional()
  @IsString()
  ciudad?: string; // "Buenos Aires", "Madrid", "Alicante"
}
