import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  /** Issued-at, seconds since epoch — set by jsonwebtoken on sign. */
  iat?: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  /**
   * A signature check alone would keep a token valid for its full lifetime. The
   * lookup is what lets a password reset sign the account out everywhere, and
   * stops a deactivated account from carrying on with a token it already had.
   */
  async validate(payload: JwtPayload) {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true, passwordChangedAt: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }

    // iat has one-second resolution, so compare in whole seconds: a token signed
    // in the same second as the change (i.e. the login right after it) survives.
    if (
      user.passwordChangedAt &&
      (payload.iat === undefined || payload.iat < Math.floor(user.passwordChangedAt.getTime() / 1000))
    ) {
      throw new UnauthorizedException('Your password was changed. Please log in again.');
    }

    return { userId: payload.sub, email: payload.email, role: payload.role };
  }
}
