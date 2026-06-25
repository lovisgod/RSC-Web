import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { ACCESS_TOKEN_COOKIE } from "./auth.constants";
import type { AuthenticatedRequest } from "./auth-request";
import { AuthSessionService } from "./auth-session.service";
import { readCookie } from "./cookies";

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly sessions: AuthSessionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException("Authentication required");
    }

    try {
      request.user = await this.sessions.authenticateAccessToken(token);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw new ForbiddenException("Authentication token is expired or invalid");
      }

      throw error;
    }

    return true;
  }

  private extractToken(request: AuthenticatedRequest): string | undefined {
    const authorization = request.headers.authorization;

    if (authorization?.startsWith("Bearer ")) {
      return authorization.slice("Bearer ".length);
    }

    return readCookie(request.headers.cookie, ACCESS_TOKEN_COOKIE);
  }
}
