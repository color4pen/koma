import { describe, it, expect } from 'vitest';
import { createUser, updateUser } from './user.js';

describe('createUser', () => {
  it('constructs a user with required fields', () => {
    const user = createUser({
      email: 'owner@example.com',
      passwordHash: 'hashed',
      role: 'owner',
    });
    expect(user.email).toBe('owner@example.com');
    expect(user.passwordHash).toBe('hashed');
    expect(user.role).toBe('owner');
  });

  it('auto-generates id when omitted', () => {
    const user = createUser({
      email: 'staff@example.com',
      passwordHash: 'hashed',
      role: 'staff',
    });
    expect(user.id).toBeTruthy();
  });

  it('throws when email is empty string', () => {
    expect(() =>
      createUser({ email: '', passwordHash: 'hashed', role: 'owner' }),
    ).toThrow();
  });

  it('throws when email is whitespace only', () => {
    expect(() =>
      createUser({ email: '   ', passwordHash: 'hashed', role: 'owner' }),
    ).toThrow();
  });

  it('holds passwordHash and role', () => {
    const user = createUser({
      email: 'user@example.com',
      passwordHash: 'secretHash',
      role: 'staff',
    });
    expect(user.passwordHash).toBe('secretHash');
    expect(user.role).toBe('staff');
  });

  it('returns a frozen object', () => {
    const user = createUser({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'owner',
    });
    expect(Object.isFrozen(user)).toBe(true);
  });
});

describe('updateUser', () => {
  it('returns a new instance and leaves original unchanged', () => {
    const original = createUser({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'staff',
    });
    const updated = updateUser(original, { role: 'owner' });
    expect(updated).not.toBe(original);
    expect(original.role).toBe('staff');
    expect(updated.role).toBe('owner');
  });

  it('preserves id', () => {
    const original = createUser({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'staff',
    });
    const updated = updateUser(original, { email: 'new@example.com' });
    expect(updated.id).toBe(original.id);
  });

  it('throws when email is updated to empty string', () => {
    const original = createUser({
      email: 'user@example.com',
      passwordHash: 'hashed',
      role: 'staff',
    });
    expect(() => updateUser(original, { email: '' })).toThrow();
  });
});
