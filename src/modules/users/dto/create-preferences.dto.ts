import { IsString, IsArray, ArrayNotEmpty, IsNotEmpty } from 'class-validator';

export class CreatePreferencesDto {
  @IsString()
  @IsNotEmpty()
  ciudad: string;

  @IsString()
  @IsNotEmpty()
  entorno: string;

  @IsArray()
  @ArrayNotEmpty()
  estilo: string[];

  @IsArray()
  @ArrayNotEmpty()
  colores: string[];
}