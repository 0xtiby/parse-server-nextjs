import React, { createContext, useContext, useEffect, useState } from "react";
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

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading"
  );
  const { getSession } = useAuth();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await getSession();
        if (!response.success) {
          throw new Error("invalid response");
        }
        const { session } = response as AuthResponse;

        if (session === null || Object.keys(session).length === 0) {
          throw new Error("invalid session");
        }
        setSessionData(session);
        setStatus("authenticated");
      } catch (error) {
        setSessionData(null);
        setStatus("unauthenticated");
      }
    };

    fetchSession();
  }, [getSession]);
  return (
    <SessionContext.Provider value={{ data: sessionData, status }}>
      {children}
    </SessionContext.Provider>
  );
}
