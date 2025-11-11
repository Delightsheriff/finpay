import {
  Body,
  Controller,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ExchangeRateService } from './exchange-rate.service';
import { ConvertDto, RateQueryDto } from './dto/exchange-rate.dto';
import { Currency } from '@prisma/client';

@Controller('exchange-rate')
export class ExchangeRateController {
  constructor(private readonly exchangeRateService: ExchangeRateService) {}

  /**
   * Get all available NGN exchange rates
   */
  @Get()
  async getAllRates() {
    const rates = await this.exchangeRateService.getAllRates();
    return { success: true, data: rates };
  }

  /**
   * Get exchange rate for a specific target currency
   */
  @Get(':to')
  async getRate(
    @Param('to', new ParseEnumPipe(Currency)) to: Currency,
    @Query() query?: RateQueryDto,
  ) {
    const from = query?.from ?? Currency.NGN;
    const rate = await this.exchangeRateService.getRate(from, to);
    return { success: true, data: rate };
  }

  /**
   * Perform a currency conversion securely on backend
   */
  @Post('convert')
  async convert(@Body() convertDto: ConvertDto) {
    const from = convertDto.from ?? Currency.NGN;
    const exchangeRate = await this.exchangeRateService.getRate(
      from,
      convertDto.to,
    );

    const conversion = this.exchangeRateService.calculateConversion(
      convertDto.amount,
      exchangeRate,
    );

    return {
      success: true,
      data: {
        conversion,
        rate: exchangeRate,
      },
    };
  }
}
