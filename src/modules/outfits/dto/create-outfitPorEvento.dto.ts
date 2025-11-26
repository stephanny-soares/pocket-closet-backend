import { IsString, IsOptional } from 'class-validator';

export class CreateOutfitPorEventoDto {
  @IsString()
  evento: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  estacion?: string;
}
