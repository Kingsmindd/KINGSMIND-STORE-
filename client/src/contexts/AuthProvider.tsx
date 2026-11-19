import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./AuthContext";
import type { LoginInput, User } from "../types/auth.types";
import {
  getCurrentAccount,
  loginAccount,
  logoutAccount,
  changePasswordAccount,
  type ChangePasswordInput,
  updateAccountName,
} from "../services/auth.service";
import { SESSION_EXPIRED_EVENT } from "../services/api.client";

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function restoreSession() {
      try {
        const account = await getCurrentAccount(controller.signal);

        if (!controller.signal.aborted) {
          setUser(account);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Your session could not be checked. Try signing in.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void restoreSession();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user) return;

    function handleSessionExpired() {
      setUser(null);
      setError("Your session has expired. Please sign in again.");
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [user]);
  async function login(input: LoginInput) {
    setError(null);
    const account = await loginAccount(input);
    setUser(account);
  }

  async function changePassword(input: ChangePasswordInput) {
    await changePasswordAccount(input);

    setError(null);
  }

  async function updateName(name: string) {
    const { user: updatedUser } = await updateAccountName(name);
    setUser(updatedUser);
  }

  async function refreshAccount() {
    const account = await getCurrentAccount();
    setUser(account);
  }

  async function logout() {
    await logoutAccount();
    setUser(null);
    setError(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        logout,
        changePassword,
        updateName,
        refreshAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
