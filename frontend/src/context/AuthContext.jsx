import { createContext, useContext, useEffect, useReducer, useCallback } from "react";
import axios from "axios";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "../lib/firebase";

const AuthContext = createContext(null);

const initialState = {
  user: null,
  accessToken: null,
  loading: true, // true while attempting initial session restore
};

function authReducer(state, action) {
  switch (action.type) {
    case "SET_AUTH":
      window.__wealthos_access_token__ = action.payload.accessToken;
      return { ...state, user: action.payload.user, accessToken: action.payload.accessToken, loading: false };
    case "CLEAR_AUTH":
      window.__wealthos_access_token__ = null;
      return { user: null, accessToken: null, loading: false };
    case "DONE_LOADING":
      return { ...state, loading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Attempt to restore session on mount via refresh token cookie
  useEffect(() => {
    axios
      .post("/api/auth/refresh", {}, { withCredentials: true })
      .then(({ data }) => {
        dispatch({ type: "SET_AUTH", payload: data });
      })
      .catch(() => {
        dispatch({ type: "DONE_LOADING" });
      });
  }, []);

  const register = useCallback(async (name, email, password) => {
    const { data } = await axios.post(
      "/api/auth/register",
      { name, email, password },
      { withCredentials: true }
    );
    dispatch({ type: "SET_AUTH", payload: data });
    return data.user;
  }, []);

  const login = useCallback(async (email, password) => {
    const { data } = await axios.post(
      "/api/auth/login",
      { email, password },
      { withCredentials: true }
    );
    dispatch({ type: "SET_AUTH", payload: data });
    return data.user;
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const idToken = await result.user.getIdToken();

    const { data } = await axios.post(
      "/api/auth/google",
      { idToken },
      { withCredentials: true }
    );
    dispatch({ type: "SET_AUTH", payload: data });
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await axios.post("/api/auth/logout", {}, { withCredentials: true }).catch(() => {});
    dispatch({ type: "CLEAR_AUTH" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        accessToken: state.accessToken,
        loading: state.loading,
        register,
        login,
        loginWithGoogle,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
