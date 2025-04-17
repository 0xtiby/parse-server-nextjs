"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode } from "react";
import { Session } from "../types";
import { useAuth } from "./use-auth";
import { AuthResponse } from "../auth";

type SessionContextType = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
};

export const SessionContext = createContext<SessionContextType>({
  data: null,
  status: "loading",
});

export function SessionProvider({ children }: { children: ReactNode }) {
  const { getSession } = useAuth();
  const { data: response, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: getSession,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const sessionData = response?.success ? (response as AuthResponse).session : null;
  const status = isLoading
    ? "loading"
    : sessionData
    ? "authenticated"
    : "unauthenticated";

  return (
    <SessionContext.Provider value={{ data: sessionData, status }}>
      {children}
    </SessionContext.Provider>
  );
}
