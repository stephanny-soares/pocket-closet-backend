import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdatePreferencesDto {
  @IsOptional()
  @IsString()
  ciudad?: string;

  @IsOptional()
  @IsString()
  entorno?: string;

  @IsOptional()
  @IsArray()
  estilo?: string[];

  @IsOptional()
  @IsArray()
  colores?: string[];
}