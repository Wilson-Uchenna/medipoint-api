import { Controller, Get, Put, Body, UseGuards, HttpStatus, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActiveUser} from '../auth/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { UserMapper } from './mappers/user.mapper';
import { UserRole } from 'src/generated/prisma/enums';
import { UserProfileResponse } from './dtos/user-profileResponse.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private readonly userMapper: UserMapper) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved user profile',
    schema: {
      example: {
        id: 'user-id',
        email: 'user@example.com',
        role: UserRole.PATIENT,
      }
    }
  })
  async getMe(@ActiveUser() currentUser: ActiveUserData) {
    const user = await this.usersService.findById(currentUser.sub);
    return this.userMapper.toProfileResponse(user);
  }

   @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({
    status: 200,
    description: 'The user profile has been successfully updated.',
  })
  @Patch('me')
  async updateUser(
    @ActiveUser() user: ActiveUserData,
    @Body() updateUserDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const updatedUser = await this.usersService.updateProfile(user.sub, updateUserDto);
    return this.userMapper.toProfileResponse(updatedUser);
  }
}