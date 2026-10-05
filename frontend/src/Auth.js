import { useState } from "react";
import "./Auth.css";
import axios from "axios";
import {API} from './API';

export default function Auth({ onLogin, startOnSignup}) {
  const [isLogin, setIsLogin] = useState(!startOnSignup);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMsg("");

    try {
      const { data } = await axios.post(
        API + (isLogin ? "/auth/login" : "/auth/register"),
        form
      );

      if (isLogin && data.token) {
        onLogin(data); // token, _id, name, email
      } else if (!isLogin && data.message === "Account Created Successfully") {
        setIsLogin(true);
      } else {
        setMsg(data.message || "Something is wrong");
      }
    } catch (err) {
      // server e error aapyo hoy (400, 500) to teno message, nahitar connect problem
      setMsg(err.response?.data?.message || "Server sathe connect nathi thatu");
    }
    setLoading(false);
  };


return (
  <div className="auth-page">
    <div className="blob blob1" />
    <div className="blob blob2" />
    <div className="blob blob3" />

    <form className="auth-card" onSubmit={submit}>
      <h2>{isLogin ? "Login" : "Sign up"}</h2>

      {!isLogin && (
        <input name="name" placeholder="Naam" value={form.name} onChange={change} />
      )}
      <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} />
      <input name="password" type="password" placeholder="Password" value={form.password} onChange={change} />

      {msg && <p className="auth-msg">{msg}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Wait..." : isLogin ? "Login" : "Sign up"}
      </button>

      <p className="auth-switch" onClick={() => { setIsLogin(!isLogin); setMsg(""); }}>
        {isLogin ? "Don't have an account? Sign up" : "Already have an account? Login"}
      </p>
    </form>
  </div>
);
}