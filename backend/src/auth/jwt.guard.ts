import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

export interface AuthenticatedUser {
  id: string;
  email: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header: string | undefined = request.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    try {
      const payload = this.jwt.verify<{ sub: string; email: string }>(header.slice(7));
      request.user = { id: payload.sub, email: payload.email };

      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}
