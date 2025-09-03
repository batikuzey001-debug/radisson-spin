// web/src/pages/App.tsx
import { Routes, Route, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import axios from "axios";
import Home from "./Home";
import AnaSayfaDemo from "./AnaSayfaDemo";

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
      <p>
        <b>API:</b> {API}
      </p>
      <p>
        <b>Health:</b> {health}
      </p>
      <nav style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <Link to="/">Home</Link>
        <Link to="/demo">Ana Sayfa Demo</Link>
        <Link to="/spin">Spin (gelecek)</Link>
      </nav>
      <div style={{ marginTop: 20 }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<AnaSayfaDemo />} />
          <Route path="/spin" element={<div>Spin sayfası (yakında)</div>} />
        </Routes>
      </div>
    </div>
  );
}
