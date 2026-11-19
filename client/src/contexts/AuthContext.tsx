import { createContext } from "react";
import type { LoginInput, User } from "../types/auth.types";
import type { ChangePasswordInput } from "../services/auth.service";

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
  updateName: (name: string) => Promise<void>;
  refreshAccount: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
