export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin";
  created_at: string;
  email_verified_at: string | null;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type LoginResponse = {
  message: string;
  user: User;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type RegisterResponse = {
  message: string;
  verificationEmailSent: boolean;
};
