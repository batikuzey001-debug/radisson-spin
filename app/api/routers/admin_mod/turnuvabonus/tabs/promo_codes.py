# app/api/routers/admin_mod/turnuvabonus/tabs/promo_codes.py
from typing import Any, Type, Optional
from fastapi import Request
from sqlalchemy.orm import Session

from app.api.routers.admin_mod.turnuvabonus.helpers import (
    _e as _esc, _dt_input, _fmt_try, _has, CATEGORY_OPTIONS
)

def render_promo_codes(
    request: Request,
    db: Session,
    Model: Type,                 # genelde PromoCode
    editing: Optional[Any],
    rows: list[Any],
    tab_key: str = "promo-codes",
) -> str:
    title_text = "Yeni Kayıt" if not editing else f"Kayıt Düzenle (#{editing.id})"
    sub_text = "Promosyon Kodları"
    val = (lambda name, default="": _esc(getattr(editing, name, "") or default))
    current_cat = getattr(editing, "category", "") if editing else ""
    status_now = getattr(editing, "status", "draft") if editing else "draft"

    cancel_edit_btn = (
        f"<a class='btn ghost small' href='/admin/turnuvabonus?tab={tab_key}' title='Düzenlemeyi iptal et'>İptal</a>"
        if editing else ""
    )

    form = [
        "<div class='card form-card'>",
        f"<div class='form-head'><div><h1>{_esc(title_text)}</h1><div class='sub'>{_esc(sub_text)}</div></div>"
        f"<div class='head-actions'>{cancel_edit_btn}</div></div>",
        f"<form method='post' action='/admin/turnuvabonus/{tab_key}/upsert' autocomplete='on'>",
        f"{f'<input type=\"hidden\" name=\"id\" value=\"{editing.id}\">' if editing else ''}",
        "<div class='grid'>",
        f"<label class='field'><span>Başlık</span><input name='title' value='{val('title')}' required></label>",
        f"<label class='field'><span>Kapak Görseli URL</span><input name='image_url' value='{val('image_url')}' placeholder='https://... veya /static/...'></label>",
        f"<label class='field'><span>Başlangıç</span><input type='datetime-local' name='start_at' value='{_dt_input(getattr(editing,'start_at',None))}'></label>",
        f"<label class='field'><span>Bitiş</span><input type='datetime-local' name='end_at' value='{_dt_input(getattr(editing,'end_at',None))}'></label>",
        "<label class='field'><span>Kategori</span><select name='category'>",
        f"<option value='' {'selected' if not current_cat else ''}>— Seçiniz —</option>",
    ]
    for v, txt in CATEGORY_OPTIONS:
        sel = "selected" if str(current_cat) == v else ""
        form.append(f"<option value='{_esc(v)}' {sel}>{_esc(txt)}</option>")
    form.append("</select></label>")

    form.append("<label class='field'><span>Durum</span><select name='status'>")
    for s in ("draft", "published"):
        sel = "selected" if status_now == s else ""
        form.append(f"<option value='{s}' {sel}>{'Yayında' if s=='published' else 'Taslak'}</option>")
    form.append("</select></label>")

    if _has(Model, "cta_url"):
        form.append(f"<label class='field'><span>Buton Bağlantısı</span><input name='cta_url' value='{val('cta_url')}' placeholder='https://... veya /sayfa'></label>")
    if _has(Model, "coupon_code"):
        form.append(f"<label class='field'><span>Kupon Kodu</span><input name='coupon_code' value='{val('coupon_code')}' placeholder='Örn: NEON50'></label>")

    if _has(Model, "short_desc"):
        form.append(f"<label class='field'><span>Kısa Açıklama</span><textarea name='short_desc' rows='2' placeholder='Kart üzerinde kısa açıklama...'>{val('short_desc')}</textarea></label>")
    if _has(Model, "long_desc"):
        form.append(f"<label class='field'><span>Detay Açıklama</span><textarea name='long_desc' rows='4' placeholder='Detaylar...'>{val('long_desc')}</textarea></label>")

    form.extend([
        "</div>",
        "<div class='form-actions'>"
        "<button class='btn primary' type='submit'>Kaydet</button>"
        f"{cancel_edit_btn}"
        "</div>",
        "</form></div>",
    ])

    t = ["<div class='card'><h1>Promosyon Kodları</h1>"]
    headers = "<tr><th>ID</th><th>Başlık</th><th>Kupon</th><th>Durum</th><th>Başlangıç</th><th>Bitiş</th><th>Görsel</th><th style='width:180px'>İşlem</th></tr>"
    t.append("<div class='table-wrap'><table>" + headers)

    for r in rows:
        img = "<span class='pill'>-</span>"
        if getattr(r, "image_url", None):
            img = f"<img src='{_esc(r.image_url)}' alt='' loading='lazy' />"
        start_txt = _dt_input(getattr(r, "start_at", None)).replace("T", " ") or "-"
        end_txt = _dt_input(getattr(r, "end_at", None)).replace("T", " ") or "-"
        kupon = _esc(getattr(r, "coupon_code", "") or "-")

        t.append(
            f"<tr>"
            f"<td>{r.id}</td>"
            f"<td>{_esc(r.title)}</td>"
            f"<td><code>{kupon}</code></td>"
            f"<td>{_esc(getattr(r,'status','-') or '-')}</td>"
            f"<td>{start_txt}</td>"
            f"<td>{end_txt}</td>"
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

    return "".join(form) + "".join(t)
