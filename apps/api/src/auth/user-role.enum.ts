export enum UserRole {
  OWNER = "OWNER",
  SUPER_ADMIN = "SUPER_ADMIN",
  CUSTOMER = "CUSTOMER",
  ADMIN = "ADMIN",
  RIDER = "RIDER",
}

export function isPlatformAdminRole(role: UserRole): boolean {
  return role === UserRole.OWNER || role === UserRole.SUPER_ADMIN;
}

export function isOperationalAdminRole(role: UserRole): boolean {
  return isPlatformAdminRole(role) || role === UserRole.ADMIN;
}
