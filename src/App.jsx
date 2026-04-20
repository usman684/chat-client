import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

function App() {
  const socketRef = useRef(null);

  const [user, setUser] = useState(null);
  const [isSignup, setIsSignup] = useState(false);

  const [authData, setAuthData] = useState({
    firstName: "",
    lastName: "",
    room: "",
    password: ""
  });

  const [loginData, setLoginData] = useState({
    name: "",
    room: ""
  });

  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);

  // ================= SOCKET =================
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    const savedRoom = localStorage.getItem("room");

    const socket = io("http://localhost:8080");
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("Connected:", socket.id);

      if (savedRoom) {
        socket.emit("join", savedRoom);
      }
    });

    socket.on("message", (msg) => {
      console.log("RECEIVED:", msg);
      setChat((prev) => [...prev, { ...msg, self: false }]);
    });

    if (savedUser) {
      setUser(savedUser);
      setRoom(savedRoom || "");
      setJoined(!!savedRoom);
    }

    return () => socket.disconnect();
  }, []);

  // ================= SIGNUP =================
  const signup = () => {
    const { firstName, lastName, room, password } = authData;

    if (!firstName || !lastName || !room || !password) {
      return alert("All fields required");
    }

    const users = JSON.parse(localStorage.getItem("users")) || [];

    const exists = users.find(
      (u) =>
        u.firstName === firstName &&
        u.lastName === lastName &&
        u.room === room
    );

    if (exists) return alert("User already exists");

    users.push(authData);
    localStorage.setItem("users", JSON.stringify(users));

    alert("Signup done");
    setIsSignup(false);
  };

  // ================= LOGIN =================
  const login = () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const found = users.find(
      (u) =>
        `${u.firstName} ${u.lastName}` === loginData.name &&
        u.room === loginData.room
    );

    if (!found) return alert("Invalid login");

    const sessionUser = {
      name: `${found.firstName} ${found.lastName}`,
      room: found.room
    };

    setUser(sessionUser);
    localStorage.setItem("user", JSON.stringify(sessionUser));
    localStorage.setItem("room", found.room);
  };

  // ================= JOIN =================
  const joinRoom = () => {
    socketRef.current.emit("join", user.room);

    setRoom(user.room);
    setJoined(true);
  };

  // ================= SEND =================
  const sendMessage = () => {
    if (!message) return;

    const msgData = {
      name: user.name,
      room,
      text: message
    };

    socketRef.current.emit("send", msgData);

    setChat((prev) => [...prev, { ...msgData, self: true }]);
    setMessage("");
  };

  // ================= LEAVE =================
  const leaveRoom = () => {
    socketRef.current.emit("leave", room);

    setJoined(false);
    setRoom("");
    setChat([]);
  };

  const logout = () => {
    socketRef.current.emit("leave", room);

    setUser(null);
    setJoined(false);
    setRoom("");
    setChat([]);

    localStorage.removeItem("user");
    localStorage.removeItem("room");
  };

  // ================= UI =================
  if (!user) {
    return (
      <div className="container">
        <div className="card">
          <h2>{isSignup ? "Signup" : "Login"}</h2>

          {isSignup ? (
            <>
              <input
                placeholder="First Name"
                value={authData.firstName}
                onChange={(e) =>
                  setAuthData({ ...authData, firstName: e.target.value })
                }
              />
              <input
                placeholder="Last Name"
                value={authData.lastName}
                onChange={(e) =>
                  setAuthData({ ...authData, lastName: e.target.value })
                }
              />
              <input
                placeholder="Room ID"
                value={authData.room}
                onChange={(e) =>
                  setAuthData({ ...authData, room: e.target.value })
                }
              />
              <input
                type="password"
                placeholder="Password"
                value={authData.password}
                onChange={(e) =>
                  setAuthData({ ...authData, password: e.target.value })
                }
              />
              <button onClick={signup}>Signup</button>
            </>
          ) : (
            <>
              <input
                placeholder="Full Name"
                value={loginData.name}
                onChange={(e) =>
                  setLoginData({ ...loginData, name: e.target.value })
                }
              />
              <input
                placeholder="Room ID"
                value={loginData.room}
                onChange={(e) =>
                  setLoginData({ ...loginData, room: e.target.value })
                }
              />
              <button onClick={login}>Login</button>
            </>
          )}

          <p onClick={() => setIsSignup(!isSignup)} style={{ color: "blue", cursor: "pointer" }}>
            Toggle
          </p>
        </div>
      </div>
    );
  }

  if (!joined) {
    return (
      <div className="container">
        <div className="card">
          <h2>Join Room</h2>
          <button onClick={joinRoom}>Join {user.room}</button>
          <button onClick={logout} style={{ background: "red" }}>
            Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">

        <h2>Chat Room</h2>

        <div className="chat-box">
          {chat.map((msg, i) => (
            <div key={i} className={msg.self ? "self" : "other"}>
              <b>{msg.name}:</b> {msg.text}
            </div>
          ))}
        </div>

        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <button onClick={sendMessage}>Send</button>
        <button onClick={leaveRoom}>Leave</button>

      </div>
    </div>
  );
}

export default App;