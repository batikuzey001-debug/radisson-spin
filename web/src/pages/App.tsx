// web/src/pages/App.tsx
import { Routes, Route } from "react-router-dom";
import Header from "../components/Header";

// Sayfalar
import Home from "./Home";
import RadiCark from "./RadiCark";
import Turnuvalar from "./Turnuvalar";
// İleride eklenecek sayfalar için yer tutucu (404 vs.)

export default function App() {
  return (
    <div className="app">
      <Header />

      <div className="page">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/cark" element={<RadiCark />} />
          <Route path="/turnuvalar" element={<Turnuvalar />} />
          {/* <Route path="/canli-bulten" element={<CanliBulten />} /> */}
          {/* <Route path="/deal-or-no-deal" element={<DealOrNoDeal />} /> */}
        </Routes>
      </div>

      <style>{css}</style>
    </div>
  );
}

const css = `
/* Global reset */
*{box-sizing:border-box}
html, body, #root{height:100%; margin:0}

/* Zemin */
.app{
  min-height:100%;
  background:linear-gradient(180deg,#0b1224,#0e1a33);
  color:#eaf2ff;
  font-family:system-ui,Segoe UI,Roboto,Arial,sans-serif;
}

/* İçerik konteyneri */
.page{
  max-width:1200px;
  margin:0 auto;
  padding:16px;
}

@media (max-width:600px){
  .page{ padding:12px }
}
`;
