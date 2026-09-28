import { User } from './user.entity';

export function presentUser(u: User) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    bio: u.bio,
    isActive: u.isActive,
    createdAt: u.createdAt,
  };
}
export type UserView = ReturnType<typeof presentUser>;
