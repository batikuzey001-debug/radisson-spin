// web/src/pages/App.tsx
import { Routes, Route } from "react-router-dom";
import Header from "../components/Header";
import SubNav from "../components/SubNav"; // yeni alt menü
import Home from "./Home";
import AnaSayfaDemo from "./AnaSayfaDemo";

export default function App() {
  return (
    <div className="app">
      {/* Global Header */}
      <Header />
      {/* Header altında alt menü */}
      <SubNav />

      {/* Sayfa içerikleri */}
      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/demo" element={<AnaSayfaDemo />} />
          <Route path="/spin" element={<div>Spin sayfası (yakında)</div>} />
        </Routes>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
.app{min-height:100vh; background:linear-gradient(180deg,#0b1224,#0e1a33); font-family:sans-serif}
.page{max-width:1200px; margin:0 auto; padding:16px}
`;
