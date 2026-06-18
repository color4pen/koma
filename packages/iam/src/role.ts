export const ALL_PERMISSIONS = [
  'manage-customers',
  'manage-resources',
  'manage-services',
  'manage-bookings',
  'manage-users',
  'manage-settings',
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

export type Role = 'owner' | 'staff';

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: ALL_PERMISSIONS,
  staff: ALL_PERMISSIONS.filter(
    (p) => p !== 'manage-users' && p !== 'manage-settings',
  ),
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}
