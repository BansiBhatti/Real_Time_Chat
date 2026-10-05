import { useState } from "react";
import Auth from "./Auth";
import Chat from "./Chat";

export default function App() {
  // refresh kare to pan login yaad rahe (localStorage ma)
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem("chatUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [openSignup, setOpenSignup] = useState(false);

  const handleLogin = (data) => {
    localStorage.setItem("chatUser", JSON.stringify(data));
    setOpenSignup(false);
    setUser(data);
  };

  const handleLogout = () => {
    localStorage.removeItem("chatUser");
    setOpenSignup(false);
    setUser(null);
  };

  // "+ Add user" -> logout karine seedhu Sign up page kholo
  const handleAddUser = () => {
    localStorage.removeItem("chatUser");
    setUser(null);
    setOpenSignup(true);
  };

  return user ? (
    <Chat user={user} onLogout={handleLogout} onAddUser={handleAddUser} />
  ) : (
    <Auth onLogin={handleLogin} startOnSignup={openSignup} />
  );
}