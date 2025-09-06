// web/src/pages/App.tsx
import { useEffect } from "react";
import { Routes, Route } from "react-router-dom";
import Header from "../components/Header";
import { sendVisitPing } from "../utils/visitPing";

// Sayfalar
import Home from "./Home";
import RadiCark from "./RadiCark";
import Turnuvalar from "./Turnuvalar";

export default function App() {
  // Ziyaretçi ping: uygulama yüklendiğinde 1 kez
  useEffect(() => {
    sendVisitPing();
  }, []);

  return (
    <div className="app">
      <Header />

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
/* ========= Global reset ========= */
*{box-sizing:border-box}
html, body, #root{height:100%; margin:0}

/* ========= Zemin ========= */
.app{
  min-height:100%;
  background:linear-gradient(180deg,#0b1224,#0e1a33);
  color:#eaf2ff;
  font-family:system-ui, Segoe UI, Roboto, Arial, sans-serif;
}

/* ========= İçerik ========= */
.page{
  max-width:1200px;
  margin:0 auto;
  padding:16px;
}
.page > *:first-child{ margin-top:0; }

@media (max-width:600px){
  .page{ padding:12px; }
}

/* ========= HEADER KORUMA ========= */
.hdr .top  { height:52px !important; }
.hdr .menu { height:44px !important; }

.hdr .logoBtn img{
  height:30px !important;
  width:auto !important;
  max-width:none !important;
  object-fit:contain;
  display:block;
}

.hdr{ font-size:14px; line-height:1.2; }
.hdr .mItem{ font-size:13px; }

.hdr + .page{ padding-top:16px; }

@media (max-width:720px){
  .hdr .menu{ overflow:auto; white-space:nowrap; }
}
`;
