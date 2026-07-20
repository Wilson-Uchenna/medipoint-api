import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { UserProfileResponse } from '../dtos/user-profileResponse.dto';
import { UserStatus } from '../../../common/enums/status.enum';

@Injectable()
export class UserMapper {

    toProfileResponse(user: User): UserProfileResponse {
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
