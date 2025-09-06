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

    # Kod Oluştur formu
    form = [
        "<div class='card'><h1>Kod Oluştur</h1>",
        "<form method='post' action='/admin/kod-yonetimi/create-code' oninput='kMode()'>",
        "<div class='grid'>",
        "<div class='span-6'><div>Kullanıcı adı</div><input name='username' required></div>",
        "<div class='span-6'><div>Seviye</div><select name='tier_key' required>",
    ]
    if not enabled_tiers:
        form += ["<option value=''>— Önce seviye ekleyin —</option>"]
    else:
        form += [f"<option value='{_esc(t.key)}'>{_esc(t.label)}</option>" for t in enabled_tiers]
    form += [
        "</select></div>",
        "</div>",
        "<div style='height:8px'></div>",
        "<div class='grid'>",
        "<div class='span-6'><div>Ödül Seçimi</div>",
        "<select name='mode' id='modeSel'>",
        "<option value='auto' selected>Otomatik (dağılıma göre)</option>",
        "<option value='manual'>Manuel (tek seferlik)</option>",
        "</select></div>",
        "<div class='span-6'><div>Manuel Ödül (ops.)</div><select name='manual_prize_id' id='manualSel' disabled>",
        "<option value=''>— Seçiniz —</option>",
        *[f"<option value='{p.id}'>[{p.wheel_index}] {_esc(p.label)}</option>" for p in prizes],
        "</select></div>",
        "</div>",
        "<div class='hint muted'>Not: 'Otomatik' modda ödül, seçilen seviyeye ait dağılım yüzdelerine göre belirlenir.</div>",
        "<div style='height:8px'></div>",
        "<button class='btn primary' type='submit'>Oluştur</button>",
        "</form>",
        "<script>function kMode(){var m=document.getElementById('modeSel');var s=document.getElementById('manualSel');if(!m||!s) return; s.disabled=(m.value!=='manual');}</script>",
        "</div>",
    ]

    # Son 20 tablo
    table = [
        "<div class='card'><h1>Son 20 Kod</h1>",
        "<div class='table-wrap'><table>",
        "<tr><th>Kod</th><th>Kullanıcı</th><th>Seviye</th><th>Manuel Ödül</th><th>Kazanan Ödül</th><th>Durum</th></tr>",
    ]
    for c in last:
        tier_label = "-"
        if c.tier_key:
            t = next((x for x in all_tiers if x.key == c.tier_key), None)
            tier_label = t.label if t else c.tier_key
        table.append(
            f"<tr>"
            f"<td><code>{_esc(c.code)}</code></td>"
            f"<td>{_esc(c.username or '-')}</td>"
            f"<td>{_esc(tier_label)}</td>"
            f"<td>{_esc(prize_label_by_id.get(getattr(c,'manual_prize_id',None), '-') if getattr(c,'manual_prize_id',None) else '-')}</td>"
            f"<td>{_esc(prize_label_by_id.get(c.prize_id, '-') if c.prize_id else '-')}</td>"
            f"<td>{'Kullanıldı' if c.status == 'used' else 'Verildi'}</td>"
            f"</tr>"
        )
    table.append("</table></div></div>")

    return "".join(form + table)
