import type { UserRole } from "./user-role.enum";

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  sessionId: string;
  accessTokenId: string;
  refreshTokenId?: string;
}
