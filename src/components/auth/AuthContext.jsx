import React, { createContext, useContext, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convexClient";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [sessionId, setSessionId] = useState(() =>
    localStorage.getItem("sessionId")
  );
  const user = useQuery(api.auth.me, sessionId ? { sessionId } : "skip");

  // Handle login
  const login = (data) => {
    localStorage.setItem("sessionId", data.sessionId);
    setSessionId(data.sessionId);
  };

  // Handle logout
  const logout = () => {
    localStorage.removeItem("sessionId");
    setSessionId(null);
  };

  const value = {
    user,
    sessionId,
    isAuthenticated: !!sessionId && user !== undefined && user !== null,
    isLoading: sessionId && user === undefined,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default AuthContext;
