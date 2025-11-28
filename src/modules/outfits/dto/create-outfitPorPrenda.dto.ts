import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateOutfitPorPrendaDto {
  @IsUUID('4')
  prendaId: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  estacion?: string;

  @IsOptional()
  @IsUUID('4')
  eventoId?: string;
}
