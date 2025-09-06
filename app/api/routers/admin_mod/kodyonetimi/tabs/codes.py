# app/api/routers/admin_mod/kodyonetimi/tabs/codes.py
from typing import List
from html import escape as _e
from sqlalchemy.orm import Session

from app.db.models import Prize, Code, PrizeTier
from app.api.routers.admin_mod.kodyonetimi.helpers import _e as _esc, _img_cell, _tiers

def render_codes(db: Session) -> str:
    prizes: List[Prize] = db.query(Prize).order_by(Prize.wheel_index).all()
    prize_label_by_id = {p.id: p.label for p in prizes}
    all_tiers: List[PrizeTier] = _tiers(db)
    enabled_tiers = [t for t in all_tiers if t.enabled]

    last = db.query(Code).order_by(Code.created_at.desc()).limit(20).all()

    # ========== KOD OLUŞTUR (minimal + kopyalanabilir son kod alanı) ==========
    form = [
        "<div class='card codeCard'>",
        "<div class='codeHead'>",
        "<h1>Kod Oluştur</h1>",
        # Son oluşturulan kod göstergesi (query param new=XXXX ile gelir, kopyalanabilir)
        "<div class='lastWrap' id='lastWrap' hidden>",
        "<span class='lastLbl'>Oluşturulan Kod</span>",
        "<code class='lastCode' id='lastCode'>—</code>",
        "<button type='button' class='btn small ghost' id='copyBtn' title='Kodu kopyala'>Kopyala</button>",
        "</div>",
        "</div>",

        "<form method='post' action='/admin/kod-yonetimi/create-code' oninput='kMode()' class='codeForm'>",
        "<div class='grid'>",

        "<label class='field span-6'>",
        "<span>Kullanıcı adı</span>",
        "<input name='username' required placeholder='kullanici_adi'>",
        "</label>",

        "<label class='field span-6'>",
        "<span>Seviye</span>",
        "<select name='tier_key' required>",
    ]
    if not enabled_tiers:
        form += ["<option value=''>— Önce seviye ekleyin —</option>"]
    else:
        form += [f"<option value='{_esc(t.key)}'>{_esc(t.label)}</option>" for t in enabled_tiers]
    form += [
        "</select>",
        "</label>",

        "<label class='field span-6'>",
        "<span>Ödül Seçimi</span>",
        "<select name='mode' id='modeSel'>",
        "<option value='auto' selected>Otomatik (dağılıma göre)</option>",
        "<option value='manual'>Manuel (tek seferlik)</option>",
        "</select>",
        "</label>",

        "<label class='field span-6'>",
        "<span>Manuel Ödül (ops.)</span>",
        "<select name='manual_prize_id' id='manualSel' disabled>",
        "<option value=''>— Seçiniz —</option>",
        *[f"<option value='{p.id}'>[{p.wheel_index}] {_esc(p.label)}</option>" for p in prizes],
        "</select>",
        "</label>",

        "</div>",  # grid
        "<div class='hint muted'>Not: ‘Otomatik’ modda ödül, seçilen seviyeye ait dağılım yüzdelerine göre belirlenir.</div>",
        "<div class='formActions'>",
        "<button class='btn primary' type='submit'>Oluştur</button>",
        "</div>",
        "</form>",
        "</div>",  # card
    ]

    # ========== SON 20 KOD (minimal tablo + durum ikonları) ==========
    table = [
        "<div class='card'>",
        "<h1>Son 20 Kod</h1>",
        "<div class='table-wrap'>",
        "<table class='codesTable'>",
        "<tr>",
        "<th>Kod</th><th>Kullanıcı</th><th>Seviye</th><th>Manuel Ödül</th><th>Kazanan</th><th>Durum</th>",
        "</tr>",
    ]

    # Durum ikonları: issued=⏳, used=✓, diğer=✕
    def status_icon(st: str) -> str:
        s = (st or "").lower()
        if s == "used":    # Kullanıldı
            return "<span class='st ok' title='Kullanıldı'>✓</span>"
        if s == "issued":  # Verildi (beklemede)
            return "<span class='st wait' title='Verildi (Beklemede)'>⏳</span>"
        return "<span class='st bad' title='Pasif/Geçersiz'>✕</span>"

    for c in last:
        tier_label = "-"
        if c.tier_key:
            t = next((x for x in all_tiers if x.key == c.tier_key), None)
            tier_label = t.label if t else c.tier_key

        manual_label = "-"
        if getattr(c, "manual_prize_id", None):
            manual_label = prize_label_by_id.get(getattr(c, "manual_prize_id"), "-")

        win_label = "-"
        if c.prize_id:
            win_label = prize_label_by_id.get(c.prize_id, "-")

        icon = status_icon(getattr(c, "status", ""))

        table.append(
            "<tr>"
            f"<td><code class='mono'>{_esc(c.code)}</code></td>"
            f"<td>{_esc(c.username or '-')}</td>"
            f"<td>{_esc(tier_label)}</td>"
            f"<td>{_esc(manual_label)}</td>"
            f"<td>{_esc(win_label)}</td>"
            f"<td>{icon}</td>"
            "</tr>"
        )
    table.append("</table></div></div>")

    # ========== Stil + JS (minimal, okunaklı) ==========
    style_js = """
    <style>
      :root{ --line:#1c1f28; --muted:#a3aec2; --text:#f2f4f8; --panel:#0d0f15; --panel2:#0b0d13; --red:#ff0033; }

      .card{ border:1px solid var(--line); background:var(--panel); padding:16px; margin:12px 0; }
      h1{ font-size:16px; margin:0 0 12px; letter-spacing:.4px; }
      .muted{ color:var(--muted); font-size:12px; }

      /* Form üst: başlık + son kod alanı */
      .codeHead{ display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:8px; }
      .lastWrap{ display:flex; align-items:center; gap:8px; }
      .lastLbl{ color:var(--muted); font-size:12px; letter-spacing:.4px; }
      .lastCode{ background:#0b0d13; border:1px solid var(--line); padding:6px 8px; font-weight:900; color:#fff; }
      .btn.small{ font-size:12px; padding:6px 8px; }

      /* Form yerleşimi */
      .codeForm .grid{ display:grid; grid-template-columns:repeat(12,1fr); gap:12px; }
      .span-6{ grid-column:span 6; }
      @media(max-width:900px){ .span-6{ grid-column:span 12; } }
      .field{ display:flex; flex-direction:column; gap:6px; }
      .field > span{ font-size:12px; color:var(--muted); }
      input,select{ width:100%; background:#0b0d13; border:1px solid var(--line); color:#fff; padding:10px; }
      input:focus,select:focus{ outline:none; border-color:var(--red); box-shadow:0 0 0 2px rgba(255,0,51,.18); }
      .formActions{ display:flex; justify-content:flex-end; margin-top:10px; }

      .btn{ appearance:none; border:1px solid var(--line); background:#151824; color:#fff; padding:8px 12px; cursor:pointer; text-decoration:none; }
      .btn.primary{ background:linear-gradient(90deg,var(--red),#ff334f); border-color:#2a0e15; }
      .btn.ghost{ background:transparent; color:var(--muted); }

      /* Tablo minimal */
      .table-wrap{ overflow:auto; }
      table.codesTable{ width:100%; border-collapse:collapse; min-width:720px; }
      .codesTable th, .codesTable td{ border-bottom:1px solid var(--line); padding:8px 6px; text-align:left; white-space:nowrap; }
      .codesTable th{ font-size:12px; color:var(--muted); text-transform:uppercase; }
      code.mono{ font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; }

      /* Durum ikonları */
      .st{ display:inline-block; width:24px; text-align:center; font-weight:900; }
      .st.ok{ color:#22d36b; }     /* ✓  */
      .st.wait{ color:#ffd36a; }   /* ⏳ */
      .st.bad{ color:#ff5c5c; }    /* ✕  */
    </style>

    <script>
      // Ödül seçimi modu
      function kMode(){
        var m=document.getElementById('modeSel');
        var s=document.getElementById('manualSel');
        if(!m||!s) return;
        s.disabled = (m.value!=='manual');
      }
      // 'new' query paramı ile gelen son kodu göster + kopyala
      (function(){
        try{
          var params = new URLSearchParams(window.location.search);
          var v = params.get('new');   // backend create-code sonrası ?new=XXXX ile dönerse
          var wrap = document.getElementById('lastWrap');
          var codeEl = document.getElementById('lastCode');
          var btn = document.getElementById('copyBtn');
          if(v && wrap && codeEl && btn){
            wrap.hidden = false;
            codeEl.textContent = v;
            btn.onclick = function(){
              try{ navigator.clipboard.writeText(v); }catch(e){}
            };
          }
        }catch(e){}
      })();
    </script>
    """

    # NOT: create-code endpoint’i oluşturulan kod ile redirect yaparsa (ör. /admin/kod-yonetimi?tab=kodlar&new=ABCD12)
    # yukarıdaki alan otomatik görünür. (Şu an endpoint sadece flash atıyorsa, küçük bir değişiklik gerekebilir.)

    return "".join(form + table) + style_js
