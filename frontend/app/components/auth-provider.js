"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { clearStoredAuth, getApiBase, getStoredAuth, storeAuth } from "../lib/reos-client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getStoredAuth());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (loading) return;
    if (pathname?.startsWith("/app") && !auth?.token) {
      router.replace("/login");
    }
  }, [auth, loading, pathname, router]);

  const value = useMemo(
    () => ({
      auth,
      loading,
      setAuth(nextAuth) {
        storeAuth(nextAuth);
        setAuth(nextAuth);
      },
      async logout() {
        const current = getStoredAuth();
        if (current?.token) {
          try {
            await fetch(`${getApiBase()}/auth/logout`, {
              method: "POST",
              headers: { Authorization: `Bearer ${current.token}` },
            });
          } catch {
            // Best effort logout is enough here; local cleanup still proceeds.
          }
        }
        clearStoredAuth();
        setAuth(null);
        router.push("/login");
      },
    }),
    [auth, loading, router]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return value;
}
