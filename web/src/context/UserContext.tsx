import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export const USERS = ["Alice", "Bob", "Carol"] as const;

type UserContextValue = {
  userName: string;
  setUserName: (name: string) => void;
};

const UserContext = createContext<UserContextValue | null>(null);

const STORAGE_KEY = "cleen-acting-as";

export function UserProvider({ children }: { children: ReactNode }) {
  const [userName, setUserNameState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) ?? USERS[0];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, userName);
  }, [userName]);

  function setUserName(name: string) {
    setUserNameState(name);
  }

  return (
    <UserContext.Provider value={{ userName, setUserName }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) {
    throw new Error("useUser must be used within UserProvider");
  }
  return ctx;
}
