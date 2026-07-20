import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserMapper } from './mappers/user.mapper';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, UserMapper],
  imports: []
})
export class UsersModule {}
