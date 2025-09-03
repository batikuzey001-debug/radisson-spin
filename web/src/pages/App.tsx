// web/src/pages/App.tsx
import { Routes, Route } from "react-router-dom";
import Header from "../components/Header";
import SubNav from "../components/SubNav";
import Home from "./Home";

// Yeni sayfalar (placeholder)
import RadiCark from "./RadiCark";
import Turnuvalar from "./Turnuvalar";

export default function App() {
  return (
    <div className="app">
      <Header />
      <SubNav />

      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cark" element={<RadiCark />} />
          <Route path="/turnuvalar" element={<Turnuvalar />} />
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
