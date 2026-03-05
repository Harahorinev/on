export type UserRole = 'USER' | 'COMPANY';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
}
