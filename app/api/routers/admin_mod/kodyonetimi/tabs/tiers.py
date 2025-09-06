# app/api/routers/admin_mod/kodyonetimi/tabs/tiers.py
from typing import List
from html import escape as _e
from sqlalchemy.orm import Session

from app.db.models import PrizeTier
from app.api.routers.admin_mod.kodyonetimi.helpers import _e as _esc, _tiers

def render_tiers(db: Session, request_query_params) -> str:
    tiers: List[PrizeTier] = _tiers(db)
    edit_key = (request_query_params.get("edit") or "").strip()
    editing = next((t for t in tiers if t.key == edit_key), None)

    # liste
    rows = [
        "<div class='card'><h1>Seviye Yönetimi</h1>",
        "<div class='table-wrap'><table>",
        "<tr><th>Anahtar</th><th>Etiket</th><th>Sıra</th><th>Aktif</th><th style='width:160px'>İşlem</th></tr>",
    ]
    for t in tiers:
        rows.append(
            f"<tr>"
            f"<td><code>{_esc(t.key)}</code></td>"
            f"<td>{_esc(t.label)}</td>"
            f"<td>{t.sort}</td>"
            f"<td>{'Evet' if t.enabled else 'Hayır'}</td>"
            f"<td>"
            f"<a class='btn small' href='/admin/kod-yonetimi?tab=seviyeler&edit={_esc(t.key)}'>Düzenle</a> "
            f"<form method='post' action='/admin/kod-yonetimi/tiers/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi? (İlgili dağılımlar da silinir)')\">"
            f"<input type='hidden' name='key' value='{_esc(t.key)}' />"
            f"<button class='btn small' type='submit'>Sil</button></form>"
            f"</td>"
            f"</tr>"
        )
    rows.append("</table></div></div>")

    # form
    ekey = editing.key if editing else ""
    elabel = editing.label if editing else ""
    esort = editing.sort if editing else 0
    echecked = "checked" if (editing.enabled if editing else True) else ""

    form = f"""
    <div class='card'>
      <h1>{'Seviye Düzenle' if editing else 'Yeni Seviye'}</h1>
      <form method='post' action='/admin/kod-yonetimi/tiers/upsert'>
        <div class='grid'>
          <div class='span-6'>
            <div>Anahtar</div>
            <input name='key' value='{_esc(ekey)}' {'readonly' if editing else ''} placeholder='ör. bronze-100' required>
          </div>
          <div class='span-6'>
            <div>Etiket</div>
            <input name='label' value='{_esc(elabel)}' placeholder='ör. 100 TL' required>
          </div>
        </div>
        <div style='height:8px'></div>
        <div class='grid'>
          <div class='span-6'><div>Sıra</div><input name='sort' type='number' value='{esort}' required></div>
          <div class='span-6'><div>Aktif</div><label class='cb'><input type='checkbox' name='enabled' {echecked}> Aktif</label></div>
        </div>
        <div style='height:10px'></div>
        <button class='btn primary' type='submit'>Kaydet</button>
        {"<a class='btn' href='/admin/kod-yonetimi?tab=seviyeler'>Yeni</a>" if editing else ""}
      </form>
    </div>
    """

    return "".join(rows + [form])
