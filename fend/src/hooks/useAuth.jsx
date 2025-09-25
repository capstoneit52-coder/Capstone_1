import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/api";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    api.get("/api/user", { skip401Handler: true })
      .then(res => mounted && setUser(res.data))
      .catch(() => mounted && setUser(null))
      .finally(() => mounted && setAuthLoading(false));

    return () => { mounted = false };
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, authLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
