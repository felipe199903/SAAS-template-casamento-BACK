import {
  IsString,
  IsOptional,
  IsIn,
  IsBoolean,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class CreateWeddingDto {
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  groomName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(80)
  brideName: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;
}

export class UpdatePixDto {
  @IsString()
  pixKey: string;

  @IsIn(['cpf', 'email', 'phone', 'random'])
  pixKeyType: 'cpf' | 'email' | 'phone' | 'random';
}

export class UpdateWeddingDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  groomName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  brideName?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  customData?: object;
}

export class PublishWeddingDto {
  @IsBoolean()
  published: boolean;
}
