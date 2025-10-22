import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConsoleLogger, Logger, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // Define the port — fallback to 3000 if not set in environment
  const port = process.env.PORT ?? 3000;

  // Create a new NestJS application instance using AppModule
  // and attach a custom ConsoleLogger with prefix and timestamps
  const app = await NestFactory.create(AppModule, {
    logger: new ConsoleLogger('FinPay', { timestamp: true }),
  });

  app.enableCors({
    origin: '*',
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, //strips unknown properties
      forbidNonWhitelisted: true, // throws error if extra fields are sent
      transform: true,
    }),
  );

  // Set a global prefix for all routes (e.g. /api/v1/users)
  app.setGlobalPrefix('api/v1');

  // Start the server and listen on the defined port
  await app.listen(port);

  // Log a friendly startup message with details
  Logger.log(`🚀 Server started successfully on port ${port}`, 'Bootstrap');
  Logger.log(
    `🌐 API available at: http://localhost:${port}/api/v1`,
    'Bootstrap',
  );
}

// Catch and handle unexpected startup errors gracefully
bootstrap().catch((err) => {
  Logger.error('❌ Error during application bootstrap:', err);
  process.exit(1);
});
