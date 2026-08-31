import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({
    summary: 'Get a welcome message',
    description:
      'This endpoint returns a welcome message for the Medipoint API. It serves as a basic health check and confirmation that the API is running.',
  })
  @ApiResponse({
    status: 200,
    description: 'The welcome message has been successfully retrieved.',
    schema: { example: 'Welcome to the Medipoint API!' },
  })
  @ApiResponse({
    status: 500,
    description:
      'Internal server error. The server encountered an unexpected condition that prevented it from fulfilling the request.',
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
