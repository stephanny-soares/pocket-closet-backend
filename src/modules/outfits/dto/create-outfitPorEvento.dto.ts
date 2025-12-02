import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateOutfitPorEventoDto {
  @IsUUID('4')
  eventoId: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  estacion?: string;
}
