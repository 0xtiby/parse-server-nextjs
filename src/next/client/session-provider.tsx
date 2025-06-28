import React, { createContext, useEffect, useState, useCallback } from "react";
import { Session } from "../core/types";
import { useAuth } from "./use-auth";
import { AuthResponse } from "../core/auth";

type SessionContextType = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

export const SessionContext = createContext<SessionContextType>({
  data: null,
  status: "loading",
  refresh: async () => {},
  setSession: () => {},
  clearSession: () => {},
});

const POLLING_INTERVAL = 10 * 1000;
const BROADCAST_CHANNEL_KEY = "auth-session-sync";

export function SessionProvider({
  children,
  refreshInterval = POLLING_INTERVAL,
}: {
  children: React.ReactNode;
  refreshInterval?: number;
}) {
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">(
    "loading"
  );
  const { getSession } = useAuth();

  const fetchSession = useCallback(async () => {
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

      const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);
      broadcast.postMessage({ type: "session-update", session, status: "authenticated" });
      broadcast.close();
    } catch (error) {
      setSessionData(null);
      setStatus("unauthenticated");

      const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);
      broadcast.postMessage({
        type: "session-update",
        session: null,
        status: "unauthenticated",
      });
      broadcast.close();
    }
  }, [getSession]);

  useEffect(() => {
    const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);

    broadcast.onmessage = (event) => {
      if (event.data.type === "session-update") {
        setSessionData(event.data.session);
        setStatus(event.data.status);
      }
    };

    const intervalId = setInterval(fetchSession, refreshInterval);

    fetchSession();

    return () => {
      clearInterval(intervalId);
      broadcast.close();
    };
  }, [fetchSession]);

  const setSession = useCallback((session: Session) => {
    setSessionData(session);
    setStatus("authenticated");

    const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);
    broadcast.postMessage({
      type: "session-update",
      session,
      status: "authenticated",
    });
    broadcast.close();
  }, []);

  const clearSession = useCallback(() => {
    setSessionData(null);
    setStatus("unauthenticated");
  }, []);

  return (
    <SessionContext.Provider
      value={{
        data: sessionData,
        status,
        refresh: fetchSession,
        setSession,
        clearSession,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}
