// web/src/pages/App.tsx
import { Routes, Route } from "react-router-dom";
import Header from "../components/Header";

// Sayfalar
import Home from "./Home";
import RadiCark from "./RadiCark";
import Turnuvalar from "./Turnuvalar";

export default function App() {
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
/* İlk çocukların üst marjını sıfırla (header büyük görünmesin) */
.page > *:first-child{ margin-top:0; }

@media (max-width:600px){
  .page{ padding:12px; }
}

/* ========= HEADER KORUMA (sabit ölçü / dış etkilerden izole) ========= */
/* Yükseklikleri sabitle */
.hdr .top  { height:52px !important; }
.hdr .menu { height:44px !important; }

/* Logo boyutunu sabitle (global img kuralları bozmasın) */
.hdr .logoBtn img{
  height:30px !important;
  width:auto !important;
  max-width:none !important;
  object-fit:contain;
  display:block;
}

/* Header içindeki yazı/ikonların beklenmeyen font şişmesini önle */
.hdr{ font-size:14px; line-height:1.2; }
.hdr .mItem{ font-size:13px; }

/* Header'ın çevresinde olası margin-collapse önlemi */
.hdr + .page{ padding-top:16px; }

/* (Opsiyonel) Küçük ekranda menü satırı taşarsa yatay scroll serbest kalsın */
@media (max-width:720px){
  .hdr .menu{ overflow:auto; white-space:nowrap; }
}
`;
