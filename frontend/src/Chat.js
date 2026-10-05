import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { API } from './API';


const timeOf = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat({ user, onLogout, onAddUser }) {
  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null); // kon sathe chat khuli chhe
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState({}); // { userId: count }

  const socketRef = useRef(null);
  const selectedRef = useRef(null); // socket handler ma latest selected user mate
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // 1. Users ni list (API thi)
  useEffect(() => {
    axios
      .get(API + "/users", { headers: { Authorization: "Bearer " + user.token } })
      .then((res) => setUsers(res.data))
      .catch(() => onLogout()); // token khotu / expire -> again login
  }, []);

  // 2. Socket connect (token sathe) ane events sambhalvi
  useEffect(() => {
    const socket = io(API, { auth: { token: user.token } });
    socketRef.current = socket;

    socket.on("getMessage", (m) => {
      updateLast(m.senderId, m);

      if (selectedRef.current && selectedRef.current._id === m.senderId) {
        setMessages((prev) => [...prev, m]); // aa j chat khuli chhe
      } else {
        // bija koi no message -> unread badge
        setUnread((prev) => ({ ...prev, [m.senderId]: (prev[m.senderId] || 0) + 1 }));
      }
    });

    socket.on("typing", ({ senderId }) => {
      if (selectedRef.current && selectedRef.current._id === senderId) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1200);
      }
    });

    return () => socket.disconnect();
  }, [user.token]);

  // 3. Navo message aave to niche scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Koi user par click -> teni chat kholo + old messages lavo (API thi)
  const openChat = async (u) => {
    setSelected(u);
    setMessages([]);
    setTyping(false);
    setUnread((prev) => ({ ...prev, [u._id]: 0 }));

    try {
      const { data } = await axios.get(API + "/messages/" + u._id, {
        headers: { Authorization: "Bearer " + user.token },
      });
      setMessages(data);
    } catch (err) {
      console.log(err.response?.data?.message || err.message);
    }
  };

  // Message moklvo (socket thi)
  const send = (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;

    socketRef.current.emit(
      "sendMessage",
      { receiverId: selected._id, text },
      (res) => {
        if (res && res.ok) {
          setMessages((prev) => [...prev, res.message]);
          updateLast(selected._id, res.message)
        }
      }
    );
    setText("");
  };

  const onType = (e) => {
    setText(e.target.value);
    if (selected) socketRef.current.emit("typing", { receiverId: selected._id });
  };

  const updateLast = (userId, message) => {
    setUsers((prev) =>
      prev
        .map((u) => (u._id === userId ? { ...u, lastMessage: message } : u))
        .sort(
          (a, b) =>
            new Date(b.lastMessage?.createdAt || 0) -
            new Date(a.lastMessage?.createdAt || 0)
        )
    );
  };

  return (
    <div className={"app" + (selected ? " chat-open" : "")}>
      {/* LEFT: users list */}
      <aside className="sidebar">
        <header className="bar">
          <div className="me">
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
            <span>{user.name}</span>
          </div>
          <div>
            <button className="link-btn" onClick={onAddUser}>+</button>
            <button className="link-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <div className="user-list">
          {users.length === 0 && <p className="empty">No Users</p>}
          {users.map((u) => (
            <div
              key={u._id}
              className={"user-row" + (selected?._id === u._id ? " active" : "")}
              onClick={() => openChat(u)}
            >
              <div className="avatar">{u.name?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <strong>{u.name}</strong>
                <small>{u.lastMessage?.text}</small>
              </div>
              {unread[u._id] > 0 && <span className="badge">{unread[u._id]}</span>}
            </div>
          ))}
        </div>
      </aside>

      {/* RIGHT: chat window */}
      <main className="chat">
        {!selected ? (
          <div className="placeholder">Please select the chat</div>
        ) : (
          <>
            <header className="bar">
              <button className="back-btn" onClick={() => setSelected(null)}>←</button>
              <div className="avatar">{selected.name?.[0]?.toUpperCase()}</div>
              <div className="user-info">
                <strong>{selected.name}</strong>
                {typing && <small className="typing">Typing...</small>}
              </div>
            </header>

            <div className="messages">
              {messages.map((m) => (
                <div
                  key={m._id}
                  className={"bubble " + (m.senderId === user._id ? "mine" : "theirs")}
                >
                  <span>{m.text}</span>
                  <small>{timeOf(m.createdAt)}</small>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <form className="composer" onSubmit={send}>
              <input
                value={text}
                onChange={onType}
                placeholder="Message"
              />
              <button type="submit">Send</button>
            </form>
          </>
        )}
      </main>
    </div>
  );
}