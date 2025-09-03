// web/src/components/SubNav.tsx
import { NavLink } from "react-router-dom";

export default function SubNav() {
  return (
    <div className="subnav-wrap">
      <nav className="subnav">
        <NavLink to="/" className={({isActive}) => isActive ? "item active" : "item"}>Ana Sayfa</NavLink>
        <a className="item" href="#" onClick={(e)=>e.preventDefault()}>Canlı</a>
        <a className="item" href="#" onClick={(e)=>e.preventDefault()}>Yakında</a>
        <a className="item" href="#" onClick={(e)=>e.preventDefault()}>Promolar</a>
        <a className="item" href="#" onClick={(e)=>e.preventDefault()}>Yardım</a>
      </nav>
      <style>{css}</style>
    </div>
  );
}

const css = `
.subnav-wrap{
  position:sticky; top:0; z-index:40;
  background:rgba(6,10,22,.75);
  backdrop-filter: blur(8px);
  border-bottom:1px solid rgba(255,255,255,.06);
}
.subnav{
  max-width:1200px; margin:0 auto; padding:8px 16px;
  display:flex; gap:10px; flex-wrap:wrap;
}
.item{
  display:inline-block; padding:8px 12px; border-radius:12px;
  color:#dfe8ff; text-decoration:none;
  border:1px solid rgba(255,255,255,.08);
}
.item:hover{filter:brightness(1.07)}
.item.active{
  border-color:rgba(0,229,255,.35);
  box-shadow:0 0 0 2px rgba(0,229,255,.15) inset;
}
@media(max-width:520px){ .subnav{gap:8px} .item{padding:7px 10px} }
`;
