//import 'dotenv/config';
import { ConfigService } from '@nestjs/config';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('📌 API Key:', process.env.GOOGLE_API_KEY);
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*', // Allow React frontend
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
    credentials: true,
  });
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`🚀 Server is running on http://localhost:${port}`);
}
bootstrap();
