export interface User {
  userId: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: 'male' | 'female' | 'other';
  avatarUrl?: string;
  verified: boolean;
  createdAt: string;
}
