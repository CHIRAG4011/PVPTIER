import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useGetMe, setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";

// Support external API URL for Vercel / separate deployments
const apiUrl = import.meta.env.VITE_API_URL;
if (apiUrl) setBaseUrl(apiUrl);

// Setup custom-fetch to use our token
setAuthTokenGetter(() => localStorage.getItem("pvp_token"));

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setToken: (token: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(localStorage.getItem("pvp_token"));
  const { data: user, isLoading, error, refetch } = useGetMe({
    query: {
      queryKey: ["me"],
      enabled: !!token,
      retry: false
    }
  });

  const setToken = (newToken: string) => {
    localStorage.setItem("pvp_token", newToken);
    setTokenState(newToken);
    refetch();
  };

  const logout = () => {
    localStorage.removeItem("pvp_token");
    setTokenState(null);
    window.location.href = "/";
  };

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        isAuthenticated: !!user,
        setToken,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
