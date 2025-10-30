import { StringValue } from 'ms';

interface IENV {
  JWT_SECRET: string;
  JWT_REFRESH_SECRET: string;
  JWT_EXPIRES_IN?: number | StringValue;
  JWT_REFRESH_EXPIRES_IN?: number | StringValue;
}

export const ENV: IENV = {
  JWT_SECRET: process.env.JWT_SECRET!,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN as unknown as StringValue,
  JWT_REFRESH_EXPIRES_IN: process.env
    .JWT_REFRESH_EXPIRES_IN as unknown as StringValue,
};
