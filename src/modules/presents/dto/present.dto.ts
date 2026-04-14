import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';
import { PresentStatus } from '@prisma/client';

export class CreatePresentDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsString()
  imageUrl: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isCustomValue?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minValue?: number;
}

export class UpdatePresentStatusDto {
  @IsEnum(PresentStatus)
  status: PresentStatus;
}
