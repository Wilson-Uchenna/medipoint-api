import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { TokenPayload } from '../interfaces/token.interface';
import { CurrentUser } from '../decorators/current-user.decorator';
import { ActiveUserData } from '../interfaces/active-user-data.interface';

export interface JwtPayload extends TokenPayload {
  iat?: number;
  exp?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || '',
    });
  }

  async validate(payload: TokenPayload): Promise<ActiveUserData> {
  if (!payload || !payload.sub || !payload.email) {
    throw new UnauthorizedException('Invalid token payload');
  }

  const user = await this.prisma.user.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!user || user.status === 'SUSPENDED') {
    throw new UnauthorizedException('User not found or suspended');
  }

  return {
    sub: user.id,
    email: user.email,
    role: user.role, // Include role if needed for further authorization checks
  };
}
}
