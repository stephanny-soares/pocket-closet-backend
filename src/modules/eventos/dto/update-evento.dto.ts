import { IsString, IsOptional, IsDateString } from 'class-validator';

export class UpdateEventoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}
