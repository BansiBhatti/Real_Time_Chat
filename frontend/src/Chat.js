import { useEffect, useRef, useState, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { API } from './API';


const timeOf = (d) =>
  new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export default function Chat({ user, onLogout, onAddUser }) {

  const [editing, setEditing] = useState(null);
  const [menuId, setMenuId] = useState(null);
  const authHeader = { headers: { Authorization: "Bearer " + user.token } };

  const [users, setUsers] = useState([]);
  const [selected, setSelected] = useState(null); // kon sathe chat khuli chhe
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [unread, setUnread] = useState({}); // { userId: count }

  const socketRef = useRef(null);
  const selectedRef = useRef(null); // socket handler ma latest selected user mate
  const usersRef = useRef([]);
  const bottomRef = useRef(null);
  const typingTimer = useRef(null);


  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    usersRef.current = users;
  }, [users]);

  // 1. Users ni list (API thi)
  const loadUsers = useCallback(async (retry = 2) => {
    try {
      const res = await axios.get(API + "/users", {
        headers: { Authorization: "Bearer " + user.token },
      })
      setUsers(res.data);

      const counts = {};
      res.data.forEach((u) => {
        // je chat khuli chhe teno count 0 rakho
        counts[u._id] = selectedRef.current?._id === u._id ? 0 : u.unreadCount || 0;
      });
      setUnread(counts);

    } catch (e) {
      if (e.response?.status === 401) {
        onLogout();
      } else if (retry > 0) {
        setTimeout(() => loadUsers(retry - 1), 3000);
      } else {
        console.log("Doesn't load Users:", e.message);
      }
    }
  }, [user.token, onLogout]);

  const loadMessages = async (id) => {
    try {
      const { data } = await axios.get(API + "/messages/" + id, {
        headers: { Authorization: "Bearer " + user.token },
      });
      if (selectedRef.current?._id === id) setMessages(data);   // biji chat khuli hoy to overwrite na karo
    } catch (err) {
      console.log(err.response?.data?.message || err.message);
    }
  };

  const markRead = (id) =>
    axios
      .put(API + "/messages/read/" + id, {}, { headers: { Authorization: "Bearer " + user.token } })
      .catch(() => { });
  // 1.

  // 2. Socket connect (token sathe) ane events sambhalvi
  useEffect(() => {
    const socket = io(API, { auth: { token: user.token } });
    socketRef.current = socket;

    socket.on("connect", () => {
      loadUsers();                            // 1. reconnect thay tyare list taaji
      if (selectedRef.current) loadMessages(selectedRef.current._id);
    });

    socket.on("connect_error", (err) => {
      if (err.message === "Invalid Token") onLogout();
    });

    socket.on("getMessage", (m) => {
      const isOpen = selectedRef.current?._id === m.senderId;

      if (isOpen) {
        setMessages((prev) => [...prev, m]);
        markRead(m.senderId);
      } else {
        setUnread((prev) => ({ ...prev, [m.senderId]: (prev[m.senderId] || 0) + 1 }));
      }

      if (usersRef.current.some((u) => u._id === m.senderId)) {
        updateLast(m.senderId, m);   // user list ma chhe -> seedhu update
      } else {
        loadUsers();                 // navo user -> list pharithi lavo
      }
    });

    socket.on("messageEdited", (m) => patchMessage(m));

    socket.on("messageDeleted", (m) => patchMessage(m));

    socket.on("typing", ({ senderId }) => {
      if (selectedRef.current && selectedRef.current._id === senderId) {
        setTyping(true);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 1200);
      }
    });

    return () => socket.disconnect();
  }, [user.token, loadUsers, loadMessages, markRead, onLogout]);

  // 3. Navo message aave to niche scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // Koi user par click -> teni chat kholo + old messages lavo (API thi)
  const openChat = async (u) => {
    selectedRef.current = u;
    setSelected(u);
    setMessages([]);
    setTyping(false);
    setEditing(null);
    setMenuId(null);
    setUnread((prev) => ({ ...prev, [u._id]: 0 }));
    markRead(u._id);

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
  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !selected) return;
    if (!socketRef.current?.connected) return;

    if (editing) {
      try {
        const { data } = await axios.put(
          API + "/messages/" + editing._id,
          { text },
          authHeader
        );
        patchMessage(data);
      } catch (err) {
        console.log(err.response?.data?.message || err.message);
      }
      cancelEdit();
      return;
    }

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

  const patchMessage = (m) => {
    setMessages((prev) => prev.map((x) => (x._id === m._id ? m : x)));
    setUsers((prev) =>
      prev.map((u) => (u.lastMessage?._id === m._id ? { ...u, lastMessage: m } : u))
    );
  };

  const startEdit = (m) => {
    setEditing(m);
    setText(m.text);
    setMenuId(null);
  };

  const cancelEdit = () => {
    setEditing(null);
    setText("");
  };

  const removeMsg = async (m) => {
    setMenuId(null);
    if (!window.confirm("Delete this message?")) return;
    try {
      const { data } = await axios.delete(API + "/messages/" + m._id, authHeader);
      patchMessage(data);
    } catch (e) {
      console.log(e.response?.data?.message || e.message);
    }
  };



  useEffect(() => {
    if (selected && messages.length > 0) {
      updateLast(selected._id, messages[messages.length - 1]);
    }
  }, [messages, selected]);

  return (
    <div className={"app" + (selected ? " chat-open" : "")}>
      {/* LEFT: users list */}
      <aside className="sidebar">

        <header className="bar">
          <div className="me">
            <div className="avatar">{user.name?.[0]?.toUpperCase()}</div>
            <span>{user.name}</span>
          </div>
          <div className="actions">
            <button className="link-btn" onClick={onAddUser}>+</button>
            <button className="link-btn" onClick={onLogout}>Logout</button>
          </div>
        </header>

        <div className="user-list">
          {users.length === 0 && <p className="empty">No Users</p>}
          {users.map((u) => {
            const count = unread[u._id] || 0;
            const last = u.lastMessage;

            return (
              <div
                key={u._id}
                className={"user-row" + (selected?._id === u._id ? " active" : "")}
                onClick={() => openChat(u)}
              >
                <div className="avatar">{u.name?.[0]?.toUpperCase()}</div>

                <div className="user-info">

                  <strong>{u.name}</strong>

                  <div className="row-bottom">
                    <small className={"last-msg" + (count > 0 ? " unread" : "")}>
                      {last ? last.deleted ? "Message deleted" : (last.senderId === user._id ? "You: " : "") + last.text : ""}
                    </small>
                    {count > 0 && <span className="badge">{count}</span>}
                  </div>
                </div>
              </div>
            )

          })}
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
              {messages.map((m) => {
                const mine = String(m.senderId) === String(user._id);
                return (
                  <div
                    key={m._id}
                    className={"bubble relative " + (mine ? "mine" : "theirs")}
                    onClick={() => mine && !m.deleted && setMenuId(menuId === m._id ? null : m._id)}
                  >
                    <span className={m.deleted ? "italic opacity-60" : ""}>
                      {m.deleted ? "This message was deleted" : m.text}
                    </span>
                    <small>
                      {m.edited && !m.deleted ? "edited " : ""}
                      {timeOf(m.createdAt)}
                    </small>

                    {menuId === m._id && (
                      <div className="flex gap-1.5 mt-1.5">
                        <button
                          type="button"
                          className="text-xs px-2.5 py-0.5 rounded-lg cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); startEdit(m); }}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="text-xs px-2.5 py-0.5 rounded-lg cursor-pointer"
                          onClick={(e) => { e.stopPropagation(); removeMsg(m); }}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            {editing && (
              <div className="flex justify-between items-center px-3.5 py-1.5 text-[13px] bg-white/50">
                <span>Editing message</span>
                <button type="button" className="cursor-pointer" onClick={cancelEdit}>✕</button>
              </div>
            )}

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