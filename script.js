const THEMES = [
  {id:"zamrud", name:"Zamrud", a:"#0F766E", t:"#E6F3F1"},
  {id:"nila",   name:"Nila",   a:"#3B3FB6", t:"#ECEDFB"},
  {id:"bata",   name:"Bata",   a:"#B4472B", t:"#FBEEE9"},
  {id:"kunyit", name:"Kunyit", a:"#B26B00", t:"#FBF2E1"},
  {id:"plum",   name:"Plum",   a:"#8A2A7A", t:"#F7EAF4"},
  {id:"laut",   name:"Laut",   a:"#0E6BA8", t:"#E7F1F9"},
  {id:"arang",  name:"Arang",  a:"#2B2F2D", t:"#EEF0EE"}
];
const PREFIX = {faktur:"INV", kuitansi:"KW", nota:"NT"};
const today = () => new Date().toISOString().slice(0,10);
const plusDays = (d,n) => { const x=new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
const makeNo = (type, seq) => { const d=new Date(); return `${PREFIX[type]}/${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,"0")}/${String(seq).padStart(3,"0")}`; };

const SAMPLE = () => ({
  type:"faktur", theme:"zamrud", style:"classic", size:"auto", seq:1,
  sName:"Contoh: Studio Ronin Kreatif", sAddr:"Jl. Kemang Raya No. 12\nJakarta Selatan 12730", sPhone:"0812-3456-7890", sEmail:"halo@contoh.id", sLogo:"",
  bName:"PT Maju Bersama", bAddr:"Jl. Sudirman Kav. 21, Jakarta Pusat",
  no:makeNo("faktur",1), date:today(), due:plusDays(today(),14), city:"Jakarta",
  items:[{d:"Desain landing page",p:3500000},{d:"Pengembangan WordPress (halaman)",p:2250000},{d:"Hosting & domain 1 tahun",p:850000}],
  disc:250000, tax:11,
  amount:1500000, purpose:"Uang muka pembuatan website company profile", method:"Transfer bank",
  bank:"BCA 123 456 7890 a.n. Studio Ronin Kreatif", notes:"Terima kasih atas kepercayaan Anda.", signer:"Rizky Pratama"
});

let S;
try { S = JSON.parse(localStorage.getItem("notakilat") || "null"); } catch(e) { S = null; }
if (!S) S = SAMPLE();

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const rp = n => "Rp " + Math.round(Number(n)||0).toLocaleString("id-ID");
const tgl = d => { if(!d) return "-"; const x=new Date(d+"T00:00"); return isNaN(x)?"-":x.toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}); };

function terbilang(n){
  n = Math.floor(Math.abs(Number(n)||0));
  const s=["","satu","dua","tiga","empat","lima","enam","tujuh","delapan","sembilan","sepuluh","sebelas"];
  const f = x => {
    if (x<12) return s[x];
    if (x<20) return f(x-10)+" belas";
    if (x<100) return f(Math.floor(x/10))+" puluh "+f(x%10);
    if (x<200) return "seratus "+f(x-100);
    if (x<1000) return f(Math.floor(x/100))+" ratus "+f(x%100);
    if (x<2000) return "seribu "+f(x-1000);
    if (x<1e6) return f(Math.floor(x/1000))+" ribu "+f(x%1000);
    if (x<1e9) return f(Math.floor(x/1e6))+" juta "+f(x%1e6);
    if (x<1e12) return f(Math.floor(x/1e9))+" miliar "+f(x%1e9);
    return f(Math.floor(x/1e12))+" triliun "+f(x%1e12);
  };
  return n===0 ? "nol rupiah" : (f(n).replace(/\s+/g," ").trim()+" rupiah");
}

function calc(){
  if (S.type==="kuitansi") { const t=Number(S.amount)||0; return {sub:t, disc:0, tax:0, total:t}; }
  const sub = S.items.reduce((a,i)=>a+(Number(i.p)||0),0);
  const disc = Math.min(Number(S.disc)||0, sub);
  const tax = S.type==="faktur" ? Math.round((sub-disc)*(Number(S.tax)||0)/100) : 0;
  return {sub, disc, tax, total:sub-disc+tax};
}

function save(){ try{ localStorage.setItem("notakilat", JSON.stringify(S)); }catch(e){} }

