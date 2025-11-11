import { IsEnum, IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { Currency } from '@prisma/client';

export class ConvertDto {
  @IsNumber()
  @Type(() => Number)
  @Min(0.01, { message: 'Amount must be greater than zero' })
  amount: number;

  @IsEnum(Currency, { message: 'Invalid target currency' })
  @IsNotEmpty()
  to: Currency;

  @IsEnum(Currency, { message: 'Invalid source currency' })
  @IsOptional()
  from?: Currency;
}

export class RateQueryDto {
  @IsEnum(Currency, { message: 'Invalid source currency' })
  @IsOptional()
  from?: Currency;

  @IsEnum(Currency, { message: 'Invalid target currency' })
  @IsNotEmpty()
  to: Currency;
}
