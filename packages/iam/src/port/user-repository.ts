import { type Id } from '@koma/shared';
import { type User } from '../user.js';

export type UserRepository = {
  save(user: User): Promise<void>;
  findById(id: Id<'User'>): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(): Promise<User[]>;
};
