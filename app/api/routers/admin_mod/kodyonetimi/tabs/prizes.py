# app/api/routers/admin_mod/kodyonetimi/tabs/prizes.py
from typing import List
from html import escape as _e
from sqlalchemy.orm import Session
from sqlalchemy.exc import ProgrammingError

from app.db.models import Prize, PrizeDistribution
from app.api.routers.admin_mod.kodyonetimi.helpers import _e as _esc, _img_cell, _tiers

def render_prizes(db: Session, request_query_params) -> str:
    prizes: List[Prize] = db.query(Prize).order_by(Prize.wheel_index).all()
    tiers = [t for t in _tiers(db) if t.enabled]

    parts: List[str] = []
    if not tiers:
        parts.append("<div class='card'><b>Uyarı:</b> Aktif seviye bulunamadı. Lütfen 'Seviyeler' sekmesinden ekleyin.</div>")

    # dağılım kayıtları
    dist_rows: List[PrizeDistribution] = []
    try:
        dist_rows = db.query(PrizeDistribution).all()
    except ProgrammingError:
        parts.append("<div class='card'><b>Uyarı:</b> Dağılım tablosu henüz oluşturulmamış görünüyor.</div>")
        dist_rows = []
    except Exception:
        parts.append("<div class='card'><b>Uyarı:</b> Dağılım verileri okunamadı.</div>")
        dist_rows = []

    # map'ler
    dist = {p.id: {t.key: 0 for t in tiers} for p in prizes}
    for d in dist_rows:
        if d.prize_id in dist and any(t.key == d.tier_key for t in tiers):
            dist[d.prize_id][d.tier_key] = int(d.weight_bp or 0)
    sums = {t.key: 0 for t in tiers}
    for p in prizes:
        for t in tiers:
            sums[t.key] += dist[p.id][t.key]

    # tablo + form (dağılım)
    rows: List[str] = [
        "<div class='card'><h1>Ödüller</h1>",
        "<div class='table-wrap'><form method='post' action='/admin/kod-yonetimi/prizes/dist/save' oninput='sumCheck()'><table>",
        "<tr>",
        "<th>Ad</th><th>Sıra</th><th>Görsel</th>",
        *[f"<th>{_esc(t.label)}<br/><small>%</small></th>" for t in tiers],
        "<th>Aktif</th><th style='width:110px'>İşlem</th></tr>",
    ]
    for p in prizes:
        cells = [
            f"<td>{_esc(p.label)}</td>",
            f"<td>{p.wheel_index}</td>",
            f"<td>{_img_cell(p.image_url)}</td>",
        ]
        for t in tiers:
            val_pct = dist[p.id][t.key] / 100
            cells.append(
                f"<td><input class='pct' data-tier='{_esc(t.key)}' name='w_{p.id}_{t.key}' "
                f"value='{val_pct}' type='number' step='0.01' min='0' max='100' style='width:80px'></td>"
            )
        checked = "checked" if getattr(p, "enabled", True) else ""
        cells.append(f"<td><input type='checkbox' name='en_{p.id}' {checked}></td>")
        cells.append(
            "<td>"
            f"<a class='btn small' href='/admin/kod-yonetimi?tab=oduller&edit={p.id}'>Düzenle</a> "
            f"<form method='post' action='/admin/kod-yonetimi/prizes/delete' style='display:inline' onsubmit=\"return confirm('Silinsin mi?')\">"
            f"<input type='hidden' name='id' value='{p.id}' />"
            f"<button class='btn small' type='submit'>Sil</button></form>"
            "</td>"
        )
        rows.append("<tr>" + "".join(cells) + "</tr>")

    # toplam satırı
    sum_cells = ["<td colspan='3' style='text-align:right'><b>Toplam (%)</b></td>"]
    for t in tiers:
        sum_cells.append(f"<td><b id='sum_{_esc(t.key)}'>{sums[t.key]/100:.2f}</b></td>")
    sum_cells += ["<td></td><td></td>"]
    rows.append("<tr>" + "".join(sum_cells) + "</tr>")

    rows.append(
        "</table><div style='height:8px'></div>"
        "<div id='sumWarn' class='muted'></div>"
        "<button id='saveBtn' class='btn primary' type='submit'>Dağılımları Kaydet</button>"
        "</form></div></div>"
    )

    # ödül ekle/düzenle formu (mevcut davranış)
    edit_id = (request_query_params.get("edit") or "").strip()
    editing = db.get(Prize, int(edit_id)) if edit_id.isdigit() else None

    eid = editing.id if editing else ""
    elabel = editing.label if editing else ""
    ewi = editing.wheel_index if editing else ""
    eurl = getattr(editing, "image_url", "") or ""

    form = f"""
    <div class='card'>
      <h1>{'Ödül Düzenle' if editing else 'Yeni Ödül'}</h1>
      <form method='post' action='/admin/kod-yonetimi/prizes/upsert'>
        {f'<input type="hidden" name="id" value="{eid}">' if editing else ''}
        <div class='grid'>
          <div class='span-6'><div>Sıralama</div><input name='wheel_index' type='number' value='{ewi}' required></div>
          <div class='span-6'><div>Ad</div><input name='label' value='{_esc(elabel)}' required></div>
        </div>
        <div style='height:8px'></div>
        <div>Görsel URL</div>
        <input name='image_url' value='{_esc(eurl)}' placeholder='https://... veya /static/...'>
        <div style='height:10px'></div>
        <button class='btn primary' type='submit'>Kaydet</button>
      </form>
    </div>
    """

    # JS toplam kontrol
    tiers_keys_js = [t.key for t in tiers]
    js = """
    <script>
    function sumCheck(){
      var tiers = %s;
      var ok = true, messages = [];
      tiers.forEach(function(tk){
        var inputs = Array.from(document.querySelectorAll("input.pct[data-tier='"+tk+"']"));
        var sum = inputs.reduce(function(a,el){ var v=parseFloat(el.value||"0"); return a+(isNaN(v)?0:v); }, 0);
        var sumEl = document.getElementById('sum_'+tk);
        if(sumEl) sumEl.textContent = sum.toFixed(2);
        if(Math.abs(sum-100) > 0.005){ ok=false; messages.push(tk + " = " + sum.toFixed(2) + "%%"); }
      });
      var warn = document.getElementById('sumWarn');
      var btn = document.getElementById('saveBtn');
      if(!ok){
        if(warn) warn.textContent = "Toplam %%100 olmalı: " + messages.join(" | ");
        if(btn) btn.disabled = true;
      }else{
        if(warn) warn.textContent = "";
        if(btn) btn.disabled = false;
      }
    }
    document.addEventListener('blur', function(e){
      if(!e.target || !e.target.classList || !e.target.classList.contains('pct')) return;
      var row = e.target.closest('tr'); if(!row) return;
      var inputs = Array.from(row.querySelectorAll('input.pct'));
      if(inputs.length === 0) return;
      var filled = inputs.slice(0,-1);
      var sum = filled.reduce(function(a,el){ var v=parseFloat(el.value||"0"); return a+(isNaN(v)?0:v); },0);
      var last = inputs[inputs.length-1];
      var remain = 100 - sum;
      if(remain < 0) remain = 0;
      last.value = remain.toFixed(2);
      sumCheck();
    }, true);
    sumCheck();
    </script>
    """ % (str(tiers_keys_js).replace("'", "\""))

    parts += rows + [form, js]
    return "".join(parts)
