import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";

function App() {
  const [socket, setSocket] = useState(null);

  // AUTH
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

  // CHAT
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState("");
  const [message, setMessage] = useState("");
  const [chat, setChat] = useState([]);
  const [receiver, setReceiver] = useState("");

  // 💾 AUTO LOGIN ON START
  useEffect(() => {
    const savedUser = JSON.parse(localStorage.getItem("user"));
    const savedRoom = localStorage.getItem("room");

    const newSocket = io("http://localhost:8080");
    setSocket(newSocket);

    if (savedUser) {
      setUser(savedUser);

      // auto rejoin room
      if (savedRoom) {
        setRoom(savedRoom);
        setJoined(true);
        newSocket.emit("join", savedRoom);
      }
    }

    newSocket.on("message", (msg) => {
      setChat((prev) => [...prev, { ...msg, self: false }]);

      if (msg.name && msg.name !== savedUser?.name) {
        setReceiver(msg.name);
      }
    });

    return () => newSocket.disconnect();
  }, []);

  // 🔐 SIGNUP
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

    alert("Signup successful! Now login");
    setIsSignup(false);
  };

  // 🔑 LOGIN + 💾 SAVE SESSION
  const login = () => {
    const users = JSON.parse(localStorage.getItem("users")) || [];

    const found = users.find(
      (u) =>
        `${u.firstName} ${u.lastName}` === loginData.name &&
        u.room === loginData.room
    );

    if (!found) return alert("Invalid credentials");

    const sessionUser = {
      name: `${found.firstName} ${found.lastName}`,
      room: found.room
    };

    setUser(sessionUser);

    // 💾 SAVE SESSION
    localStorage.setItem("user", JSON.stringify(sessionUser));
    localStorage.setItem("room", found.room);
  };

  // JOIN ROOM
  const joinRoom = () => {
    socket.emit("join", user.room);
    setRoom(user.room);
    setJoined(true);

    localStorage.setItem("room", user.room);
  };

  // SEND MESSAGE
  const sendMessage = () => {
    if (!message) return;

    const msgData = {
      name: user.name,
      room,
      text: message
    };

    socket.emit("send", msgData);
    setChat((prev) => [...prev, { ...msgData, self: true }]);
    setMessage("");
  };

  // 🔓 LOGOUT (FULL RESET)
  const logout = () => {
    const confirmLogout = window.confirm("Do you want to logout?");

    if (!confirmLogout) return;

    socket.emit("leave", room);

    setUser(null);
    setJoined(false);
    setRoom("");
    setChat([]);
    setReceiver("");

    localStorage.removeItem("user");
    localStorage.removeItem("room");
  };

  // LEAVE ROOM (only room exit, NOT logout)
  const leaveRoom = () => {
    const confirmLeave = window.confirm("Leave this room?");

    if (!confirmLeave) return;

    socket.emit("leave", room);
    setJoined(false);
    setChat([]);
    setRoom("");
    setReceiver("");

    localStorage.removeItem("room");
  };

  // 🔐 AUTH SCREEN
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

          <p
            style={{ cursor: "pointer", color: "blue" }}
            onClick={() => setIsSignup(!isSignup)}
          >
            {isSignup ? "Login" : "Create account"}
          </p>
        </div>
      </div>
    );
  }

  // 🔵 JOIN SCREEN
  if (!joined) {
    return (
      <div className="container">
        <div className="card">
          <h2>Join Chat</h2>
          <p>Welcome, <b>{user.name}</b></p>

          <button onClick={joinRoom}>Join Room {user.room}</button>

          <button
            onClick={logout}
            style={{ background: "red", marginTop: "10px" }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  // 💬 CHAT SCREEN
  return (
    <div className="container">
      <div className="card">

        <div className="topbar">
          <div>
            <h2>💬 Chat Room</h2>
            <p>
              Room: <b>{room}</b><br />
              You: <b>{user.name}</b>
            </p>
          </div>

          <button className="leaveBtn" onClick={leaveRoom}>
            Leave Room
          </button>
        </div>

        <div className="chat-box">
          {chat.map((msg, i) => (
            <div
              key={i}
              className={`message ${msg.self ? "self" : "other"}`}
            >
              <strong>{msg.name}:</strong> {msg.text}
            </div>
          ))}
        </div>

        <div className="inputBox">
          <input
            placeholder="Type message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <button onClick={sendMessage}>Send</button>
        </div>

      </div>
    </div>
  );
}

export default App;