import { Injectable } from '@nestjs/common';
import { UserRole } from '../../../generated/prisma/client';
import { UserProfileResponse } from '../dtos/user-profileResponse.dto';
import { UserStatus } from '../../../common/enums/status.enum';

type UserForProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: string;
};

@Injectable()
export class UserMapper {

    toProfileResponse(user: UserForProfile): UserProfileResponse {
        return {
            user: {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                email: user.email,
                role: user.role,
                status: user.status as unknown as UserStatus
            }
        }
    }
}