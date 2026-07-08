export interface RegisterDto {
  email: string;
  username: string;
  password: string;
}

export interface RegisterCheckDto {
  email: string;
  code: string;
}

export interface LoginDto {
  login: string;
  password: string;
}

export interface UsernameCheckResponse {
  available: boolean;
  reason?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
}

export interface RegisterCheckResponse {
  message: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  message: string;
  userId: string;
  email: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UpdateProfileDto {
  username?: string;
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  sex?: 'male' | 'female' | 'other';
  avatarUrl?: string;
}
