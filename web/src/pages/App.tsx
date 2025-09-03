// web/src/pages/App.tsx
import { useEffect, useState } from "react";
import axios from "axios";

const API = import.meta.env.VITE_API_BASE_URL;

export default function App() {
  const [health, setHealth] = useState<string>("…");

  useEffect(() => {
    axios
      .get(`${API}/api/health`)
      .then((r) => setHealth(JSON.stringify(r.data)))
      .catch(() => setHealth("bağlanamadı"));
  }, []);

  return (
    <div style={{ fontFamily: "sans-serif", padding: 16 }}>
      <h1>Frontend ✅</h1>
      <p><b>API:</b> {API}</p>
      <p><b>Health:</b> {health}</p>
      <nav style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <a href="/" onClick={(e)=>e.preventDefault()}>Home</a>
        <a href="#" onClick={(e)=>e.preventDefault()}>Spin (gelecek)</a>
      </nav>
    </div>
  );
}