/* ---------- form binding ---------- */
const FIELDS = ["sName","sAddr","sPhone","sEmail","bName","bAddr","no","date","due","disc","tax","amount","purpose","method","bank","notes","signer"];
function fillForm(){
  FIELDS.forEach(k => { $(k).value = S[k] ?? ""; });
  $("city").value = S.city || ""; $("city2").value = S.city || "";
  if ($("docSize")) $("docSize").value = S.size || "auto";
  renderItems(); syncChrome();
}
FIELDS.forEach(k => $(k).addEventListener("input", e => { S[k]=e.target.value; update(); }));
["city","city2"].forEach(k => $(k).addEventListener("input", e => { S.city=e.target.value; $(k==="city"?"city2":"city").value=S.city; update(); }));
$("docSize")?.addEventListener("change", e => { S.size = e.target.value; update(); });

$("sLogo").addEventListener("change", e => {
  const file = e.target.files[0]; if (!file) return;
  if (file.size > 1.5e6) { toast("Logo terlalu besar. Pakai gambar di bawah 1,5 MB."); return; }
  const r = new FileReader(); r.onload = () => { S.sLogo = r.result; update(); }; r.readAsDataURL(file);
});

function renderItems(){
  const box = $("items");
  box.innerHTML = `<div class="item item-head"><span>Deskripsi</span><span>Harga</span><span></span></div>` +
    S.items.map((it,i)=>`<div class="item">
      <input id="d${i}" data-i="${i}" data-k="d" value="${esc(it.d)}" aria-label="Deskripsi baris ${i+1}">
      <input id="p${i}" data-i="${i}" data-k="p" type="number" min="0" step="1000" value="${esc(it.p)}" aria-label="Harga baris ${i+1}">
      <button type="button" class="x" data-del="${i}" aria-label="Hapus baris ${i+1}">×</button></div>`).join("");
}
$("items").addEventListener("input", e => { const t=e.target; if(t.dataset.i==null) return; S.items[t.dataset.i][t.dataset.k]=t.value; update(); });
$("items").addEventListener("click", e => { const d=e.target.dataset.del; if(d==null) return; S.items.splice(Number(d),1); renderItems(); update(); });
$("addItem").addEventListener("click", () => { S.items.push({d:"",p:0}); renderItems(); update(); $("d"+(S.items.length-1)).focus(); });

document.querySelectorAll(".types button").forEach(b => b.addEventListener("click", () => {
  const prev = S.type; S.type = b.dataset.type;
  if (S.no && S.no.startsWith(PREFIX[prev]+"/")) S.no = S.no.replace(PREFIX[prev]+"/", PREFIX[S.type]+"/");
  $("no").value = S.no; syncChrome(); update();
}));

$("swatches").innerHTML = THEMES.map(t=>`<button type="button" class="sw" data-theme-id="${t.id}" style="--sw-tint:${t.t}" aria-pressed="false"><i style="background:${t.a}"></i>${t.name}</button>`).join("");
$("swatches").addEventListener("click", e => { const b=e.target.closest(".sw"); if(!b) return; S.theme=b.dataset.themeId; syncChrome(); update(); });
$("styles").addEventListener("click", e => { const b=e.target.closest("[data-style]"); if(!b) return; S.style=b.dataset.style; syncChrome(); update(); });

function syncChrome(){
  document.querySelectorAll(".types button").forEach(b=>b.setAttribute("aria-pressed", b.dataset.type===S.type));
  document.querySelectorAll(".sw").forEach(b=>b.setAttribute("aria-pressed", b.dataset.themeId===S.theme));
  document.querySelectorAll("[data-style]").forEach(b=>b.classList.toggle("primary", b.dataset.style===S.style));
  
  // Tampilkan hanya field yang relevan untuk tipe aktif
  document.querySelectorAll("[data-for]").forEach(el=>{
    const types = el.dataset.for.split(" ");
    el.hidden = !types.includes(S.type);
  });

  if ($("buyerTitle")) $("buyerTitle").textContent = S.type==="kuitansi" ? "Diterima dari" : S.type==="nota" ? "Data Pembeli" : "Ditagihkan kepada";
  if ($("bNameLbl")) $("bNameLbl").textContent = S.type==="kuitansi" ? "Nama pembayar" : S.type==="nota" ? "Nama pembeli (opsional)" : "Nama pelanggan / perusahaan";
  if ($("signerLbl")) $("signerLbl").textContent = S.type==="kuitansi" ? "Nama penerima uang" : S.type==="nota" ? "Kasir / Hormat kami" : "Nama penanda tangan";
  if ($("closeTitle")) $("closeTitle").textContent = S.type==="faktur" ? "Penutup & Rekening" : S.type==="kuitansi" ? "Penerima & Catatan" : "Catatan & Kasir";
  $("paperLabel").textContent = "Pratinjau · " + (S.type==="nota" ? "Nota 80 mm" : S.type==="kuitansi" ? "Kuitansi A4" : "Faktur A4");
}

