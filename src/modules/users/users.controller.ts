import { Controller, Get, Body, UseGuards, HttpStatus, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActiveUser } from '../auth/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { UserMapper } from './mappers/user.mapper';
import { UserRole } from 'src/generated/prisma/enums';
import { UserProfileResponse } from './dtos/user-profileResponse.dto';

@ApiTags('Users')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private readonly userMapper: UserMapper,
  ) {}

  @Get('me')
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      'Returns the profile of the currently authenticated user, identified from the Bearer access token. ' +
      'Sensitive fields such as the password hash are never included in the response.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved user profile.',
    schema: {
      example: {
        user: {
          id: 'uuid',
          firstName: 'John',
          lastName: 'Doe',
          email: 'user@example.com',
          role: UserRole.PATIENT,
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  @ApiResponse({ status: 404, description: 'User associated with this token no longer exists.' })
  async getMe(@ActiveUser() currentUser: ActiveUserData) {
    const user = await this.usersService.findById(currentUser.sub);
    return this.userMapper.toProfileResponse(user);
  }

  @Patch('me')
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      'Updates editable fields (first name, last name, phone number) on the authenticated user\'s profile. ' +
      'Email, role, and status cannot be changed through this endpoint. All fields in the request body are optional — ' +
      'only the fields provided will be updated.',
  })
  @ApiResponse({
    status: 200,
    description: 'The user profile has been successfully updated.',
    schema: {
      example: {
        user: {
          id: 'uuid',
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'user@example.com',
          role: UserRole.PATIENT,
          status: 'ACTIVE',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Validation failed (e.g. invalid phone number format).' })
  @ApiResponse({ status: 401, description: 'Missing, invalid, or expired access token.' })
  async updateUser(
    @ActiveUser() user: ActiveUserData,
    @Body() updateUserDto: UpdateProfileDto,
  ): Promise<UserProfileResponse> {
    const updatedUser = await this.usersService.updateProfile(user.sub, updateUserDto);
    return this.userMapper.toProfileResponse(updatedUser);
  }
}