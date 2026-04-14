import { IsString, IsNumber, IsOptional, IsIn, Min, Max } from 'class-validator';

export class CreatePurchaseDto {
  @IsString()
  weddingId: string;

  @IsOptional()
  @IsIn(['pix', 'credit_card'])
  paymentMethod?: 'pix' | 'credit_card';

  // Credit card fields
  @IsOptional()
  @IsString()
  cardToken?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  installments?: number;

  @IsOptional()
  @IsString()
  paymentMethodId?: string; // visa, master, elo, etc.

  @IsOptional()
  @IsString()
  payerCpf?: string;
}