/* ---------- document render ---------- */
function headHTML(title){
  const initials = (S.sName||"?").replace(/^contoh:\s*/i,"").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const logo = S.sLogo ? `<img class="logo" src="${S.sLogo}" alt="">` : `<div class="mono-logo">${esc(initials||"?")}</div>`;
  const contact = [S.sAddr, [S.sPhone, (S.type!=="nota"?S.sEmail:"")].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
  return `<div class="p-head">
    <div class="seller">${logo}<div><b>${esc(S.sName||"Nama usaha")}</b><small>${esc(contact)}</small></div></div>
    <div class="doc-title"><h3>${title}</h3><div class="no num">No. ${esc(S.no||"-")}</div></div></div>`;
}
function signHTML(){
  return `<div class="sign">${esc(S.city?S.city+", ":"")}${tgl(S.date)}<br>${S.type==="kuitansi"?'Penerima,<div class="stamp">Materai</div>':"Hormat kami,"}<div class="line">${esc(S.signer||"(................)")}</div></div>`;
}

function renderFaktur(c){
  const rows = S.items.map((it,i)=>`<tr><td class="num">${i+1}</td><td>${esc(it.d||"-")}</td><td class="r num">${rp(it.p)}</td></tr>`).join("");
  return `<div class="band"></div>${headHTML("Faktur")}
  <div class="meta">
    <div><div class="k">Ditagihkan kepada</div><div class="v">${esc(S.bName||"-")}<small>${esc(S.bAddr)}</small></div></div>
    <div><div class="k">Tanggal faktur</div><div class="v">${tgl(S.date)}</div></div>
    <div><div class="k">Jatuh tempo</div><div class="v">${tgl(S.due)}</div></div>
  </div>
  <table class="lines"><thead><tr><th style="width:34px">No</th><th>Deskripsi</th><th class="r" style="width:140px">Jumlah</th></tr></thead><tbody>${rows||'<tr><td colspan="3">Belum ada baris.</td></tr>'}</tbody></table>
  <div class="totals num">
    <div><span>Subtotal</span><span>${rp(c.sub)}</span></div>
    ${c.disc?`<div><span>Diskon</span><span>− ${rp(c.disc)}</span></div>`:""}
    ${Number(S.tax)?`<div><span>PPN ${esc(S.tax)}%</span><span>${rp(c.tax)}</span></div>`:""}
    <div class="grand"><span>Total tagihan</span><span>${rp(c.total)}</span></div>
  </div>
  <div class="words">Terbilang: ${terbilang(c.total)}</div>
  <div class="foot"><div class="notes">${S.bank?`<b>Pembayaran</b>${esc(S.bank)}\n\n`:""}${S.notes?`<b>Catatan</b>${esc(S.notes)}`:""}</div>${signHTML()}</div>`;
}

function renderKuitansi(c){
  return `<div class="band"></div>${headHTML("Kuitansi")}
  <div class="kw-body">
    <div class="k">Sudah terima dari</div><div class="v">${esc(S.bName||"-")}</div>
    <div class="k">Uang sejumlah</div><div class="v"><div class="v say">${terbilang(c.total)}</div></div>
    <div class="k">Untuk pembayaran</div><div class="v">${esc(S.purpose||"-")}</div>
    <div class="k">Metode</div><div class="v">${esc(S.method)}</div>
  </div>
  <div class="foot"><div><div class="kw-amt num"><span>Rp</span>${Math.round(c.total).toLocaleString("id-ID")},-</div>${S.notes?`<div class="notes" style="margin-top:14px">${esc(S.notes)}</div>`:""}</div>${signHTML()}</div>`;
}

function renderNota(c){
  const rows = S.items.map(it=>`<div class="nota-line"><span class="d">${esc(it.d||"-")}</span><span class="q num"><span></span><span>${rp(it.p)}</span></span></div>`).join("");
  return `<div class="band"></div>${headHTML("Nota")}
  <div class="nota-meta num"><span>${tgl(S.date)}</span><span>${esc(S.bName?("Kpd: "+S.bName):"")}</span></div>
  <div>${rows||"Belum ada barang."}</div>
  <div class="totals num">
    <div><span>Subtotal</span><span>${rp(c.sub)}</span></div>
    ${c.disc?`<div><span>Diskon</span><span>− ${rp(c.disc)}</span></div>`:""}
    <div class="grand"><span>Total</span><span>${rp(c.total)}</span></div>
  </div>
  <div class="words" style="font-size:11.5px">${terbilang(c.total)}</div>
  <div class="foot">${S.notes?`<div class="notes">${esc(S.notes)}</div>`:""}${signHTML()}</div>`;
}

function update(){
  const c = calc();
  const th = THEMES.find(t=>t.id===S.theme) || THEMES[0];
  const html = S.type==="kuitansi" ? renderKuitansi(c) : S.type==="nota" ? renderNota(c) : renderFaktur(c);
  const sizeClass = S.size === "full" ? "size-full" : "size-auto";
  $("stage").innerHTML = `<article class="paper ${S.type} s-${S.style} ${sizeClass}" style="--accent:${th.a};--tint:${th.t}">${html}</article>`;
  $("totalLabel").textContent = rp(c.total);
  save(); fit();
}

/* scale paper to the desk width */
function fit(){
  const wrap=$("stageWrap"), stage=$("stage"), paper=stage.firstElementChild; if(!paper) return;
  stage.style.transform="none"; stage.style.width=""; stage.style.height="";
  const w=paper.offsetWidth, h=paper.offsetHeight, avail=wrap.clientWidth;
  const k=Math.min(1, avail/w);
  stage.style.width=w+"px"; stage.style.transform=`scale(${k})`;
  wrap.style.height=(h*k)+"px"; stage.style.marginLeft=Math.max(0,(avail-w*k)/2)+"px";
}
try { new ResizeObserver(fit).observe($("stageWrap")); } catch(e) { addEventListener("resize", fit); }

/* ---------- actions ---------- */
let tt; function toast(m){ $("toast").textContent=m; clearTimeout(tt); tt=setTimeout(()=>$("toast").textContent="",3000); }

$("copyBtn").addEventListener("click", () => {
  const c=calc(), name={faktur:"Faktur",kuitansi:"Kuitansi",nota:"Nota"}[S.type];
  const lines=[`${name} ${S.no}`, `${S.sName}`, `Kepada: ${S.bName}`, `Tanggal: ${tgl(S.date)}`];
  if (S.type!=="kuitansi") S.items.forEach(i=>lines.push(`- ${i.d} = ${rp(i.p)}`)); else lines.push(`Untuk: ${S.purpose}`);
  lines.push(`Total: ${rp(c.total)}`, `Terbilang: ${terbilang(c.total)}`); if (S.type==="faktur"&&S.bank) lines.push(`Pembayaran: ${S.bank}`);
  const text=lines.join("\n");
  navigator.clipboard.writeText(text).then(()=>toast("Ringkasan disalin. Tempel di WhatsApp atau email."), ()=>toast("Browser menolak menyalin. Coba di browser lain."));
});
$("nextBtn").addEventListener("click", () => {
  S.seq=(Number(S.seq)||1)+1; S.no=makeNo(S.type,S.seq); S.date=today(); S.due=plusDays(today(),14);
  S.bName=""; S.bAddr=""; S.items=[{d:"",p:0}]; S.disc=0; S.amount=0; S.purpose="";
  fillForm(); update(); toast(`Dokumen baru ${S.no}. Data usaha Anda tetap disimpan.`);
});
let armed=false;
$("resetBtn").addEventListener("click", e => {
  if(!armed){ armed=true; e.target.textContent="Yakin? Klik lagi"; setTimeout(()=>{armed=false;e.target.textContent="Kosongkan";},3000); return; }
  armed=false; e.target.textContent="Kosongkan";
  S = Object.assign(SAMPLE(), {sName:"",sAddr:"",sPhone:"",sEmail:"",bName:"",bAddr:"",items:[{d:"",p:0}],disc:0,amount:0,purpose:"",bank:"",notes:"",signer:"",city:""});
  fillForm(); update(); toast("Semua isian dikosongkan.");
});

/* Print action */
function doPrint() {
  saveToHistory(true);
  window.print();
}
const p1 = $("printBtn");
if (p1) p1.addEventListener("click", doPrint);
const p2 = $("printBtn2");
if (p2) p2.addEventListener("click", doPrint);

/* ---------- REKAP & RIWAYAT SYSTEM ---------- */
let HISTORY = [];
try {
  HISTORY = JSON.parse(localStorage.getItem("notakilat_history") || "[]");
  if (!Array.isArray(HISTORY)) HISTORY = [];
} catch(e) { HISTORY = []; }

let currentHistoryFilter = "all";

function saveHistoryStorage() {
  try { localStorage.setItem("notakilat_history", JSON.stringify(HISTORY)); } catch(e) {}
}

function saveToHistory(silent = false) {
  const c = calc();
  const summaryName = S.bName?.trim() || "Tanpa Nama";
  const desc = S.type === "kuitansi" 
    ? (S.purpose || "-") 
    : (S.items && S.items.map(it=>it.d).filter(Boolean).join(", ")) || "-";
  
  const record = {
    id: Date.now().toString(),
    savedAt: new Date().toISOString(),
    type: S.type,
    no: S.no || "-",
    date: S.date || today(),
    buyer: summaryName,
    desc: desc,
    total: c.total,
    payload: JSON.parse(JSON.stringify(S))
  };

  // Jika no dokumen sudah ada di history, perbarui
  const existingIdx = HISTORY.findIndex(h => h.no && h.no === record.no);
  if (existingIdx >= 0) {
    HISTORY[existingIdx] = record;
  } else {
    HISTORY.unshift(record);
  }

  saveHistoryStorage();
  renderHistory();
  if (!silent) toast("✅ Dokumen berhasil dicatat ke Rekap & Riwayat!");
}

$("saveHistoryBtn")?.addEventListener("click", () => saveToHistory(false));

function renderHistory() {
  // Update Statistik
  const totalCount = HISTORY.length;
  const kwCount = HISTORY.filter(h => h.type === "kuitansi").length;
  const notaCount = HISTORY.filter(h => h.type === "nota").length;
  const totalNominal = HISTORY.reduce((acc, h) => acc + (Number(h.total) || 0), 0);

  if ($("statTotalCount")) $("statTotalCount").textContent = totalCount;
  if ($("statKwCount")) $("statKwCount").textContent = kwCount;
  if ($("statNotaCount")) $("statNotaCount").textContent = notaCount;
  if ($("statTotalNominal")) $("statTotalNominal").textContent = rp(totalNominal);

  // Filter data
  const filtered = currentHistoryFilter === "all" 
    ? HISTORY 
    : HISTORY.filter(h => h.type === currentHistoryFilter);

  const tbody = $("historyBody");
  if (!tbody) return;

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--muted)">Belum ada riwayat dokumen yang tercatat. Buat dan simpan dokumen untuk melihat rekapannya di sini.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((h, i) => {
    const badgeClass = h.type === "kuitansi" ? "badge-kuitansi" : h.type === "nota" ? "badge-nota" : "badge-faktur";
    const typeLabel = h.type === "kuitansi" ? "Kuitansi" : h.type === "nota" ? "Nota" : "Faktur";
    return `<tr>
      <td class="num">${i + 1}</td>
      <td class="num">${tgl(h.date)}</td>
      <td class="num" style="font-weight:600">${esc(h.no)}</td>
      <td><span class="badge ${badgeClass}">${typeLabel}</span></td>
      <td><b>${esc(h.buyer)}</b><br><small style="color:var(--muted)">${esc(h.desc)}</small></td>
      <td class="num" style="text-align:right;font-weight:700">${rp(h.total)}</td>
      <td>
        <div class="action-cell">
          <button type="button" data-load-id="${h.id}" title="Muat ke formulir">Buka</button>
          <button type="button" class="btn-del" data-del-id="${h.id}" title="Hapus dari riwayat">Hapus</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

// Event delegation untuk Buka & Hapus baris riwayat
$("historyBody")?.addEventListener("click", e => {
  const loadId = e.target.dataset.loadId;
  const delId = e.target.dataset.delId;

  if (loadId) {
    const item = HISTORY.find(h => h.id === loadId);
    if (!item) return;
    S = JSON.parse(JSON.stringify(item.payload));
    fillForm();
    update();
    toast(`📂 Dokumen ${item.no} (${item.buyer}) dimuat ke formulir.`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (delId) {
    if (confirm("Hapus catatan dokumen ini dari riwayat?")) {
      HISTORY = HISTORY.filter(h => h.id !== delId);
      saveHistoryStorage();
      renderHistory();
      toast("Dokumen dihapus dari riwayat.");
    }
  }
});

// Filter tabs
$("historyFilter")?.addEventListener("click", e => {
  const btn = e.target.closest("button");
  if (!btn || !btn.dataset.filter) return;
  $("historyFilter").querySelectorAll("button").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  currentHistoryFilter = btn.dataset.filter;
  renderHistory();
});

// Export Excel Spreadsheet (.xlsx)
$("exportHistoryBtn")?.addEventListener("click", () => {
  if (HISTORY.length === 0) {
    toast("Belum ada riwayat dokumen untuk diexport.");
    return;
  }

  // Format data tabel untuk Excel
  const data = HISTORY.map((h, i) => ({
    "No": i + 1,
    "Tanggal": h.date || "-",
    "No. Dokumen": h.no || "-",
    "Jenis Dokumen": (h.type || "").toUpperCase(),
    "Nama Pelanggan / Pembayar": h.buyer || "-",
    "Keterangan / Keperluan": h.desc || "-",
    "Total Nominal (Rp)": Number(h.total) || 0
  }));

  // Jika library SheetJS tersedia, buat file .xlsx asli
  if (window.XLSX) {
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Atur lebar kolom agar rapi dan tidak terpotong di Excel
    ws['!cols'] = [
      { wch: 6 },  // No
      { wch: 14 }, // Tanggal
      { wch: 22 }, // No. Dokumen
      { wch: 15 }, // Jenis Dokumen
      { wch: 28 }, // Nama Pelanggan / Pembayar
      { wch: 38 }, // Keterangan / Keperluan
      { wch: 20 }  // Total Nominal
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap Dokumen");
    XLSX.writeFile(wb, `Rekap_Nota_Kuitansi_${today()}.xlsx`);
    toast("📊 Berhasil mengunduh spreadsheet Excel (.xlsx)!");
  } else {
    // Fallback: Excel HTML Spreadsheet (.xls)
    let tableHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Rekap Dokumen</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head>
    <body>
    <table border="1">
      <thead>
        <tr style="background:#0F766E;color:#FFFFFF;font-weight:bold;height:32px">
          <th>No</th><th>Tanggal</th><th>No. Dokumen</th><th>Jenis Dokumen</th><th>Nama Pelanggan / Pembayar</th><th>Keterangan / Keperluan</th><th>Total Nominal (Rp)</th>
        </tr>
      </thead>
      <tbody>
        ${data.map(d => `<tr><td align="center">${d["No"]}</td><td>${d["Tanggal"]}</td><td>${d["No. Dokumen"]}</td><td>${d["Jenis Dokumen"]}</td><td>${d["Nama Pelanggan / Pembayar"]}</td><td>${d["Keterangan / Keperluan"]}</td><td align="right">${d["Total Nominal (Rp)"]}</td></tr>`).join("")}
      </tbody>
    </table>
    </body></html>`;
    
    const blob = new Blob([tableHtml], { type: "application/vnd.ms-excel;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Rekap_Nota_Kuitansi_${today()}.xls`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast("📊 Berhasil mengunduh spreadsheet Excel (.xls)!");
  }
});

