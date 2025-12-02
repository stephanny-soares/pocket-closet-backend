import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateOutfitPorClimaDto {
  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsNumber()
  temperatura?: number;
}
