import { UserRole } from '../../generated/prisma/client';
import { UserStatus } from 'src/common/enums/status.enum';

export interface UserProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole
  status: UserStatus;
}
