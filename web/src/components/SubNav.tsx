// web/src/components/SubNav.tsx
import { NavLink } from "react-router-dom";

export default function SubNav() {
  return (
    <div className="subnav-wrap">
      <nav className="subnav">
        <NavLink to="/" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Ana Sayfa
        </NavLink>
        <NavLink to="/canli" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Canlı
        </NavLink>
        <NavLink to="/yakinda" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Yakında
        </NavLink>
        <NavLink to="/promolar" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Promolar
        </NavLink>
        <NavLink to="/yardim" className={({ isActive }) => (isActive ? "item active" : "item")}>
          Yardım
        </NavLink>
      </nav>
      <style>{css}</style>
    </div>
  );
}

const css = `
.subnav-wrap{
  position:sticky; top:0; z-index:40;
  background:rgba(6,10,22,.85);
  backdrop-filter: blur(10px);
  border-bottom:1px solid rgba(255,255,255,.08);
}
.subnav{
  max-width:1200px; margin:0 auto; padding:10px 16px;
  display:flex; gap:14px; flex-wrap:wrap;
}
.item{
  display:inline-block; padding:8px 14px; border-radius:12px;
  color:#dfe8ff; text-decoration:none; font-weight:600;
  border:1px solid rgba(255,255,255,.1);
  transition:all .2s;
}
.item:hover{
  background:rgba(0,229,255,.12);
  border-color:rgba(0,229,255,.35);
  color:#fff;
}
.item.active{
  background:linear-gradient(90deg,#00e5ff,#4aa7ff);
  border-color:#0f6d8c;
  color:#001018;
  box-shadow:0 0 10px rgba(0,229,255,.3);
}
@media(max-width:600px){
  .subnav{gap:10px}
  .item{padding:7px 12px;font-size:14px}
}
`;
