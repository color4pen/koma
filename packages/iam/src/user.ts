import { type Id, createId } from '@koma/shared';
import { type Role } from './role.js';

export type User = {
  readonly id: Id<'User'>;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
};

export function createUser(params: {
  id?: Id<'User'>;
  email: string;
  passwordHash: string;
  role: Role;
}): User {
  if (params.email.trim() === '') {
    throw new Error('email must not be empty');
  }

  return Object.freeze({
    id: params.id ?? createId<'User'>(),
    email: params.email,
    passwordHash: params.passwordHash,
    role: params.role,
  });
}

export function updateUser(
  user: User,
  patch: Partial<Pick<User, 'email' | 'passwordHash' | 'role'>>,
): User {
  return createUser({
    id: user.id,
    email: patch.email ?? user.email,
    passwordHash: patch.passwordHash ?? user.passwordHash,
    role: patch.role ?? user.role,
  });
}
