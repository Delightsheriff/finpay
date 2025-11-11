import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Currency } from '@prisma/client';
import { firstValueFrom } from 'rxjs';
import { ENV } from 'src/common/constants/env';
import { ConversionResult, ExchangeRate } from 'src/interfaces/exchangeRate';

@Injectable()
export class ExchangeRateService {
  private readonly logger = new Logger(ExchangeRateService.name);
  private readonly API_KEY = ENV.EXCHANGE_RATE_API_KEY;
  private readonly MARKUP_PERCENTAGE = 3; // 3% markup

  private rateCache = new Map<
    string,
    { rate: ExchangeRate; expiresAt: Date }
  >();
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

  constructor(private readonly httpService: HttpService) {}

  /**
   * Fetch rate from external API
   */
  private async fetchRateFromAPI(
    from: Currency,
    to: Currency,
  ): Promise<number> {
    try {
      const url = `https://api.exchangerate-api.com/v6/${this.API_KEY}/latest/${to}`;
      const response = await firstValueFrom(this.httpService.get(url));
      const rate = response.data.rates[from];

      if (!rate) {
        throw new Error(`Rate not found for ${from} in ${to}'s rate list`);
      }

      this.logger.log(`Fetched rate ${to}→${from}: ${rate}`);
      return rate;
    } catch (error) {
      this.logger.error(`API call failed for ${from}→${to}:`, error.message);
      return this.getFallbackRate(from, to);
    }
  }

  /**
   * Fallback static rates
   */
  private getFallbackRate(from: Currency, to: Currency): number {
    const staticRates: Record<string, number> = {
      'USD-NGN': 1650,
      'GBP-NGN': 2100,
      'EUR-NGN': 1800,
    };

    const key = `${to}-${from}`;
    const rate = staticRates[key];

    if (!rate) {
      throw new Error(`No fallback rate available for ${from}→${to}`);
    }

    this.logger.warn(`Using fallback rate for ${key}: ${rate}`);
    return rate;
  }

  /**
   * Get exchange rate from NGN to target currency
   */
  async getRate(from: Currency, to: Currency): Promise<ExchangeRate> {
    if (from === to) {
      return {
        from,
        to,
        rate: 1,
        markup: 0,
        effectiveRate: 1,
        timestamp: new Date(),
      };
    }

    if (from !== Currency.NGN) {
      throw new Error('Conversions are only supported from NGN');
    }

    const cacheKey = `${from}-${to}`;
    const cached = this.rateCache.get(cacheKey);

    if (cached && cached.expiresAt > new Date()) {
      this.logger.debug(`Using cached rate for ${cacheKey}`);
      return cached.rate;
    }

    try {
      const rate = await this.fetchRateFromAPI(from, to);
      const markup = rate * (this.MARKUP_PERCENTAGE / 100);
      const effectiveRate = rate + markup;

      const exchangeRate: ExchangeRate = {
        from,
        to,
        rate,
        markup,
        effectiveRate,
        timestamp: new Date(),
      };

      this.rateCache.set(cacheKey, {
        rate: exchangeRate,
        expiresAt: new Date(Date.now() + this.CACHE_DURATION_MS),
      });

      return exchangeRate;
    } catch (error) {
      this.logger.error(`Failed to fetch exchange rate ${from}→${to}:`, error);
      throw error;
    }
  }

  /**
   * Get all available rates from NGN
   */
  async getAllRates(): Promise<ExchangeRate[]> {
    const targetCurrencies: Currency[] = [
      Currency.USD,
      Currency.GBP,
      Currency.EUR,
    ];

    const rates = await Promise.all(
      targetCurrencies.map((to) => this.getRate(Currency.NGN, to)),
    );

    return rates;
  }

  /**
   * Calculate conversion - THIS IS THE SECURE CALCULATION
   * Always call this on the backend, never trust frontend calculations
   */
  calculateConversion(
    sourceAmount: number,
    exchangeRate: ExchangeRate,
  ): ConversionResult {
    const targetAmount = sourceAmount / exchangeRate.effectiveRate;
    const cleanAmount = sourceAmount / exchangeRate.rate;
    const feeInTargetCurrency = cleanAmount - targetAmount;
    const feeInSourceCurrency = sourceAmount - targetAmount * exchangeRate.rate;

    return {
      sourceAmount: Number(sourceAmount.toFixed(2)),
      targetAmount: Number(targetAmount.toFixed(2)),
      rate: Number(exchangeRate.effectiveRate.toFixed(2)),
      fee: Number(feeInSourceCurrency.toFixed(2)),
      markup: Number(exchangeRate.markup.toFixed(2)),
    };
  }
}
