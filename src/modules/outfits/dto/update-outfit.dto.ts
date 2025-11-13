import { IsString, IsOptional, IsArray, IsUUID } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateOutfitDto } from './create-outfit.dto';

export class UpdateOutfitDto extends PartialType(CreateOutfitDto) {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  imagen?: string;

  @IsOptional()
  @IsString()
  categoria?: string;

  @IsOptional()
  @IsString()
  estacion?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  prendasIds?: string[];
}