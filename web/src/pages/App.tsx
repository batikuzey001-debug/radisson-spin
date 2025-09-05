// web/src/pages/App.tsx
import { Routes, Route } from "react-router-dom";

// Sadece sayfa bileşenleri:
import Home from "./Home";
import RadiCark from "./RadiCark";
import Turnuvalar from "./Turnuvalar"; // gerekiyorsa açık kalsın

export default function App() {
  return (
    <div className="app">
      {/* Global Header/SubNav yok; sayfalar kendi içinde eklenir */}
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
/* -------- GLOBAL RESET -------- */
*{box-sizing:border-box}
html, body, #root{height:100%; margin:0; background:#0b1224}

/* Sayfa zemini */
.app{
  min-height:100%;
  background:linear-gradient(180deg,#0b1224,#0e1a33);
  font-family:sans-serif;
}

/* İçerik konteyneri */
.page{
  max-width:1200px;
  margin:0 auto;
  padding:16px;
}

/* İlk çocukların üst marjını sıfırla (h1 margin-collapse olmaması için) */
.page > *:first-child{ margin-top:0; }
.page h1, .page h2{ margin-top:0; }

@media (max-width:600px){
  .page{ padding:12px; }
}
`;
