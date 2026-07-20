import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService, UpdateProfileDto } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { ActiveUser} from '../auth/decorators/current-user.decorator';
import type { ActiveUserData } from '../auth/interfaces/active-user-data.interface';
import { UserMapper } from './mappers/user.mapper';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService, private readonly userMapper: UserMapper) {}

//   @Get('me')
//   @ApiOperation({ summary: 'Get current user profile' })
//   async getMe(@ActiveUser() currentUser: ActiveUserData) {
//     const user = await this.usersService.findById(currentUser.sub);
//     return this.userMapper.toProfileResponse(user);
//   }

  @Put('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateMe(
    @ActiveUser() currentUser: ActiveUserData,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(currentUser.sub, dto);
  }
}