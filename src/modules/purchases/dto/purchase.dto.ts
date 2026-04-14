import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  weddingId: string;
}
