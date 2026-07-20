import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  console.log('DATABASE_URL:', configService.get('DATABASE_URL'));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )

  const config = new DocumentBuilder()
    .setTitle('MediPoint API')
    .setDescription('MediPoint Healthcare Platform API Documentation')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication endpoints')
    .addTag('Patients', 'Patient management')
    .addTag('Healthcare Professionals', 'Professional management')
    .addTag('Consultations', 'Consultation booking & management')
    .addTag('Consultation Notes', 'Medical documentation')
    .addTag('Payments', 'Payment processing')
    .addTag('Notifications', 'User notifications')
    .addTag('Admin', 'Administration panel')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  // CORS
  app.enableCors({
    origin: configService.get('FRONTEND_URL') || 'http://localhost:3001',
    credentials: true,
  });

  const port = configService.get('PORT') || 3000;
  

  console.log(`🚀 MediPoint API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/docs`);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
