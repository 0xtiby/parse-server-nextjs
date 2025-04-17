import React, { createContext, useEffect, useState, useCallback } from "react";
import { Session } from "../types";
import { useAuth } from "./use-auth";
import { AuthResponse } from "../auth";

type SessionContextType = {
  data: Session | null;
  status: "loading" | "authenticated" | "unauthenticated";
  refresh: () => Promise<void>;
  setSession: (session: Session) => void;
};

export const SessionContext = createContext<SessionContextType>({
  data: null,
  status: "loading",
  refresh: async () => {},
  setSession: () => {},
});

const POLLING_INTERVAL = 10 * 1000; // 10 seconds
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

      // Broadcast the session update to other tabs
      const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);
      broadcast.postMessage({ type: "session-update", session, status: "authenticated" });
      broadcast.close();
    } catch (error) {
      setSessionData(null);
      setStatus("unauthenticated");

      // Broadcast the session update to other tabs
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
    // Set up broadcast channel for cross-tab communication
    const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);

    // Listen for session updates from other tabs
    broadcast.onmessage = (event) => {
      if (event.data.type === "session-update") {
        setSessionData(event.data.session);
        setStatus(event.data.status);
      }
    };

    // Set up polling interval
    const intervalId = setInterval(fetchSession, refreshInterval);

    // Initial session fetch
    fetchSession();

    // Cleanup
    return () => {
      clearInterval(intervalId);
      broadcast.close();
    };
  }, [fetchSession]);

  const setSession = useCallback((session: Session) => {
    setSessionData(session);
    setStatus("authenticated");

    // Broadcast aux autres onglets
    const broadcast = new BroadcastChannel(BROADCAST_CHANNEL_KEY);
    broadcast.postMessage({
      type: "session-update",
      session,
      status: "authenticated",
    });
    broadcast.close();
  }, []);

  return (
    <SessionContext.Provider
      value={{ data: sessionData, status, refresh: fetchSession, setSession }}
    >
      {children}
    </SessionContext.Provider>
  );
}
