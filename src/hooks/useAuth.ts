import { useState, useCallback } from "react";
import { API_PATHS } from "../constants";
import { AuthData } from "../types";
import { AuthResponse, ChallengeResponse } from "../auth";

export function useAuth() {
  const [loading, setLoading] = useState<boolean>(true);

  const fetchAuth = async <T>(
    url: string,
    method: "GET" | "POST" = "POST",
    data?: any
  ) => {
    try {
      setLoading(true);

      const options: RequestInit = {
        method,
        headers: {
          "Content-Type": "application/json",
        },
      };

      if (data && method === "POST") {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      const result: T = await response.json();
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      return { success: false, error: { code: 500, message: errorMessage } };
    } finally {
      setLoading(false);
    }
  };

  const signup = useCallback(async (authType: string, data: AuthData) => {
    return fetchAuth<AuthResponse>(API_PATHS.SIGNUP, "POST", { authType, data });
  }, []);

  const login = useCallback(async (authType: string, data: AuthData) => {
    return fetchAuth<AuthResponse>(API_PATHS.SIGNIN, "POST", { authType, data });
  }, []);

  const challenge = useCallback(async <T>(data: unknown) => {
    return fetchAuth<ChallengeResponse<T>>(API_PATHS.CHALLENGE, "POST", { data });
  }, []);

  const logout = useCallback(async () => {
    return fetchAuth<AuthResponse>(API_PATHS.LOGOUT, "POST");
  }, []);

  const getSession = useCallback(async () => {
    return fetchAuth<AuthResponse>(API_PATHS.SESSION, "GET");
  }, []);

  const getOAuthUrl = useCallback((provider: string) => {
    return `${API_PATHS.OAUTH}/${provider}`;
  }, []);

  return {
    loading,
    signup,
    login,
    logout,
    getSession,
    challenge,
    getOAuthUrl,
  };
}