// Clear all history
let clearArmed = false;
$("clearHistoryBtn")?.addEventListener("click", e => {
  if (HISTORY.length === 0) {
    toast("Riwayat sudah kosong.");
    return;
  }
  if (!clearArmed) {
    clearArmed = true;
    e.target.textContent = "Yakin? Klik lagi";
    setTimeout(() => { clearArmed = false; e.target.textContent = "🗑️ Hapus Riwayat"; }, 3000);
    return;
  }
  clearArmed = false;
  e.target.textContent = "🗑️ Hapus Riwayat";
  HISTORY = [];
  saveHistoryStorage();
  renderHistory();
  toast("Semua riwayat dokumen telah dibersihkan.");
});

fillForm(); update(); renderHistory();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

/* ---------- mobile tab toggle ---------- */
const mobileTabs = $("mobileTabs");
if (mobileTabs) {
  const formEl = document.querySelector(".form");
  const deskEl = document.querySelector(".desk");
  mobileTabs.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    mobileTabs.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    if (btn.dataset.tab === "form") {
      formEl.classList.add("mobile-visible");
      deskEl.classList.remove("mobile-visible");
    } else {
      formEl.classList.remove("mobile-visible");
      deskEl.classList.add("mobile-visible");
      setTimeout(fit, 50);
    }
  });
}

