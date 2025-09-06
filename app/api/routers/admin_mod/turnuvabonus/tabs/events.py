# app/api/routers/admin_mod/turnuvabonus/tabs/events.py
from typing import Any, Type, Optional
from html import escape as _e
from fastapi import Request
from sqlalchemy.orm import Session

from app.api.routers.admin_mod.turnuvabonus.helpers import (
    _e as _esc, _dt_input, _fmt_try, _has, CATEGORY_OPTIONS
)

def render_events(
    request: Request,
    db: Session,
    Model: Type,                 # genelde Event
    editing: Optional[Any],      # düzenlenen satır (veya None)
    rows: list[Any],             # liste
    tab_key: str = "events",
) -> str:
    """
    'Etkinlikler' sekmesi: FORM + LİSTE (sade)
    Güncelleme:
      - Tarih seçiciler: görünür ikon + picker; klavye ile manuel giriş de mümkün
      - Kupon kodu: başlığın üstünde
      - CTA: Metin ve URL alanları (modelde varsa kaydedilir)
    """
    title_text = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    sub_text = "Etkinlikler"
    val = (lambda name, default="": _esc(getattr(editing, name, "") or default))
    current_cat = getattr(editing, "category", "") if editing else ""
    status_now = getattr(editing, "status", "draft") if editing else "draft"

    cancel_edit_btn = (
        f"<a class='btn ghost small' href='/admin/turnuvabonus?tab={tab_key}' title='Düzenlemeyi iptal et'>İptal</a>"
        if editing else ""
    )

    # ---- FORM ----
    form = [
        "<div class='card form-card'>",
        f"<div class='form-head'><div><h1>{_esc(title_text)}</h1><div class='sub'>{_esc(sub_text)}</div></div>"
        f"<div class='head-actions'>{cancel_edit_btn}</div></div>",

        f"<form method='post' action='/admin/turnuvabonus/{tab_key}/upsert' autocomplete='on'>",
        f"{f'<input type=\"hidden\" name=\"id\" value=\"{editing.id}\">' if editing else ''}",

        "<div class='grid'>",
    ]

    # Kupon kodu (BAŞLIĞIN ÜSTÜNDE)
    if _has(Model, "coupon_code"):
        form.append(
            f"<label class='field span-12'><span>Kupon Kodu</span>"
            f"<input name='coupon_code' value='{val('coupon_code')}' placeholder='Örn: NEON50'></label>"
        )

    # Başlık
    form.append(f"<label class='field span-12'><span>Başlık</span><input name='title' value='{val('title')}' required></label>")

    # CTA — METİN ve LİNK alanları (modelde varsa)
    if _has(Model, "cta_text"):
        form.append(
            f"<label class='field span-6'><span>CTA Metni</span>"
            f"<input name='cta_text' value='{val('cta_text')}' placeholder='Örn: Hemen Katıl'></label>"
        )
    if _has(Model, "cta_url"):
        form.append(
            f"<label class='field span-6'><span>CTA Linki</span>"
            f"<input name='cta_url' value='{val('cta_url')}' placeholder='https://... veya /sayfa'></label>"
        )

    # Kapak görseli
    form.append(f"<label class='field span-12'><span>Kapak Görseli URL</span><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...'></label>")

    # Tarihler — input + yanında 📅 düğmesi (klavye girişi serbest)
    form += [
        f"<label class='field span-6'><span>Başlangıç</span>"
        f"<div class='dateRow'>"
        f"<input id='start_at_input' type='datetime-local' class='dateInput' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'>"
        f"<button type='button' class='pickBtn' data-for='start_at_input' title='Tarih seç'>📅</button>"
        f"</div></label>",

        f"<label class='field span-6'><span>Bitiş</span>"
        f"<div class='dateRow'>"
        f"<input id='end_at_input' type='datetime-local' class='dateInput' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'>"
        f"<button type='button' class='pickBtn' data-for='end_at_input' title='Tarih seç'>📅</button>"
        f"</div></label>",
    ]

    # Kategori / Durum
    form.append("<label class='field span-6'><span>Kategori</span><select name='category'>")
    form.append(f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>")
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        form.append(f"<option value='{_esc(v)}' {sel}>{_esc(txt)}</option>")
    form.append("</select></label>")

    form.append("<label class='field span-6'><span>Durum</span><select name='status'>")
    for s in ("draft", "published"):
        sel = "selected" if status_now == s else ""
        form.append(f"<option value='{s}' {sel}>{'Yayında' if s=='published' else 'Taslak'}</option>")
    form.append("</select></label>")

    # Etkinlik özel alanları (varsa)
    if _has(Model, "prize_amount"):
        form.append(
            f"<label class='field span-6'><span>Ödül Miktarı (₺)</span>"
            f"<input name='prize_amount' type='number' inputmode='numeric' min='0' step='1' "
            f"value='{_esc(str(getattr(editing, 'prize_amount', '') or ''))}' placeholder='örn: 100000'>"
            f"</label>"
        )
    if _has(Model, "short_desc"):
        form.append(f"<label class='field span-12'><span>Kısa Açıklama (Kart)</span><textarea name='short_desc' rows='2' placeholder='Kart üzerinde görünecek kısa açıklama...'>{val('short_desc')}</textarea></label>")
    if _has(Model, "long_desc"):
        form.append(f"<label class='field span-12'><span>Detay Açıklama (Modal)</span><textarea name='long_desc' rows='4' placeholder='Kart tıklanınca açılacak uzun açıklama...'>{val('long_desc')}</textarea></label>")

    form.extend([
        "</div>",  # grid
        "<div class='form-actions'>"
        "<button class='btn primary' type='submit'>Kaydet</button>"
        f"{cancel_edit_btn}"
        "</div>",
        "</form></div>",
    ])

    # ---- LİSTE TABLOSU ----
    t = ["<div class='card'><h1>Etkinlikler</h1>"]
    headers = "<tr><th>ID</th><th>Başlık</th><th>Durum</th><th>Başlangıç</th><th>Bitiş</th><th>Etkinlik Ödülü</th><th>Görsel</th><th style='width:180px'>İşlem</th></tr>"
    t.append("<div class='table-wrap'><table>" + headers)

    for r in rows:
        img = "<span class='pill'>-</span>"
        if getattr(r, "image_url", None):
            img = f"<img src='{_esc(r.image_url)}' alt='' loading='lazy' />"
        start_txt = _dt_input(getattr(r, "start_at", None)).replace("T", " ") or "-"
        end_txt = _dt_input(getattr(r, "end_at", None)).replace("T", " ") or "-"
        prize_amt_td = _fmt_try(getattr(r, "prize_amount", None))

        t.append(
            f"<tr>"
            f"<td>{r.id}</td>"
            f"<td>{_esc(r.title)}</td>"
            f"<td>{_esc(getattr(r,'status','-') or '-')}</td>"
            f"<td>{start_txt}</td>"
            f"<td>{end_txt}</td>"
            f"<td>{prize_amt_td}</td>"
            f"<td class='img'>{img}</td>"
            f"<td class='actions'>"
            f"<a class='btn neon small' href='/admin/turnuvabonus?tab={tab_key}&edit={r.id}' title='Düzenle'>Düzenle</a>"
            f"<form method='post' action='/admin/turnuvabonus/{tab_key}/delete' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{r.id}'/>"
            f"<button class='btn danger small' type='submit' title='Sil'>Sil</button>"
            f"</form>"
            f"</td>"
            f"</tr>"
        )
    t.append("</table></div></div>")

    # Tarih picker görünürlüğü + ikon butonu (klavye giriş serbest)
    style_js = """
    <style>
      .field input, .field select, .field textarea{
        border:1px solid var(--line, #1c1f28);
        background:#0b0d13; color:#fff; padding:10px;
      }
      .field input:focus, .field select:focus, .field textarea:focus{
        outline:none; box-shadow:none; border-color:var(--line, #1c1f28);
      }

      .dateRow{ display:flex; align-items:center; gap:6px; }
      .dateInput{ flex:1 1 auto; }

      /* WebKit ikonunu belirginleştir (koyu zemin) */
      input[type="datetime-local"]::-webkit-calendar-picker-indicator{
        opacity:1; filter: invert(1) brightness(1.4); cursor:pointer;
      }

      /* Yan "📅" butonu */
      .pickBtn{
        padding:8px 10px; border:1px solid var(--line, #1c1f28);
        background:#111523; color:#fff; cursor:pointer;
      }
      .pickBtn:hover{ filter:brightness(1.08); }
    </style>
    <script>
      // "📅" butonu → tarayıcı destekliyse showPicker; değilse focus
      (function(){
        try{
          document.querySelectorAll('.pickBtn').forEach(function(btn){
            btn.addEventListener('click', function(){
              var id = btn.getAttribute('data-for');
              var el = id ? document.getElementById(id) : null;
              if(!el) return;
              try{ if (el.showPicker) { el.showPicker(); return; } }catch(e){}
              el.focus();
            });
          });
        }catch(e){}
      })();
    </script>
    """

    return "".join(form) + "".join(t) + style_js
