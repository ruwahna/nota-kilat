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
  type:"faktur", theme:"zamrud", style:"classic", seq:1,
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
  renderItems(); syncChrome();
}
FIELDS.forEach(k => $(k).addEventListener("input", e => { S[k]=e.target.value; update(); }));
["city","city2"].forEach(k => $(k).addEventListener("input", e => { S.city=e.target.value; $(k==="city"?"city2":"city").value=S.city; update(); }));

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
  document.querySelectorAll("[data-for]").forEach(el=>el.hidden = !el.dataset.for.split(" ").includes(S.type));
  $("buyerTitle").textContent = S.type==="kuitansi" ? "Diterima dari" : S.type==="nota" ? "Pembeli" : "Ditagihkan kepada";
  $("bNameLbl").textContent = S.type==="kuitansi" ? "Nama pembayar" : "Nama pelanggan";
  $("paperLabel").textContent = "Pratinjau · " + (S.type==="nota" ? "Nota 80 mm" : S.type==="kuitansi" ? "Kuitansi" : "A4");
}

/* ---------- document render ---------- */
function headHTML(title){
  const initials = (S.sName||"?").replace(/^contoh:\s*/i,"").split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join("").toUpperCase();
  const logo = S.sLogo ? `<img class="logo" src="${S.sLogo}" alt="">` : `<div class="mono-logo">${esc(initials||"?")}</div>`;
  const contact = [S.sAddr, [S.sPhone,S.sEmail].filter(Boolean).join(" · ")].filter(Boolean).join("\n");
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
  $("stage").innerHTML = `<article class="paper ${S.type} s-${S.style}" style="--accent:${th.a};--tint:${th.t}">${html}</article>`;
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

/* Print works only when opened as a standalone file, not inside the embedded viewer */
let topLevel=false; try { topLevel = window.self === window.top; } catch(e) {}
if (topLevel) { $("printBtn").hidden=false; $("printHint").textContent="Isian tersimpan otomatis di browser ini. Saat mencetak, pilih \"Simpan sebagai PDF\" untuk file PDF."; }
$("printBtn").addEventListener("click", () => window.print());

fillForm(); update();
if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

