import { useState } from "react";
import Auth from "./Auth";
import Chat from "./Chat";

export default function App() {
  // refresh kare to pan login yaad rahe (localStorage ma)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("chatUser");
    return saved ? JSON.parse(saved) : null;
  });

  const handleLogin = (data) => {
    localStorage.setItem("chatUser", JSON.stringify(data));
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
  };

  return user ? (
    <Chat user={user} onLogout={handleLogout} />
  ) : (
    <Auth onLogin={handleLogin} />
  );
}