import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ActiveUserData } from '../interfaces/active-user-data.interface';
import { REQUEST_USER_KEY } from '../constants/auth.constant';

export interface CurrentUser {
  id: string;
  email: string;
}

export const extractUserData = (request): CurrentUser => {
  const user = request[REQUEST_USER_KEY];

  return {
    id: user.sub,
    email: user.email,
  };
}
export const ActiveUser = createParamDecorator(
  (field: keyof ActiveUserData | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: ActiveUserData = request[REQUEST_USER_KEY];
    return field ? user?.[field] : user;
  },
);
