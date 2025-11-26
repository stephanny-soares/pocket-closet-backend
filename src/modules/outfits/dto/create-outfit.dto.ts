import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';

export class CreateOutfitDto {
  @IsString()
  nombre: string; // Ej: "Outfit casual viernes"

  @IsOptional()
  @IsString()
  imagen?: string; // URL o base64 - Foto del outfit (opcional)

  @IsOptional()
  @IsString()
  categoria?: string; // casual, formal, deporte, etc.

  @IsOptional()
  @IsString()
  estacion?: string; // verano, invierno, primavera, otoño

  @IsArray()
  @IsUUID('4', { each: true })
  prendasIds: string[]; // IDs de las prendas que conforman el outfit
}
