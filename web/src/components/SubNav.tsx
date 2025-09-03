// web/src/components/SubNav.tsx
import { NavLink } from "react-router-dom";

export default function SubNav() {
  return (
    <div className="subnav-wrap">
      <nav className="subnav">
        <NavLink to="/cark" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Radi Çark
        </NavLink>
        <NavLink to="/turnuvalar" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Turnuvalar
        </NavLink>
      </nav>
      <style>{css}</style>
    </div>
  );
}

const css = `
/* Menü arka planı kaldırıldı */
.subnav-wrap{
  position:sticky; top:0; z-index:40;
  border-bottom:1px solid rgba(255,255,255,.06);
  background:transparent;
}
.subnav{
  max-width:1200px; margin:0 auto; padding:6px 16px;
  display:flex; gap:20px; flex-wrap:wrap;
}

/* Linkler */
.item{
  position:relative;
  display:inline-block;
  padding:6px 0;
  color:#cfe0ff;
  text-decoration:none;
  font-weight:600;
  font-size:15px;
  transition:color .2s;
}
.item:hover{
  color:#fff;
}
.item.active{
  color:#00e5ff;
}
.item.active::after{
  content:"";
  position:absolute;
  left:0; right:0; bottom:-3px;
  height:2px;
  background:linear-gradient(90deg,#00e5ff,#4aa7ff);
  border-radius:2px;
  box-shadow:0 0 6px rgba(0,229,255,.6);
}

@media(max-width:600px){
  .subnav{gap:14px}
  .item{font-size:14px}
}
`;
