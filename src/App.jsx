import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { createClient } from "@supabase/supabase-js";

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════════════════════
const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_DISPLAY = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const FONT_NUM = "'SF Mono', ui-monospace, SFMono-Regular, Menlo, monospace";

/* Escala tipográfica — 12 · 13 · 14 · 16 · 18 · 22 · 28 · 34
   Corpo em 14/1.5. Títulos com tracking negativo proporcional ao tamanho
   (quanto maior o texto, mais fechado), como nas interfaces da Apple. */
const TS = {
  micro:  {size:11.5, lh:1.45, w:600, ls:".06em"},   // rótulos maiúsculos
  caption:{size:12.5, lh:1.5,  w:400, ls:"0"},       // apoio
  body:   {size:14,   lh:1.55, w:400, ls:"-.006em"}, // corpo
  bodyMd: {size:14,   lh:1.5,  w:550, ls:"-.008em"}, // corpo com ênfase
  lead:   {size:16,   lh:1.5,  w:400, ls:"-.011em"},
  h4:     {size:18,   lh:1.35, w:600, ls:"-.016em"},
  h3:     {size:22,   lh:1.28, w:650, ls:"-.021em"},
  h2:     {size:28,   lh:1.18, w:680, ls:"-.026em"},
  h1:     {size:34,   lh:1.12, w:700, ls:"-.032em"},
};
const tsCss = t => ({fontSize:t.size,lineHeight:t.lh,fontWeight:t.w,letterSpacing:t.ls});

const DS = {
  font:FONT, fontNum:FONT_NUM,
  bg:"#F6F6F4", canvas:"#FAFAF8", sur:"#FFFFFF", surEl:"#F3F3F1", surHov:"#EBEBEA",
  bd:"rgba(0,0,0,0.06)", bdM:"rgba(0,0,0,0.10)", bdS:"rgba(0,0,0,0.18)",
  i1:"#0C0C0B", i2:"#3D3D3B", i3:"#767672", i4:"#B0B0AC",
  ink:"#0C0C0B", blue:"#1A6BF5", blueSft:"#EDF2FF", blueBd:"#B8CFFF",
  ok:"#16A34A", okSft:"#F0FDF4", okBd:"#BBF7D0",
  warn:"#B45309", warnSft:"#FFFBEB", warnBd:"#FDE68A",
  err:"#C13515", errSft:"#FEF3F2", errBd:"#FECDCA",
  pu:"#5B21B6", puSft:"#F5F3FF", puBd:"#DDD6FE",
  stCut:  { c:"#92400E", s:"#FFFBEB", b:"#FDE68A" },
  stSew:  { c:"#1D4ED8", s:"#EFF6FF", b:"#BFDBFE" },
  stFin:  { c:"#5B21B6", s:"#F5F3FF", b:"#DDD6FE" },
  stDone: { c:"#15803D", s:"#F0FDF4", b:"#BBF7D0" },
  e0:"none",
  e1:"0 1px 2px rgba(0,0,0,0.04)",
  e2:"0 2px 8px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
  e3:"0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.04)",
  e4:"0 24px 64px rgba(0,0,0,0.10), 0 6px 20px rgba(0,0,0,0.06)",
  r4:4, r6:6, r8:8, r10:10, r12:12, r14:14, r16:16, r20:20,
  fast:"0.14s cubic-bezier(0.32, 0.72, 0, 1)",
  base:"0.22s cubic-bezier(0.32, 0.72, 0, 1)",
  slow:"0.34s cubic-bezier(0.32, 0.72, 0, 1)",
};

const GLOBAL_CSS = `
@keyframes cf-fade { from { opacity:0 } to { opacity:1 } }
@keyframes cf-rise { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes cf-scale { from { opacity:0; transform:scale(0.97) } to { opacity:1; transform:scale(1) } }
@keyframes cf-slideUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
* { box-sizing:border-box; -webkit-font-smoothing:antialiased; -moz-osx-font-smoothing:grayscale; }
html, body { margin:0; padding:0; font-synthesis:none; text-rendering:optimizeLegibility; }
body { font-family:${FONT}; font-size:14px; line-height:1.55; letter-spacing:-0.006em;
  font-feature-settings:"kern","liga","calt"; }

/* Títulos: fonte de display e tracking proporcional ao tamanho */
h1,h2,h3,h4 { font-family:${FONT_DISPLAY}; margin:0; }
h1 { font-size:34px; line-height:1.12; font-weight:700; letter-spacing:-.032em; }
h2 { font-size:28px; line-height:1.18; font-weight:680; letter-spacing:-.026em; }
h3 { font-size:22px; line-height:1.28; font-weight:650; letter-spacing:-.021em; }
h4 { font-size:18px; line-height:1.35; font-weight:600; letter-spacing:-.016em; }

/* Corpo nunca abaixo de 12px */
small, .caption { font-size:12.5px; line-height:1.5; }

input, select, textarea, button { font-family:inherit; letter-spacing:inherit; font-size:inherit; }
input::placeholder, textarea::placeholder { color:#B0B0AC; letter-spacing:-.004em; }

/* Números tabulares: colunas sempre alinhadas */
.tnum, [style*="tabular-nums"] { font-variant-numeric:tabular-nums;
  font-feature-settings:"tnum","zero","cv01"; }

/* Evita zoom automático no iOS ao focar um campo */
@media (max-width:768px){ input,select,textarea { font-size:16px !important; } }
html, body { margin:0; padding:0; max-width:100%; overflow-x:hidden; }
*::-webkit-scrollbar { width:10px; height:10px; }
*::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.12); border-radius:8px; border:2px solid transparent; background-clip:padding-box; }
*::-webkit-scrollbar-thumb:hover { background:rgba(0,0,0,0.22); background-clip:padding-box; }
*::-webkit-scrollbar-track { background:transparent; }
input:focus, select:focus, button:focus { outline:none; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; } }
`;

const STATUS_MAP = {
  Corte:      DS.stCut,
  Costura:    DS.stSew,
  Acabamento: DS.stFin,
  Finalizado: DS.stDone,
};
const STEPS = ["Corte","Costura","Acabamento","Finalizado"];

// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═══════════════════════════════════════════════════════════════════════════════
const _sbUrl  = import.meta.env.VITE_SUPABASE_URL  || "";
const _sbAnon = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = _sbUrl ? createClient(_sbUrl, _sbAnon, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
}) : null;

// ── Normalizers (db snake_case → app camelCase) ──
const normalizeProduct = r => ({
  id:r.id, sku:r.sku, name:r.name, category:r.category, collection:r.collection,
  sizes:r.sizes||[], colorFabrics:r.color_fabrics||[], trimUsage:r.trim_usage||[],
  cutPrice:Number(r.cut_price||0), sewPrice:Number(r.sew_price||0),
  finishPrice:Number(r.finish_price||0), active:r.active
});
const normalizeRM = r => ({
  id:r.id, code:r.code, desc:r.description, unit:r.unit,
  supplier:r.supplier, phone:r.phone,
  stock:Number(r.stock||0), min:Number(r.min_stock||0),
  avgCost:Number(r.avg_cost||0), colors:r.colors||[], hist:r.hist||[]
});
const normalizeTrim = r => ({
  id:r.id, code:r.code, desc:r.description, unit:r.unit,
  supplier:r.supplier, phone:r.phone,
  stock:Number(r.stock||0), min:Number(r.min_stock||0),
  avgCost:Number(r.avg_cost||0), hist:r.hist||[]
});
const normalizeOut = r => ({
  id:r.id, name:r.name, type:r.type, status:r.status,
  contact:r.contact, phone:r.phone, addr:r.address,
  deadline:r.deadline, dailyCap:r.daily_cap, hist:r.hist||[]
});
const normalizeProd = r => ({
  id:r.id, no:r.no, productId:r.product_id, status:r.status,
  qtys:r.qtys||[], total:r.total, totalFab:Number(r.total_fab||0),
  cutWs:r.cut_ws, sewWs:r.sew_ws, finWs:r.fin_ws,
  start:r.start_date, cutStart:r.cut_start, cutEnd:r.cut_end,
  sewStart:r.sew_start, sewEnd:r.sew_end, finStart:r.fin_start, finEnd:r.fin_end,
  cutC:Number(r.cut_cost||0), sewC:Number(r.sew_cost||0),
  finC:Number(r.fin_cost||0), matC:Number(r.mat_cost||0),
  trimC:Number(r.trim_cost||0), log:r.log||[]
});
const normalizePay = r => ({
  id:r.id, desc:r.description, cat:r.category,
  sup:r.supplier, phone:r.phone, amt:Number(r.amount||0),
  due:r.due_date, paid:r.paid_date, status:r.status,
  prodId:r.production_id, purchaseId:r.purchase_id, notes:r.notes
});
const normalizePurch = r => ({
  id:r.id, type:r.type, itemId:r.item_id, item:r.item_name,
  color:r.color, sup:r.supplier, phone:r.phone,
  qty:Number(r.qty||0), price:Number(r.unit_price||0), total:Number(r.total||0),
  pay:r.payment_method, parcelas:r.installments, date:r.purchase_date, notes:r.notes
});
const normalizeRevenue = r => ({
  id:r.id, month:r.month, goal:Number(r.goal||0),
  channels:r.channels||[], expenses:r.expenses||[], notes:r.notes
});
const normalizeProfile = r => ({
  id:r.id, name:r.name, username:r.username, role:r.role, active:r.active, tenant_id:r.tenant_id
});

// ── DB helpers — all async ──
const sb = {
  // Auth
  async signIn(email,pass){ const{data,error}=await supabase.auth.signInWithPassword({email,password:pass}); if(error)throw error; return data; },
  async signOut(){ await supabase.auth.signOut(); },
  onAuthChange(cb){ const{data:{subscription}}=supabase.auth.onAuthStateChange(cb); return ()=>subscription.unsubscribe(); },

  // Profile
  async getProfile(userId){
    const{data,error}=await supabase.from("profiles").select("*").eq("id",userId).single();
    if(error)throw error; return normalizeProfile(data);
  },
  async getProfiles(){
    const{data,error}=await supabase.from("profiles").select("*").order("name");
    if(error)throw error; return data.map(normalizeProfile);
  },

  // Load all data for a tenant session
  async loadAll(){
    const[
      {data:products,error:e1},{data:rawMaterials,error:e2},{data:trims,error:e3},
      {data:outsourced,error:e4},{data:productions,error:e5},{data:payables,error:e6},
      {data:purchases,error:e7},{data:users,error:e8},{data:revenue,error:e9}
    ]=await Promise.all([
      supabase.from("products").select("*").order("name"),
      supabase.from("raw_materials").select("*").order("description"),
      supabase.from("trims").select("*").order("description"),
      supabase.from("outsourced").select("*").order("name"),
      supabase.from("productions").select("*").order("created_at",{ascending:false}),
      supabase.from("payables").select("*").order("due_date"),
      supabase.from("purchases").select("*").order("purchase_date",{ascending:false}),
      supabase.from("profiles").select("*").order("name"),
      supabase.from("cf_revenue").select("*").order("month",{ascending:false}),
    ]);
    const err=[e1,e2,e3,e4,e5,e6,e7,e8,e9].find(Boolean);
    if(err)throw err;
    return {
      products:(products||[]).map(normalizeProduct),
      rawMaterials:(rawMaterials||[]).map(normalizeRM),
      trims:(trims||[]).map(normalizeTrim),
      outsourced:(outsourced||[]).map(normalizeOut),
      productions:(productions||[]).map(normalizeProd),
      payables:(payables||[]).map(normalizePay),
      purchases:(purchases||[]).map(normalizePurch),
      users:(users||[]).map(normalizeProfile),
      revenue:(revenue||[]).map(normalizeRevenue),
    };
  },

  // CRUD — Products
  async saveProduct(d,tenantId){
    const row={tenant_id:tenantId,sku:d.sku,name:d.name,category:d.category,
      collection:d.collection,sizes:d.sizes||[],color_fabrics:d.colorFabrics||[],
      trim_usage:d.trimUsage||[],cut_price:d.cutPrice,sew_price:d.sewPrice,
      finish_price:d.finishPrice,active:d.active!==false,...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("products").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeProduct(data);
  },
  async deleteProduct(id){ const{error}=await supabase.from("products").delete().eq("id",id); if(error)throw error; },

  // CRUD — Raw Materials (Tecidos)
  async saveRM(d,tenantId){
    const row={tenant_id:tenantId,code:d.code,description:d.desc,unit:d.unit,
      supplier:d.supplier,phone:d.phone,stock:d.stock,min_stock:d.min,
      avg_cost:d.avgCost,colors:d.colors||[],hist:d.hist||[],...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("raw_materials").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeRM(data);
  },
  async deleteRM(id){ const{error}=await supabase.from("raw_materials").delete().eq("id",id); if(error)throw error; },
  async updateRMStock(id,stock,colors,hist){
    const{data,error}=await supabase.from("raw_materials").update({stock,colors,hist}).eq("id",id).select().single();
    if(error)throw error; return normalizeRM(data);
  },

  // CRUD — Trims (Aviamentos)
  async saveTrim(d,tenantId){
    const row={tenant_id:tenantId,code:d.code,description:d.desc,unit:d.unit,
      supplier:d.supplier,phone:d.phone,stock:d.stock,min_stock:d.min,
      avg_cost:d.avgCost,hist:d.hist||[],...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("trims").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeTrim(data);
  },
  async deleteTrim(id){ const{error}=await supabase.from("trims").delete().eq("id",id); if(error)throw error; },
  async updateTrimStock(id,stock,hist){
    const{data,error}=await supabase.from("trims").update({stock,hist}).eq("id",id).select().single();
    if(error)throw error; return normalizeTrim(data);
  },

  // CRUD — Outsourced
  async saveOut(d,tenantId){
    const row={tenant_id:tenantId,name:d.name,type:d.type,status:d.status,
      contact:d.contact,phone:d.phone,address:d.addr,deadline:d.deadline,
      daily_cap:d.dailyCap,hist:d.hist||[],...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("outsourced").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeOut(data);
  },
  async deleteOut(id){ const{error}=await supabase.from("outsourced").delete().eq("id",id); if(error)throw error; },

  // CRUD — Productions
  async saveProd(d,tenantId){
    const row={tenant_id:tenantId,no:d.no,product_id:d.productId,status:d.status,
      qtys:d.qtys||[],total:d.total,total_fab:d.totalFab,
      cut_ws:d.cutWs,sew_ws:d.sewWs,fin_ws:d.finWs,
      start_date:d.start,cut_start:d.cutStart,cut_end:d.cutEnd,
      sew_start:d.sewStart,sew_end:d.sewEnd,fin_start:d.finStart,fin_end:d.finEnd,
      cut_cost:d.cutC,sew_cost:d.sewC,fin_cost:d.finC,mat_cost:d.matC,trim_cost:d.trimC,
      log:d.log||[],...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("productions").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeProd(data);
  },
  async deleteProd(id){ const{error}=await supabase.from("productions").delete().eq("id",id); if(error)throw error; },

  // CRUD — Payables
  async savePay(d,tenantId){
    const row={tenant_id:tenantId,description:d.desc,category:d.cat,supplier:d.sup,
      phone:d.phone,amount:d.amt,due_date:d.due,paid_date:d.paid,status:d.status,
      production_id:d.prodId||null,purchase_id:d.purchaseId||null,notes:d.notes,...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("payables").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizePay(data);
  },
  async insertPayBatch(arr,tenantId){
    const rows=arr.map(d=>({tenant_id:tenantId,description:d.desc,category:d.cat,
      supplier:d.sup,phone:d.phone,amount:d.amt,due_date:d.due,paid_date:d.paid,
      status:d.status,production_id:d.prodId||null,purchase_id:d.purchaseId||null,notes:d.notes}));
    const{data,error}=await supabase.from("payables").insert(rows).select();
    if(error)throw error; return data.map(normalizePay);
  },
  async updatePayStatus(id,status,paidDate){
    const{data,error}=await supabase.from("payables").update({status,paid_date:paidDate||null}).eq("id",id).select().single();
    if(error)throw error; return normalizePay(data);
  },
  async deletePay(id){ const{error}=await supabase.from("payables").delete().eq("id",id); if(error)throw error; },
  async deletePaysByPurchase(purchaseId){
    const{error}=await supabase.from("payables").delete().eq("purchase_id",purchaseId); if(error)throw error;
  },
  async deletePaysByProd(prodId){
    const{error}=await supabase.from("payables").delete().eq("production_id",prodId); if(error)throw error;
  },

  // CRUD — Purchases
  async savePurch(d,tenantId){
    const row={tenant_id:tenantId,type:d.type,item_id:d.itemId||null,item_name:d.item,
      color:d.color||null,supplier:d.sup,phone:d.phone,qty:d.qty,unit_price:d.price,
      total:d.total,payment_method:d.pay,installments:d.parcelas,purchase_date:d.date,notes:d.notes};
    if(d.id) row.id=d.id;
    const{data,error}=await supabase.from("purchases")
      .upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizePurch(data);
  },
  async deletePurch(id){ const{error}=await supabase.from("purchases").delete().eq("id",id); if(error)throw error; },

  // Users (profiles)
  async saveProfile(d,tenantId){
    const row={tenant_id:tenantId,name:d.name,username:d.username,role:d.role,active:d.active,...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("profiles").upsert(row,{onConflict:"id"}).select().single();
    if(error)throw error; return normalizeProfile(data);
  },
  async deleteProfile(id){ const{error}=await supabase.from("profiles").delete().eq("id",id); if(error)throw error; },

  // Faturamento por marketplace
  async saveRevenue(d,tenantId){
    const row={tenant_id:tenantId,month:d.month,goal:d.goal,
      channels:d.channels||[],expenses:d.expenses||[],notes:d.notes,...(d.id&&{id:d.id})};
    const{data,error}=await supabase.from("cf_revenue")
      .upsert(row,{onConflict:d.id?"id":"tenant_id,month"}).select().single();
    if(error)throw error; return normalizeRevenue(data);
  },
  async deleteRevenue(id){
    const{error}=await supabase.from("cf_revenue").delete().eq("id",id); if(error)throw error;
  },

  // Stock movements
  async logMovement(m,tenantId){
    const{error}=await supabase.from("stock_movements").insert({
      tenant_id:tenantId,item_type:m.itemType,item_id:m.itemId,item_name:m.itemName,
      movement_type:m.type,qty:m.qty,color:m.color||null,
      unit_cost:m.unitCost||null,reference:m.reference||null,notes:m.notes||null
    });
    if(error)console.warn("log movement error:",error);
  },
};

// Empty state (replaces SEED for production)
const EMPTY = {
  products:[], rawMaterials:[], trims:[], outsourced:[],
  productions:[], payables:[], purchases:[], users:[], revenue:[],
};


// ═══════════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════════
const R   = n => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n??0);
const FD  = d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR") : "—";
const FDsh= d => d ? new Date(d+"T12:00:00").toLocaleDateString("pt-BR",{day:"2-digit",month:"short"}) : "—";
const TODAY = new Date().toISOString().split("T")[0];
const addD  = (d,n)=>{ const x=new Date(d+"T12:00:00"); x.setDate(x.getDate()+n); return x.toISOString().split("T")[0]; };
const diffD = (a,b)=> Math.round((new Date(b+"T12:00:00")-new Date(a+"T12:00:00"))/86400000);
const isOD  = d => d && d < TODAY;
const isWK  = d => d && d >= TODAY && d <= addD(TODAY,7);
const isMO  = d => d && d >= TODAY && d.slice(0,7) === TODAY.slice(0,7);
const isTD  = d => d === TODAY;
const mean  = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0;
/* ─── CUSTO MÉDIO ────────────────────────────────────────────────
   As compras registradas são a única fonte da verdade.
   Média ponderada: soma(qtd × preço) ÷ soma(qtd).
   Ex.: 1.000m a R$7,00 + 1.000m a R$8,00 = R$7,50/m
        1.000m a R$7,00 +   500m a R$8,00 = R$7,33/m
   ──────────────────────────────────────────────────────────────── */
const avgFromPurchases = (purchases, itemId, tipo) => {
  const list=(purchases||[]).filter(p=>
    String(p.itemId)===String(itemId) &&
    (!tipo||p.type===tipo) &&
    Number(p.qty)>0 && Number(p.price)>0
  );
  if(!list.length) return null;                  // sem compras: mantém o valor manual
  const q=list.reduce((s,p)=>s+Number(p.qty),0);
  const v=list.reduce((s,p)=>s+Number(p.qty)*Number(p.price),0);
  return q>0 ? v/q : null;
};
/* Histórico legível de compras de um item */
const purchaseHistory = (purchases, itemId, tipo) =>
  (purchases||[])
    .filter(p=>String(p.itemId)===String(itemId)&&(!tipo||p.type===tipo))
    .sort((a,b)=>(b.date||"").localeCompare(a.date||""));
const pct   = (v,t) => t > 0 ? Math.round((v/t)*100) : 0;
const uid   = a => (a.length ? Math.max(...a.map(x=>x.id)) : 0)+1;

const periodFilter = (dateStr, period, customFrom, customTo) => {
  if (!dateStr) return false;
  const d = dateStr;
  switch(period) {
    case "today":   return d === TODAY;
    case "7d":      return d >= addD(TODAY,-7) && d <= TODAY;
    case "30d":     return d >= addD(TODAY,-30) && d <= TODAY;
    case "month":   return d.slice(0,7) === TODAY.slice(0,7);
    case "custom":  return d >= (customFrom||TODAY) && d <= (customTo||TODAY);
    default:        return true;
  }
};

function useViewport(){
  const [w,setW] = useState(typeof window!=="undefined"?window.innerWidth:1200);
  useEffect(()=>{
    const onR = ()=>setW(window.innerWidth);
    window.addEventListener("resize",onR);
    return ()=>window.removeEventListener("resize",onR);
  },[]);
  return { w, isSmall:w<768, isMid:w<1080 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BUSINESS LOGIC
// ═══════════════════════════════════════════════════════════════════════════════
const getAvgDays = (outsourced, type) => {
  const ws = outsourced.find(o => o.type === type && o.status === "Ativo");
  return ws ? Math.round(mean(ws.hist)) : (type==="Corte"?2:type==="Costura"?7:3);
};

const forecast = (prod, outsourced) => {
  const cD = getAvgDays(outsourced,"Corte");
  const sD = getAvgDays(outsourced,"Costura");
  const fD = getAvgDays(outsourced,"Acabamento");
  const cE = addD(prod.start, cD);
  const sE = addD(cE, sD);
  const fE = addD(sE, fD);
  const late = fE < TODAY && prod.status !== "Finalizado";
  const dLeft = prod.status !== "Finalizado" ? diffD(TODAY, fE) : 0;
  return { cD, sD, fD, cE, sE, fE, late, dLeft };
};

const getAlerts = data => {
  const out = [];
  data.payables.filter(p=>isOD(p.due)&&p.status!=="Pago").forEach(p=>out.push({type:"err",msg:"Vencida: "+p.desc+" — "+R(p.amt),page:"financial"}));
  data.payables.filter(p=>isTD(p.due)&&p.status!=="Pago").forEach(p=>out.push({type:"warn",msg:"Vence hoje: "+p.desc,page:"agenda"}));
  data.productions.filter(p=>p.status!=="Finalizado"&&forecast(p,data.outsourced).late).forEach(p=>out.push({type:"err",msg:"Produção atrasada: "+p.no,page:"productions",prodId:p.id}));
  return out;
};

/* O sistema não controla mais quantidade em estoque.
   Mantido como no-op para não quebrar as chamadas existentes. */
async function restoreStock(){ /* sem controle de quantidade */ }

// PDF print — ficha de corte/costura/acabamento com grade estilo planilha
const doPrint = (prod, product, step, outs) => {
  const ws = outs.find(o=>(step==="Costura"&&o.name===prod.sewWs)||(step==="Acabamento"&&o.name===prod.finWs)||(step==="Corte"&&o.name===prod.cutWs));
  const cost = step==="Corte"?prod.cutC:step==="Costura"?prod.sewC:prod.finC;

  // ── Grade cor × tamanho (matriz) ──
  const qtys = prod.qtys||[];
  const colors = [...new Set(qtys.map(q=>q.color))].filter(Boolean);
  const sizes  = [...new Set(qtys.map(q=>q.size))].filter(Boolean);
  const cell = (c,sz) => qtys.filter(q=>q.color===c&&q.size===sz).reduce((s,q)=>s+(q.qty||0),0);
  const rowTotal = c => sizes.reduce((s,sz)=>s+cell(c,sz),0);
  const colTotal = sz => colors.reduce((s,c)=>s+cell(c,sz),0);
  const grandTotal = colors.reduce((s,c)=>s+rowTotal(c),0);
  const fabOf = c => qtys.filter(q=>q.color===c).reduce((s,q)=>s+(q.fab||0),0);
  const forroOf = c => qtys.filter(q=>q.color===c).reduce((s,q)=>s+(q.forroFab||0),0);
  const rmOf = c => qtys.find(q=>q.color===c)?.rmName||"—";
  const forroRmOf = c => qtys.find(q=>q.color===c&&q.forroRmName)?.forroRmName||null;
  const hasForro = qtys.some(q=>q.forroFab>0);
  const totalFab = colors.reduce((s,c)=>s+fabOf(c),0);
  const totalForro = colors.reduce((s,c)=>s+forroOf(c),0);

  const gradeRows = colors.map(c=>`<tr>
    <td class="lft"><b>${c}</b><div class="rm">${rmOf(c)}</div></td>
    ${sizes.map(sz=>{const v=cell(c,sz);return `<td class="${v?"":"zero"}">${v||"·"}</td>`}).join("")}
    <td class="tot">${rowTotal(c)}</td>
    <td class="mtr">${fabOf(c).toFixed(2)}m</td>
    ${hasForro?`<td class="mtr">${forroOf(c)?forroOf(c).toFixed(2)+"m":"—"}</td>`:""}
  </tr>`).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Ficha ${prod.no}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:12mm}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:28px;font-size:13px;color:#0c0c0b;background:#fff}
.wrap{max-width:190mm;margin:0 auto}
.brand{font-size:18px;font-weight:800;letter-spacing:-.5px;margin-bottom:2px}.brand span{color:#1A6BF5}
.subtitle{font-size:11px;color:#767672;margin-bottom:22px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
  padding-bottom:16px;border-bottom:2px solid #0c0c0b;margin-bottom:18px}
h1{font-size:20px;font-weight:700;margin-bottom:3px;letter-spacing:-.4px}
.op{font-size:12px;color:#767672}
.step{display:inline-block;padding:5px 13px;border-radius:20px;background:#0c0c0b;color:#fff;
  font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.07em}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.lbl{font-size:9.5px;color:#767672;text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:3px}
.val{font-size:14px;font-weight:600;letter-spacing:-.01em}
h2{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#767672;margin:0 0 9px;font-weight:700}
/* grade estilo planilha */
table.grade{width:100%;border-collapse:collapse;margin-bottom:22px;font-variant-numeric:tabular-nums}
table.grade th{background:#0c0c0b;color:#fff;padding:9px 8px;font-size:11px;font-weight:700;
  text-align:center;border:1px solid #0c0c0b;white-space:nowrap}
table.grade th.lft{text-align:left;min-width:130px}
table.grade td{padding:9px 8px;text-align:center;border:1px solid #d8d8d4;font-size:13px}
table.grade td.lft{text-align:left;font-size:12.5px;line-height:1.35}
table.grade td .rm{font-size:10px;color:#767672;font-weight:400;margin-top:1px}
table.grade td.zero{color:#c4c4c0}
table.grade td.tot{font-weight:800;background:#f3f3f1}
table.grade td.mtr{font-size:11.5px;color:#3d3d3b;background:#fafaf8}
table.grade tr:nth-child(even) td{background:#fbfbf9}
table.grade tr:nth-child(even) td.tot{background:#eeeeec}
table.grade tr.sum td{background:#f3f3f1;font-weight:800;border-top:2px solid #0c0c0b}
table.grade tr.sum td.grand{background:#0c0c0b;color:#fff}
.costs{width:100%;border-collapse:collapse;margin-bottom:6px}
.costs td{border:none;border-bottom:1px solid #f0f0ee;padding:10px 0;font-size:13px}
.costs td.r{text-align:right;font-weight:650;font-variant-numeric:tabular-nums}
.costs tr.f td{border-bottom:none;border-top:2px solid #0c0c0b;padding-top:13px;font-size:16px;font-weight:750}
.note{margin-top:20px;padding:13px 15px;background:#f3f3f1;border-radius:8px;font-size:12px;color:#3d3d3b;line-height:1.55}
.sign{margin-top:44px;display:grid;grid-template-columns:1fr 1fr;gap:44px}
.sign div{border-top:1px solid #0c0c0b;padding-top:7px;font-size:10px;color:#767672;text-align:center}
.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e5e5e3;display:flex;
  justify-content:space-between;font-size:10px;color:#a0a09c}
@media print{body{padding:0}.np{display:none!important}}
</style></head><body><div class="wrap">
<div class="brand">CONTRO<span>fabric</span></div>
<div class="subtitle">Gestão de Produção</div>
<div class="head">
  <div><h1>Ficha de ${step}</h1><div class="op">${prod.no} · emitida em ${FD(TODAY)}</div></div>
  <div class="step">${step}</div>
</div>
<div class="meta">
  <div><div class="lbl">Produto</div><div class="val">${product?.name||"—"}</div></div>
  <div><div class="lbl">SKU</div><div class="val">${product?.sku||"—"}</div></div>
  <div><div class="lbl">Oficina</div><div class="val">${ws?.name||"—"}</div></div>
  <div><div class="lbl">Total de peças</div><div class="val">${grandTotal} pç</div></div>
</div>
<h2>Grade de produção</h2>
<table class="grade">
  <thead><tr>
    <th class="lft">Cor / Tecido</th>
    ${sizes.map(sz=>`<th>${sz}</th>`).join("")}
    <th>Total</th><th>Tecido</th>${hasForro?"<th>Forro</th>":""}
  </tr></thead>
  <tbody>
    ${gradeRows}
    <tr class="sum">
      <td class="lft">TOTAL</td>
      ${sizes.map(sz=>`<td>${colTotal(sz)}</td>`).join("")}
      <td class="grand">${grandTotal}</td>
      <td>${totalFab.toFixed(2)}m</td>
      ${hasForro?`<td>${totalForro.toFixed(2)}m</td>`:""}
    </tr>
  </tbody>
</table>
${hasForro?`<div class="note"><b>Forro:</b> ${[...new Set(colors.map(c=>forroRmOf(c)).filter(Boolean))].join(", ")||"—"} · total ${totalForro.toFixed(2)}m</div>`:""}
<h2 style="margin-top:22px">Valores desta etapa</h2>
<table class="costs"><tbody>
  <tr><td>Serviço de ${step.toLowerCase()}</td><td class="r">${grandTotal} pç</td><td class="r">${R(cost||0)}</td></tr>
  <tr class="f"><td>Total a pagar</td><td></td><td class="r">${R(cost||0)}</td></tr>
</tbody></table>
<div class="sign"><div>Responsável pela oficina</div><div>Conferido por</div></div>
<div class="foot"><span>CONTROfabric</span><span>Emitido em ${new Date().toLocaleString("pt-BR")}</span></div>
<div class="np" style="margin-top:26px;display:flex;gap:10px">
  <button onclick="window.print()" style="padding:12px 26px;background:#0c0c0b;color:#fff;border:none;border-radius:9px;font:600 14px -apple-system,sans-serif;cursor:pointer">Salvar como PDF / Imprimir</button>
</div>
</div></body></html>`;

  const w = window.open("","_blank","width=920,height=840");
  if (w) { w.document.write(html); w.document.close(); w.onload=()=>setTimeout(()=>w.print(),350); }
  else if (_fichaFn) _fichaFn(html);
  else showToast("Permita pop-ups para gerar a ficha.","err");
};

// Ficha de custo do produto
const printCostSheet = (prod, data) => {
  const c = calcProductCost(prod, data);
  const pct = v => c.total>0 ? ((v/c.total)*100).toFixed(1).replace(".",",")+"%" : "—";
  const linhas = [
    ["Tecido principal", c.fabric, "consumo médio × custo médio do tecido"],
    c.forro>0 && ["Forro", c.forro, "média das ordens com forro"],
    ["Aviamentos", c.trim, "soma dos aviamentos por peça"],
    ["Corte", c.cut, "pago ao terceirizado"],
    ["Costura", c.sew, "pago ao terceirizado"],
    ["Acabamento", c.fin, "pago ao terceirizado"],
  ].filter(Boolean);

  const cores = (prod.colorFabrics||[]).map(cf=>{
    const rm=data.rawMaterials.find(r=>r.id===cf.rmId);
    const cons=(prod.sizes||[]).map(sz=>cf.cons?.[sz]||0).filter(v=>v>0);
    const avg=cons.length?cons.reduce((a,b)=>a+b,0)/cons.length:0;
    return `<tr><td class="lft"><b>${cf.color}</b></td><td class="lft">${rm?.desc||"—"}</td>
      <td>${avg.toFixed(2)}m</td><td>${R(rm?.avgCost||0)}</td><td class="tot">${R(avg*(rm?.avgCost||0))}</td></tr>`;
  }).join("");

  const avi = (prod.trimUsage||[]).map(tu=>{
    const t=data.trims.find(x=>x.id===tu.trimId);
    if(!t) return "";
    return `<tr><td class="lft" colspan="2">${t.desc}</td><td>${tu.qty} ${t.unit||""}</td>
      <td>${R(t.avgCost||0)}</td><td class="tot">${R((t.avgCost||0)*(tu.qty||0))}</td></tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Custo ${prod.sku||prod.name}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:12mm}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;padding:28px;font-size:13px;color:#0c0c0b;background:#fff}
.wrap{max-width:190mm;margin:0 auto}
.brand{font-size:18px;font-weight:800;letter-spacing:-.5px;margin-bottom:2px}.brand span{color:#1A6BF5}
.subtitle{font-size:11px;color:#767672;margin-bottom:22px}
.head{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;
  padding-bottom:16px;border-bottom:2px solid #0c0c0b;margin-bottom:18px}
h1{font-size:20px;font-weight:700;margin-bottom:3px;letter-spacing:-.4px}
.op{font-size:12px;color:#767672}
.meta{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
.lbl{font-size:9.5px;color:#767672;text-transform:uppercase;letter-spacing:.07em;font-weight:600;margin-bottom:3px}
.val{font-size:14px;font-weight:600}
h2{font-size:10px;text-transform:uppercase;letter-spacing:.09em;color:#767672;margin:0 0 9px;font-weight:700}
table{width:100%;border-collapse:collapse;margin-bottom:22px;font-variant-numeric:tabular-nums}
th{background:#0c0c0b;color:#fff;padding:9px 10px;font-size:11px;font-weight:700;text-align:center;border:1px solid #0c0c0b}
th.lft{text-align:left}
td{padding:9px 10px;text-align:center;border:1px solid #d8d8d4;font-size:12.5px}
td.lft{text-align:left}
td.tot{font-weight:700;background:#f3f3f1}
tr:nth-child(even) td{background:#fbfbf9}
tr:nth-child(even) td.tot{background:#eeeeec}
.big{background:#0c0c0b;color:#fff;border-radius:10px;padding:20px 24px;margin-bottom:22px;
  display:flex;justify-content:space-between;align-items:center}
.big .k{font-size:12px;color:rgba(255,255,255,.65);text-transform:uppercase;letter-spacing:.07em;font-weight:600}
.big .v{font-size:30px;font-weight:800;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.bar{display:flex;height:9px;border-radius:5px;overflow:hidden;margin-bottom:8px}
.leg{display:flex;flex-wrap:wrap;gap:14px;font-size:11px;color:#3d3d3b;margin-bottom:22px}
.leg i{width:9px;height:9px;border-radius:3px;display:inline-block;margin-right:5px}
.note{padding:13px 15px;background:#f3f3f1;border-radius:8px;font-size:11.5px;color:#3d3d3b;line-height:1.6}
.foot{margin-top:28px;padding-top:12px;border-top:1px solid #e5e5e3;display:flex;
  justify-content:space-between;font-size:10px;color:#a0a09c}
@media print{body{padding:0}.np{display:none!important}}
</style></head><body><div class="wrap">
<div class="brand">CONTRO<span>fabric</span></div>
<div class="subtitle">Gestão de Produção</div>
<div class="head">
  <div><h1>Ficha de Custo</h1><div class="op">${prod.name} · emitida em ${FD(TODAY)}</div></div>
</div>
<div class="meta">
  <div><div class="lbl">SKU</div><div class="val">${prod.sku||"—"}</div></div>
  <div><div class="lbl">Categoria</div><div class="val">${prod.category||"—"}</div></div>
  <div><div class="lbl">Coleção</div><div class="val">${prod.collection||"—"}</div></div>
  <div><div class="lbl">Tamanhos</div><div class="val">${(prod.sizes||[]).join(", ")||"—"}</div></div>
</div>
<div class="big"><div><div class="k">Custo médio por peça</div></div><div class="v">${R(c.total)}</div></div>
<div class="bar">
  ${[[c.fabric,"#1A6BF5"],[c.forro,"#5B21B6"],[c.trim,"#B45309"],[c.cut,"#16A34A"],[c.sew,"#0891B2"],[c.fin,"#C13515"]]
    .filter(([v])=>v>0).map(([v,col])=>`<div style="width:${(v/(c.total||1))*100}%;background:${col}"></div>`).join("")}
</div>
<div class="leg">
  ${[["Tecido",c.fabric,"#1A6BF5"],["Forro",c.forro,"#5B21B6"],["Aviamentos",c.trim,"#B45309"],
     ["Corte",c.cut,"#16A34A"],["Costura",c.sew,"#0891B2"],["Acabamento",c.fin,"#C13515"]]
    .filter(([,v])=>v>0).map(([l,v,col])=>`<span><i style="background:${col}"></i>${l} ${pct(v)}</span>`).join("")}
</div>
<h2>Composição do custo</h2>
<table><thead><tr><th class="lft">Item</th><th class="lft">Base de cálculo</th><th>Valor</th><th>% do total</th></tr></thead>
<tbody>${linhas.map(([l,v,b])=>`<tr><td class="lft"><b>${l}</b></td><td class="lft" style="color:#767672;font-size:11.5px">${b}</td><td class="tot">${R(v)}</td><td>${pct(v)}</td></tr>`).join("")}
<tr><td class="lft" colspan="2"><b>TOTAL POR PEÇA</b></td><td class="tot">${R(c.total)}</td><td>100%</td></tr></tbody></table>
${cores?`<h2>Tecido por cor</h2><table><thead><tr><th class="lft">Cor</th><th class="lft">Tecido</th><th>Consumo médio</th><th>Custo/m</th><th>Custo</th></tr></thead><tbody>${cores}</tbody></table>`:""}
${avi?`<h2>Aviamentos</h2><table><thead><tr><th class="lft" colspan="2">Item</th><th>Qtd/peça</th><th>Custo unit.</th><th>Custo</th></tr></thead><tbody>${avi}</tbody></table>`:""}
<div class="note"><b>Como o custo é calculado:</b> o tecido usa o consumo médio entre os tamanhos multiplicado pelo custo médio ponderado das compras, dividido pelo número de cores. Corte, costura e acabamento são os valores pagos aos terceirizados por peça. O custo muda conforme novas compras alteram o custo médio dos materiais.</div>
<div class="foot"><span>CONTROfabric</span><span>Emitido em ${new Date().toLocaleString("pt-BR")}</span></div>
<div class="np" style="margin-top:26px"><button onclick="window.print()" style="padding:12px 26px;background:#0c0c0b;color:#fff;border:none;border-radius:9px;font:600 14px -apple-system,sans-serif;cursor:pointer">Salvar como PDF / Imprimir</button></div>
</div></body></html>`;
  const w = window.open("","_blank","width=920,height=840");
  if (w) { w.document.write(html); w.document.close(); w.onload=()=>setTimeout(()=>w.print(),350); }
  else showToast("Permita pop-ups para gerar a ficha de custo.","err");
};

// Ficha viewer global (fallback quando impressão é bloqueada no preview)
let _fichaFn = null;
function FichaHost(){
  const [html,setHtml] = useState(null);
  useEffect(()=>{ _fichaFn = (h)=>setHtml(h); return ()=>{_fichaFn=null;}; },[]);
  if(!html) return null;
  const doPrintNow = () => {
    const f = document.getElementById("__ficha_iframe__");
    try { f.contentWindow.focus(); f.contentWindow.print(); } catch(e){}
  };
  return (
    <div style={{position:"fixed",inset:0,zIndex:3000,background:"rgba(12,12,11,.5)",display:"flex",flexDirection:"column",padding:0}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"14px 18px",background:DS.ink,color:"#fff"}}>
        <span style={{fontSize:14,fontWeight:600}}>Ficha de Produção</span>
        <div style={{display:"flex",gap:8}}>
          <button onClick={doPrintNow} style={{padding:"8px 16px",borderRadius:DS.r8,border:"none",background:"#fff",color:DS.ink,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Imprimir / Salvar PDF</button>
          <button onClick={()=>setHtml(null)} style={{padding:"8px 16px",borderRadius:DS.r8,border:"1px solid rgba(255,255,255,.3)",background:"transparent",color:"#fff",fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>Fechar</button>
        </div>
      </div>
      <iframe id="__ficha_iframe__" srcDoc={html} style={{flex:1,width:"100%",border:"none",background:"#fff"}}/>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// ROLE PERMISSIONS
// ═══════════════════════════════════════════════════════════════════════════════
const ROLE_PAGES = {
  admin:      ["dashboard","cut-order","productions","products","stock","fabrics","trims","users","revenue","financial","agenda","outsourced","purchases"],
  financial:  ["dashboard","revenue","financial","agenda","purchases"],
  production: ["dashboard","cut-order","productions","outsourced"],
  stock:      ["dashboard","stock","fabrics","trims","purchases"],
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVE ATOMS — DS compliant, 44px touch targets, tabular nums
// ═══════════════════════════════════════════════════════════════════════════════

// Micro label — always uppercase, 10px, 0.06em spacing
const Lbl = ({ ch, style }) => (
  <div style={{ fontSize:10, fontWeight:600, color:DS.i3, letterSpacing:".06em", textTransform:"uppercase", lineHeight:1, ...style }}>{ch}</div>
);

// Status pill
function SPill({ status, xs }) {
  const s = STATUS_MAP[status] || { c:DS.i3, s:DS.surEl, b:DS.bd };
  return (
    <span style={{ display:"inline-flex",alignItems:"center",gap:5, padding:xs?"2px 7px":"3px 10px", borderRadius:DS.r20, fontSize:xs?10:11, fontWeight:600, color:s.c, background:s.s, border:`1px solid ${s.b}`, whiteSpace:"nowrap" }}>
      <span style={{ width:5,height:5,borderRadius:"50%",background:s.c,flexShrink:0 }}/>
      {status}
    </span>
  );
}

// Neutral chip
function Chip({ children, c, bg, bd, xs, onClick }) {
  return (
    <span onClick={onClick} style={{ display:"inline-flex",alignItems:"center", padding:xs?"2px 7px":"3px 9px", borderRadius:DS.r20, fontSize:xs?10:11, fontWeight:500, color:c||DS.i2, background:bg||DS.surEl, border:`1px solid ${bd||DS.bd}`, whiteSpace:"nowrap", cursor:onClick?"pointer":"default", userSelect:"none", transition:`background ${DS.fast}` }}>
      {children}
    </span>
  );
}

// Alert banner
function Bnr({ type="info", children }) {
  const m = { info:{c:DS.blue,bg:DS.blueSft,b:DS.blueBd}, warn:{c:DS.warn,bg:DS.warnSft,b:DS.warnBd}, err:{c:DS.err,bg:DS.errSft,b:DS.errBd}, ok:{c:DS.ok,bg:DS.okSft,b:DS.okBd} };
  const s = m[type]||m.info;
  return <div style={{ display:"flex",gap:10, padding:"10px 14px", borderRadius:DS.r8, background:s.bg, border:`1px solid ${s.b}`, borderLeft:`3px solid ${s.c}`, fontSize:13, color:s.c, lineHeight:1.5 }}>{children}</div>;
}

// Card
function Card({ children, onClick, p=20, style }) {
  const [h,sH] = useState(false);
  return (
    <div onClick={onClick} onMouseEnter={()=>onClick&&sH(true)} onMouseLeave={()=>sH(false)}
      style={{ background:DS.sur, border:`1px solid ${h?DS.bdM:DS.bd}`, borderRadius:DS.r14, padding:p, boxShadow:h?DS.e2:DS.e1, transition:`transform ${DS.base}, box-shadow ${DS.base}, border-color ${DS.base}`, cursor:onClick?"pointer":"default", transform:h?"translateY(-2px)":"translateY(0)", ...style }}>
      {children}
    </div>
  );
}

// Button — min 44px height for touch
function Btn({ children, onClick, v="primary", sz="md", disabled, style, icon }) {
  const [h,sH] = useState(false);
  const sizes = { sm:{p:"6px 12px",f:12,h:32}, md:{p:"0 16px",f:13,h:40}, lg:{p:"0 20px",f:14,h:44} };
  const S = sizes[sz]||sizes.md;
  const base = { display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6, fontWeight:600, borderRadius:DS.r8, border:"none", cursor:disabled?"not-allowed":"pointer", fontFamily:"inherit", transition:`all ${DS.fast}`, opacity:disabled?0.4:1, fontSize:S.f, padding:S.p, height:S.h, letterSpacing:"-.1px", whiteSpace:"nowrap" };
  const vs = {
    primary:  { background:h?"#111":DS.ink, color:"#fff" },
    secondary:{ background:h?DS.surEl:DS.sur, color:DS.i1, border:`1px solid ${DS.bd}` },
    ghost:    { background:h?DS.surEl:"transparent", color:DS.i2 },
    danger:   { background:h?"#FCA5A5":DS.errSft, color:DS.err, border:`1px solid ${DS.errBd}` },
    ok:       { background:h?DS.okBd:DS.okSft, color:DS.ok, border:`1px solid ${DS.okBd}` },
  };
  return (
    <button onClick={disabled?null:onClick} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{...base,...(vs[v]||vs.primary),...style}}>
      {icon && <span style={{display:"flex",alignItems:"center"}}>{icon}</span>}
      {children}
    </button>
  );
}

// Icon button — 40×40 touch target
function IBt({ icon, onClick, title, v="ghost" }) {
  const [h,sH] = useState(false);
  const vs = { ghost:{bg:h?DS.surEl:"transparent",c:DS.i2}, danger:{bg:h?DS.errSft:"transparent",c:h?DS.err:DS.i3} };
  const s = vs[v]||vs.ghost;
  return (
    <button onClick={onClick} title={title} onMouseEnter={()=>sH(true)} onMouseLeave={()=>sH(false)}
      style={{ width:36,height:36,display:"flex",alignItems:"center",justifyContent:"center", background:s.bg, color:s.c, border:"none", borderRadius:DS.r8, cursor:"pointer", transition:`all ${DS.fast}`, flexShrink:0 }}>
      {icon}
    </button>
  );
}

// Input
function Inp({ label, value, onChange, type="text", placeholder, hint, req, style, disabled, min, step }) {
  const [f,sF] = useState(false);
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:5,...style }}>
      {label && <label style={{ fontSize:12,fontWeight:500,color:DS.i2 }}>{label}{req&&<span style={{color:DS.err}}> *</span>}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} disabled={disabled} min={min} step={step}
        onFocus={()=>sF(true)} onBlur={()=>sF(false)}
        style={{ height:40, padding:"0 11px", borderRadius:DS.r8, fontSize:13, fontFamily:"inherit", border:`1px solid ${f?DS.blue:DS.bd}`, outline:"none", background:disabled?DS.surEl:DS.sur, color:DS.i1, width:"100%", boxSizing:"border-box", transition:`border-color ${DS.fast}`, boxShadow:f?`0 0 0 3px ${DS.blueSft}`:"none" }}/>
      {hint && <span style={{ fontSize:11,color:DS.i3 }}>{hint}</span>}
    </div>
  );
}

// Select
function Sel({ label, value, onChange, options, req, style, disabled }) {
  return (
    <div style={{ display:"flex",flexDirection:"column",gap:5,...style }}>
      {label && <label style={{ fontSize:12,fontWeight:500,color:DS.i2 }}>{label}{req&&<span style={{color:DS.err}}> *</span>}</label>}
      <select value={value} onChange={e=>onChange(e.target.value)} disabled={disabled}
        style={{ height:40, padding:"0 11px", borderRadius:DS.r8, fontSize:13, fontFamily:"inherit", border:`1px solid ${DS.bd}`, outline:"none", background:disabled?DS.surEl:DS.sur, color:DS.i1, width:"100%", cursor:disabled?"not-allowed":"pointer" }}>
        {options.map(o=><option key={o.v} value={o.v}>{o.l}</option>)}
      </select>
    </div>
  );
}

// Modal
function Modal({ open, onClose, title, children, width=560, noPad=false }) {
  useEffect(function(){
    if(open){
      document.body.style.overflow="hidden";
      document.documentElement.style.overflow="hidden";
    }
    return()=>{
      document.body.style.overflow="";
      document.documentElement.style.overflow="";
    };
  },[open]);
  if (!open) return null;
  return createPortal(
    <div
      onClick={onClose}
      style={{
        position:"fixed", top:0, left:0, right:0, bottom:0,
        zIndex:99999, background:"rgba(12,12,11,.22)",
        backdropFilter:"blur(3px)", WebkitBackdropFilter:"blur(3px)",
        overflowY:"auto", overflowX:"hidden", WebkitOverflowScrolling:"touch",
        boxSizing:"border-box"
      }}>
      <div
        onClick={e=>e.stopPropagation()}
        style={{
          background:DS.sur, borderRadius:DS.r20,
          width:"calc(100% - 32px)", maxWidth:width, margin:"40px auto",
          boxShadow:DS.e4, border:`1px solid ${DS.bd}`,
          animation:`cf-scale ${DS.base} both`
        }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 20px", borderBottom:`1px solid ${DS.bd}` }}>
          <span style={{ fontSize:17, fontWeight:700, color:DS.i1, letterSpacing:"-.3px" }}>{title}</span>
          <IBt icon={<svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13"/></svg>} onClick={onClose}/>
        </div>
        <div style={{ padding:noPad?0:"20px" }}>{children}</div>
      </div>
    </div>,
    document.body
  );
}

// Divider
const HR = ({my=16})=><div style={{height:1,background:DS.bd,margin:my+'px 0'}}/>;

// ── GLOBAL CONFIRM + TOAST (event-based, no context wiring needed) ──────────────
let _confirmFn = null;
let _toastFn = null;
const askConfirm = (opts) => { if(_confirmFn) _confirmFn(opts); };
const showToast = (msg, type) => { if(_toastFn) _toastFn(msg, type||"ok"); };

function ConfirmModal(){
  const [state,setState] = useState(null);
  useEffect(()=>{ _confirmFn = (opts)=>setState(opts); return ()=>{ _confirmFn=null; }; },[]);
  if(!state) return null;
  const close = ()=>setState(null);
  const confirm = ()=>{ const cb=state.onConfirm; close(); if(cb)cb(); };
  return (
    <div style={{position:"fixed",inset:0,zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div onClick={close} style={{position:"absolute",inset:0,background:"rgba(12,12,11,.14)",backdropFilter:"blur(3px)",WebkitBackdropFilter:"blur(3px)",animation:`cf-fade ${DS.base} both`}}/>
      <div style={{position:"relative",background:DS.sur,borderRadius:DS.r16,width:380,maxWidth:"92vw",boxShadow:DS.e4,padding:26,animation:`cf-scale ${DS.base} both`}}>
        <div style={{width:40,height:40,borderRadius:"50%",background:DS.errSft,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={DS.err} strokeWidth="1.8"><path d="M10 6.5v4M10 13.5h.01M8.5 2.5L1.8 14a1.5 1.5 0 001.3 2.2h13.8a1.5 1.5 0 001.3-2.2L11.5 2.5a1.5 1.5 0 00-3 0z"/></svg>
        </div>
        <div style={{fontSize:16,fontWeight:700,color:DS.i1,marginBottom:6,letterSpacing:"-.2px"}}>{state.title||"Confirmar exclusão"}</div>
        <div style={{fontSize:13,color:DS.i2,lineHeight:1.5,marginBottom:22}}>{state.message||"Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita."}</div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={close}>Cancelar</Btn>
          <Btn v="danger" onClick={confirm} style={{background:DS.err,color:"#fff",border:"none"}}>{state.confirmLabel||"Excluir"}</Btn>
        </div>
      </div>
    </div>
  );
}

function ToastHost(){
  const [toasts,setToasts] = useState([]);
  useEffect(()=>{
    _toastFn = (msg,type)=>{
      const id=Date.now()+Math.random();
      setToasts(t=>[...t,{id,msg,type}]);
      setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3000);
    };
    return ()=>{ _toastFn=null; };
  },[]);
  return (
    <div style={{position:"fixed",bottom:24,left:"50%",transform:"translateX(-50%)",zIndex:3000,display:"flex",flexDirection:"column",gap:8,alignItems:"center"}}>
      {toasts.map(t=>{
        const m={ok:{c:DS.ok,bg:DS.okSft,b:DS.okBd,icon:"✓"},err:{c:DS.err,bg:DS.errSft,b:DS.errBd,icon:"✕"}}[t.type]||{c:DS.i1,bg:DS.sur,b:DS.bd,icon:"•"};
        return (
          <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",borderRadius:DS.r12,background:m.bg,border:`1px solid ${m.b}`,boxShadow:DS.e3,fontSize:13,fontWeight:550,color:m.c,minWidth:240,animation:`cf-slideUp ${DS.base} both`}}>
            <span style={{width:18,height:18,borderRadius:"50%",background:m.c,color:"#fff",fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>{m.icon}</span>
            {t.msg}
          </div>
        );
      })}
    </div>
  );
}

// Helper: wrap a delete action with confirmation + success toast
function confirmDelete(doDelete, opts){
  askConfirm({
    title: (opts&&opts.title)||"Confirmar exclusão",
    message: (opts&&opts.message)||"Tem certeza que deseja excluir este registro? Esta ação não poderá ser desfeita.",
    confirmLabel:"Excluir",
    onConfirm: ()=>{
      try { doDelete(); showToast("Registro excluído com sucesso.","ok"); }
      catch(e){ showToast("Não foi possível excluir o registro.","err"); }
    }
  });
}

// Data table
function Tbl({ cols, rows, onRow, empty="Nenhum registro" }) {
  return (
    <div style={{ overflowX:"auto" }}>
      {rows.length===0
        ? <div style={{padding:"48px 20px",textAlign:"center",color:DS.i3,fontSize:13}}>{empty}</div>
        : <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
          <thead>
            <tr>
              {cols.map(c=><th key={c.k} style={{textAlign:"left",padding:"11px 18px",fontSize:11,fontWeight:600,color:DS.i3,letterSpacing:".02em",borderBottom:`1px solid ${DS.bd}`,whiteSpace:"nowrap"}}>{c.l}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row,i)=>(
              <tr key={i} onClick={()=>onRow&&onRow(row)} style={{borderBottom:i<rows.length-1?`1px solid ${DS.bd}`:"none",cursor:onRow?"pointer":"default",transition:`background ${DS.fast}`}}
                onMouseEnter={e=>onRow&&(e.currentTarget.style.background=DS.canvas)}
                onMouseLeave={e=>onRow&&(e.currentTarget.style.background="transparent")}>
                {cols.map(c=><td key={c.k} style={{padding:"13px 18px",color:DS.i1,...(c.style||{})}}>{c.r?c.r(row):row[c.k]??""}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      }
    </div>
  );
}

// Section header
function SH({ title, sub, action }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end",marginBottom:28,gap:16}}>
      <div>
        <h2 style={{margin:0,fontSize:22,fontWeight:700,color:DS.i1,letterSpacing:"-.5px"}}>{title}</h2>
        {sub&&<p style={{margin:"5px 0 0",fontSize:13.5,color:DS.i3,lineHeight:1.4}}>{sub}</p>}
      </div>
      {action}
    </div>
  );
}

// Info box
function IB({ label, value, col }) {
  return (
    <div style={{background:DS.surEl,borderRadius:DS.r8,padding:"11px 14px",gridColumn:col?'span '+col:undefined}}>
      <Lbl ch={label} style={{marginBottom:4}}/>
      <div style={{fontSize:13,fontWeight:500,color:DS.i1}}>{value||"—"}</div>
    </div>
  );
}

// Period selector
function PeriodSelector({ value, onChange, customFrom, customTo, onFromChange, onToChange }) {
  const opts = [{v:"today",l:"Hoje"},{v:"7d",l:"7 dias"},{v:"30d",l:"30 dias"},{v:"month",l:"Mês"},{v:"all",l:"Tudo"},{v:"custom",l:"Personalizado"}];
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
      <div style={{display:"inline-flex",background:DS.surEl,borderRadius:DS.r10,padding:3,position:"relative"}}>
        {opts.map(o=>{
          const on = value===o.v;
          return (
            <button key={o.v} onClick={()=>onChange(o.v)}
              style={{position:"relative",zIndex:1,padding:"6px 13px",borderRadius:DS.r8,fontSize:12.5,fontWeight:on?650:500,border:"none",cursor:"pointer",background:on?DS.sur:"transparent",color:on?DS.i1:DS.i3,boxShadow:on?DS.e1:"none",transition:`color ${DS.fast}, background ${DS.base}, box-shadow ${DS.base}`,fontFamily:"inherit",whiteSpace:"nowrap"}}>
              {o.l}
            </button>
          );
        })}
      </div>
      {value==="custom" && (
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <Inp type="date" value={customFrom} onChange={onFromChange} style={{width:150}}/>
          <span style={{color:DS.i3,fontSize:12}}>até</span>
          <Inp type="date" value={customTo} onChange={onToChange} style={{width:150}}/>
        </div>
      )}
    </div>
  );
}

// Production timeline
function PTimeline({ prod, outsourced }) {
  const si = STEPS.indexOf(prod.status);
  const fc = forecast(prod, outsourced);
  const steps = [
    { s:"Corte",      i:0, ws:prod.cutWs, start:prod.cutStart, end:prod.cutEnd, avgD:fc.cD, predEnd:fc.cE, cost:prod.cutC },
    { s:"Costura",    i:1, ws:prod.sewWs, start:prod.sewStart, end:prod.sewEnd, avgD:fc.sD, predEnd:fc.sE, cost:prod.sewC },
    { s:"Acabamento", i:2, ws:prod.finWs, start:prod.finStart, end:prod.finEnd, avgD:fc.fD, predEnd:fc.fE, cost:prod.finC },
    { s:"Finalizado", i:3, ws:"—",        start:prod.status==="Finalizado"?prod.finEnd:null, end:prod.status==="Finalizado"?prod.finEnd:null, avgD:0, predEnd:fc.fE, cost:0 },
  ];
  return (
    <div>
      <div style={{display:"flex",gap:16,marginBottom:20,padding:"12px 16px",background:fc.late?DS.errSft:DS.okSft,borderRadius:DS.r10,border:`1px solid ${fc.late?DS.errBd:DS.okBd}`,flexWrap:"wrap"}}>
        <div><Lbl ch="Início" style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:600}}>{FD(prod.start)}</div></div>
        <div><Lbl ch="Previsão" style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:700,color:fc.late?DS.err:DS.ok}}>{FD(fc.fE)}</div></div>
        <div><Lbl ch="Em andamento" style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:600}}>{prod.start?diffD(prod.start,TODAY):0}d</div></div>
        {prod.status!=="Finalizado"&&<div><Lbl ch={fc.dLeft<0?"Atraso":"Restante"} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:700,color:fc.dLeft<0?DS.err:fc.dLeft<=2?DS.warn:DS.ok}}>{fc.dLeft<0?Math.abs(fc.dLeft)+"d":fc.dLeft>0?fc.dLeft+"d":"Hoje"}</div></div>}
      </div>
      <div>
        {steps.map((sd,i)=>{
          const done=i<si, active=i===si, pend=i>si;
          const st = STATUS_MAP[sd.s]||STATUS_MAP["Finalizado"];
          const spent = sd.start&&sd.end ? diffD(sd.start,sd.end) : sd.start&&active ? diffD(sd.start,TODAY) : null;
          return (
            <div key={sd.s} style={{display:"flex",gap:0}}>
              <div style={{display:"flex",flexDirection:"column",alignItems:"center",width:32,flexShrink:0}}>
                <div style={{width:20,height:20,borderRadius:"50%",marginTop:14,zIndex:1,position:"relative",display:"flex",alignItems:"center",justifyContent:"center",background:done?st.c:active?DS.sur:DS.surEl,border:`2px solid ${done||active?st.c:DS.bd}`,transition:`all ${DS.slow}`}}>
                  {done&&<span style={{color:"#fff",fontSize:9,fontWeight:800}}>✓</span>}
                  {active&&<span style={{width:7,height:7,borderRadius:"50%",background:st.c}}/>}
                </div>
                {i<3&&<div style={{width:1.5,flex:1,minHeight:16,background:done?st.c:DS.bd,transition:'background '+DS.slow}}/>}
              </div>
              <div style={{flex:1,padding:"12px 0 12px 12px"}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                  <div>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <span style={{fontSize:13,fontWeight:700,color:pend?DS.i3:DS.i1}}>{sd.s}</span>
                      {active&&<Chip xs c={st.c} bg={st.s} bd={st.b}>Em andamento</Chip>}
                      {done&&<Chip xs c={DS.ok} bg={DS.okSft} bd={DS.okBd}>Concluído</Chip>}
                      {pend&&<Chip xs>Aguardando</Chip>}
                    </div>
                    {sd.ws&&sd.ws!=="—"&&<div style={{fontSize:12,color:DS.i2,marginBottom:3}}>{sd.ws}</div>}
                    <div style={{display:"flex",gap:12,flexWrap:"wrap",fontSize:11,color:DS.i3}}>
                      {sd.start&&<span>Início: <strong style={{color:DS.i2}}>{FD(sd.start)}</strong></span>}
                      {sd.end&&<span>Conclusão: <strong style={{color:DS.i2}}>{FD(sd.end)}</strong></span>}
                      {!sd.end&&!pend&&sd.start&&<span>Prev: <strong style={{color:DS.i2}}>{FD(sd.predEnd)}</strong></span>}
                      {sd.avgD>0&&<span>Média: <strong style={{color:DS.i2}}>{sd.avgD}d</strong></span>}
                      {spent!==null&&<span>Gasto: <strong style={{color:spent>sd.avgD?DS.err:DS.ok}}>{spent}d</strong></span>}
                    </div>
                  </div>
                  {sd.cost>0&&<div style={{textAlign:"right",flexShrink:0}}><div style={{fontSize:13,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{R(sd.cost)}</div><div style={{fontSize:10,color:DS.i3}}>custo</div></div>}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════════════
function LoginPage({ onLogin }) {
  const { isSmall } = useViewport();
  const [email,setEmail]   = useState("");
  const [pass,setPass]     = useState("");
  const [err,setErr]       = useState("");
  const [show,setShow]     = useState(false);
  const [loading,setLoading] = useState(false);

  const submit = async () => {
    if(!email||!pass){ setErr("Preencha e-mail e senha."); return; }
    setLoading(true); setErr("");
    try { await onLogin(email,pass); }
    catch(e){ setErr("E-mail ou senha inválidos."); }
    finally { setLoading(false); }
  };

  const stats = [
    {k:"Produção",v:"em tempo real"},
    {k:"Custos",v:"média das compras"},
    {k:"Financeiro",v:"contas e parcelas"},
  ];

  return (
    <div style={{minHeight:"100vh",display:"flex",fontFamily:DS.font,background:DS.bg}}>
      <style>{GLOBAL_CSS}</style>
      {!isSmall && (
        <div style={{flex:"1 1 50%",background:`linear-gradient(155deg, #0C0C0B 0%, #1A1A18 55%, #232320 100%)`,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"56px 56px",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",inset:0,opacity:.04,backgroundImage:"linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",backgroundSize:"32px 32px"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",gap:13}}>
              <div style={{width:40,height:40,background:"rgba(255,255,255,0.08)",borderRadius:DS.r12,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(255,255,255,0.12)"}}>
                <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.4" fill="white"/><rect x="10" y="2.5" width="5.5" height="5.5" rx="1.4" fill={DS.blue}/><rect x="2.5" y="10" width="5.5" height="5.5" rx="1.4" fill="white" opacity=".45"/><rect x="10" y="10" width="5.5" height="5.5" rx="1.4" fill="white"/></svg>
              </div>
              <div style={{fontSize:18,fontWeight:800,color:"#fff",letterSpacing:"-.4px"}}>CONTRO<span style={{color:DS.blue}}>fabric</span></div>
            </div>
          </div>
          <div style={{position:"relative"}}>
            <h1 style={{fontSize:38,fontWeight:780,color:"#fff",letterSpacing:"-1.4px",lineHeight:1.1,margin:"0 0 18px"}}>Controle total da<br/>sua produção de<br/>confecção.</h1>
            <p style={{fontSize:15,color:"rgba(255,255,255,0.55)",lineHeight:1.6,margin:0,maxWidth:380}}>Da ordem de corte ao financeiro. Acompanhe peças, prazos, oficinas e custos em um só lugar.</p>
            <div style={{display:"flex",gap:0,marginTop:40}}>
              {stats.map((s,i)=>(
                <div key={s.k} style={{paddingRight:28,marginRight:28,borderRight:i<2?"1px solid rgba(255,255,255,0.12)":"none"}}>
                  <div style={{fontSize:14,fontWeight:650,color:"#fff",marginBottom:3}}>{s.k}</div>
                  <div style={{fontSize:12,color:"rgba(255,255,255,0.45)"}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{position:"relative",fontSize:12,color:"rgba(255,255,255,0.35)"}}>© 2026 CONTROfabric · Gestão de Produção</div>
        </div>
      )}
      <div style={{flex:isSmall?"1":"1 1 50%",display:"flex",alignItems:"center",justifyContent:"center",padding:isSmall?"32px 24px":"56px"}}>
        <div style={{width:"100%",maxWidth:360,animation:`cf-rise ${DS.slow} both`}}>
          {isSmall && (
            <div style={{textAlign:"center",marginBottom:36}}>
              <div style={{display:"inline-flex",width:48,height:48,background:`linear-gradient(135deg, ${DS.ink}, #2A2A28)`,borderRadius:DS.r14,alignItems:"center",justifyContent:"center",marginBottom:14,boxShadow:DS.e2}}>
                <svg width="26" height="26" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.4" fill="white"/><rect x="10" y="2.5" width="5.5" height="5.5" rx="1.4" fill={DS.blue}/><rect x="2.5" y="10" width="5.5" height="5.5" rx="1.4" fill="white" opacity=".45"/><rect x="10" y="10" width="5.5" height="5.5" rx="1.4" fill="white"/></svg>
              </div>
              <div style={{fontSize:22,fontWeight:800,color:DS.i1,letterSpacing:"-.5px"}}>CONTRO<span style={{color:DS.blue}}>fabric</span></div>
              <div style={{fontSize:13,color:DS.i3,marginTop:4}}>Gestão de Produção</div>
            </div>
          )}
          <h2 style={{margin:"0 0 6px",fontSize:24,fontWeight:750,color:DS.i1,letterSpacing:"-.5px"}}>Bem-vindo de volta</h2>
          <p style={{margin:"0 0 28px",fontSize:14,color:DS.i3}}>Entre com seu e-mail e senha para continuar.</p>
          <div style={{display:"flex",flexDirection:"column",gap:16}}>
            <Inp label="E-mail" value={email} onChange={setEmail} placeholder="admin@suaconfeccao.com.br" type="email" req/>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              <label style={{fontSize:12,fontWeight:500,color:DS.i2}}>Senha *</label>
              <div style={{position:"relative"}}>
                <input type={show?"text":"password"} value={pass} onChange={e=>setPass(e.target.value)} placeholder="••••••••" onKeyDown={e=>e.key==="Enter"&&submit()}
                  style={{height:44,padding:"0 44px 0 13px",borderRadius:DS.r10,fontSize:14,fontFamily:"inherit",border:`1px solid ${DS.bd}`,outline:"none",background:DS.sur,color:DS.i1,width:"100%",boxSizing:"border-box",transition:`border-color ${DS.fast}`}}
                  onFocus={e=>e.target.style.borderColor=DS.blue} onBlur={e=>e.target.style.borderColor=DS.bd}/>
                <button onClick={()=>setShow(s=>!s)} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:DS.i3,padding:4,display:"flex"}}>
                  {show
                    ? <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="9" cy="9" r="2"/><path d="M3 3l12 12"/></svg>
                    : <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="9" cy="9" r="2"/></svg>}
                </button>
              </div>
            </div>
            {err&&<Bnr type="err">{err}</Bnr>}
            <Btn onClick={submit} disabled={loading} style={{width:"100%",justifyContent:"center",marginTop:4,height:46,fontSize:14}}>{loading?"Entrando...":"Entrar"}</Btn>
          </div>
          <div style={{marginTop:28,padding:"12px 14px",background:DS.surEl,borderRadius:DS.r10,fontSize:12,color:DS.i3,textAlign:"center"}}>
            Crie sua conta no painel Supabase → Authentication → Users
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHARTS — minimal custom SVG (no dependency, full control over aesthetic)
// ═══════════════════════════════════════════════════════════════════════════════

// Smooth path via Catmull-Rom → cubic bezier (soft, flowing lines)
function smoothPath(pts){
  if(pts.length<2) return pts.length?`M${pts[0].x} ${pts[0].y}`:"";
  let d=`M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    const t=0.18;
    const c1x=p1.x+(p2.x-p0.x)*t, c1y=p1.y+(p2.y-p0.y)*t;
    const c2x=p2.x-(p3.x-p1.x)*t, c2y=p2.y-(p3.y-p1.y)*t;
    d+=` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

// Tiny inline sparkline (smooth)
function Sparkline({ data, color=DS.blue, height=40, width=120 }){
  if(!data||data.length<2) return <div style={{height}}/>;
  const max=Math.max(...data,1), min=Math.min(...data,0);
  const padY=4;
  const dx=width/(data.length-1);
  const sy=v=>height-padY-((v-min)/(max-min||1))*(height-padY*2);
  const pts=data.map((v,i)=>({x:i*dx,y:sy(v)}));
  const path=smoothPath(pts);
  const area=path+` L${width} ${height} L0 ${height} Z`;
  const gid="spk"+color.replace("#","")+Math.round(Math.random()*9999);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>
      <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.18"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
      <path d={area} fill={`url(#${gid})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/>
    </svg>
  );
}
function LineChart({ data, height=140, color=DS.blue, suffix="", grid=false }) {
  const [hover,setHover] = useState(null);
  if (!data || data.length===0) return <div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:DS.i3,fontSize:12}}>Sem dados no período</div>;
  const W=600, H=height, padX=8, padY=18;
  const max = Math.max(...data.map(d=>d.v), 1);
  const min = 0;
  const dx = (W-padX*2)/Math.max(data.length-1,1);
  const sy = v => H-padY - ((v-min)/(max-min||1))*(H-padY*2);
  const pts = data.map((d,i)=>({ x:padX+i*dx, y:sy(d.v), ...d }));
  const path = smoothPath(pts);
  const area = path+" L"+pts[pts.length-1].x.toFixed(1)+" "+(H-padY)+" L"+pts[0].x.toFixed(1)+" "+(H-padY)+" Z";
  const gid = "lcg"+color.replace("#","");
  const gridVals = grid ? [0,0.5,1].map(f=>Math.round(max*f)) : [];
  return (
    <div style={{position:"relative",width:"100%"}}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={height} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}
        onMouseLeave={()=>setHover(null)}>
        <defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.16"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>
        {grid && gridVals.map((gv,i)=>{
          const gy = sy(gv);
          return <line key={i} x1={padX} y1={gy} x2={W-padX} y2={gy} stroke={DS.bd} strokeWidth="1" vectorEffect="non-scaling-stroke" strokeDasharray="3 4"/>;
        })}
        <path d={area} fill={`url(#${gid})`}/>
        <path d={path} fill="none" stroke={color} strokeWidth="2.25" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"/>
        {pts.map((p,i)=>(
          <g key={i}>
            <rect x={p.x-dx/2} y="0" width={dx} height={H} fill="transparent" onMouseEnter={()=>setHover({...p,i})}/>
            {hover&&hover.i===i&&<circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/>}
          </g>
        ))}
      </svg>
      {grid && (
        <div style={{position:"absolute",left:0,top:0,bottom:0,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:`${padY-8}px 0`,pointerEvents:"none"}}>
          {[...gridVals].reverse().map((gv,i)=><span key={i} style={{fontSize:10,color:DS.i4,fontVariantNumeric:"tabular-nums"}}>{gv}</span>)}
        </div>
      )}
      {hover&&(
        <div style={{position:"absolute",left:`${(hover.x/W)*100}%`,top:-4,transform:"translateX(-50%)",background:DS.ink,color:"#fff",fontSize:11,fontWeight:600,padding:"5px 9px",borderRadius:7,whiteSpace:"nowrap",pointerEvents:"none",boxShadow:DS.e2,zIndex:2}}>
          {hover.v}{suffix} · {hover.l}
        </div>
      )}
    </div>
  );
}

function BarChart({ data, height=160 }) {
  const [hover,setHover] = useState(null);
  if (!data || data.length===0) return <div style={{height,display:"flex",alignItems:"center",justifyContent:"center",color:DS.i3,fontSize:12}}>Sem dados</div>;
  const max = Math.max(...data.map(d=>d.v), 1);
  return (
    <div style={{display:"flex",alignItems:"flex-end",gap:14,height,padding:"0 4px"}}>
      {data.map((d,i)=>{
        const h = (d.v/max)*(height-36);
        return (
          <div key={i} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:8,height:"100%",justifyContent:"flex-end"}}
            onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}>
            <div style={{fontSize:15,fontWeight:750,color:hover===i?d.c:DS.i1,fontVariantNumeric:"tabular-nums",transition:`color ${DS.fast}`}}>{d.v}</div>
            <div style={{width:"100%",maxWidth:56,height:Math.max(h,3),background:d.c,borderRadius:"6px 6px 0 0",opacity:hover===i?1:0.85,transition:`opacity ${DS.fast}, height ${DS.slow}`}}/>
            <div style={{fontSize:11,color:DS.i3,fontWeight:500}}>{d.l}</div>
          </div>
        );
      })}
    </div>
  );
}

function Donut({ data, size=150 }) {
  const total = data.reduce((s,d)=>s+d.v,0);
  if (total===0) return <div style={{height:size,display:"flex",alignItems:"center",justifyContent:"center",color:DS.i3,fontSize:12}}>Sem dados</div>;
  const R0=size/2, stroke=18, r=R0-stroke/2;
  const circ=2*Math.PI*r;
  let offset=0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${R0} ${R0})`}>
        {data.map((d,i)=>{
          const frac=d.v/total;
          const len=frac*circ;
          const el=(
            <circle key={i} cx={R0} cy={R0} r={r} fill="none" stroke={d.c} strokeWidth={stroke}
              strokeDasharray={`${len} ${circ-len}`} strokeDashoffset={-offset} strokeLinecap="butt"/>
          );
          offset+=len;
          return el;
        })}
      </g>
      <text x={R0} y={R0-4} textAnchor="middle" fontSize="20" fontWeight="750" fill={DS.i1}>{pct(data[0]?.v||0,total)}%</text>
      <text x={R0} y={R0+14} textAnchor="middle" fontSize="10" fill={DS.i3}>{data[0]?.l||""}</text>
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════
function PgDash({ data, goTo, currentUser }) {
  const { isSmall, isMid } = useViewport();
  const [period,setPeriod]   = useState("30d");
  const [cfrom,setCfrom]     = useState(addD(TODAY,-30));
  const [cto,setCto]         = useState(TODAY);
  const { productions, payables, rawMaterials, trims, outsourced } = data;

  const inPeriod = d => periodFilter(d, period, cfrom, cto);
  const periodDays = period==="today"?1 : period==="7d"?7 : period==="30d"?30 : period==="month"?new Date().getDate() : period==="all"?60 : Math.max(diffD(cfrom,cto),1);

  const prodsInPeriod = productions.filter(p=>inPeriod(p.start));
  const byS = s => prodsInPeriod.filter(p=>p.status===s);
  const piecesIn = s => byS(s).reduce((sum,p)=>sum+p.total,0);
  const activeProds = productions.filter(p=>p.status!=="Finalizado");
  const totalInProd = activeProds.reduce((s,p)=>s+p.total,0);
  const overdue = activeProds.filter(p=>forecast(p,outsourced).late);
  const nextForecast = activeProds.map(p=>forecast(p,outsourced).fE).filter(Boolean).sort()[0];

  const alerts = getAlerts(data);
  const alLate = alerts.filter(a=>a.msg.includes("atrasada")).length;
  const alDue  = alerts.filter(a=>a.msg.includes("Vencida")||a.msg.includes("Vence")).length;

  const paidInPeriod = payables.filter(p=>p.status==="Pago"&&inPeriod(p.paid));
  const totalPaid = paidInPeriod.reduce((s,p)=>s+p.amt,0);
  const pendingTotal = payables.filter(p=>p.status!=="Pago").reduce((s,p)=>s+p.amt,0);
  const dueThisWeek = payables.filter(p=>p.status!=="Pago"&&isWK(p.due)).reduce((s,p)=>s+p.amt,0);
  // Faixa de contas semana/mês
  const dueWeek  = payables.filter(p=>p.status!=="Pago"&&isWK(p.due)).reduce((s,p)=>s+p.amt,0);
  const paidWeek = payables.filter(p=>p.status==="Pago"&&isWK(p.paid)).reduce((s,p)=>s+p.amt,0);
  const dueMonth = payables.filter(p=>p.status!=="Pago"&&isMO(p.due)).reduce((s,p)=>s+p.amt,0);
  const paidMonth= payables.filter(p=>p.status==="Pago"&&isMO(p.paid)).reduce((s,p)=>s+p.amt,0);
  const cats = ["Tecidos","Aviamentos","Corte","Costura","Acabamento"];
  const catColor = c => ({Corte:DS.warn,Costura:DS.blue,Acabamento:DS.pu,Tecidos:DS.ok,Aviamentos:DS.i3})[c]||DS.i3;
  const catTotal = c => paidInPeriod.filter(p=>p.cat===c).reduce((s,p)=>s+p.amt,0);

  const showDays = Math.min(periodDays, 30);
  const evoData = [];
  for (let i=showDays-1;i>=0;i--){
    const day = addD(TODAY,-i);
    const pieces = productions.filter(p=>p.finEnd===day).reduce((s,p)=>s+p.total,0)
      + productions.filter(p=>p.cutEnd===day).reduce((s,p)=>s+p.total,0)
      + productions.filter(p=>p.sewEnd===day).reduce((s,p)=>s+p.total,0);
    evoData.push({ l:FD(day).slice(0,5), v:pieces });
  }
  const totalEvo = evoData.reduce((s,d)=>s+d.v,0);

  const stages = [
    {l:"Corte",s:"Corte",st:DS.stCut},
    {l:"Costura",s:"Costura",st:DS.stSew},
    {l:"Acabamento",s:"Acabamento",st:DS.stFin},
    {l:"Finalizado",s:"Finalizado",st:DS.stDone},
  ].map(c=>({...c,pieces:piecesIn(c.s),fichas:byS(c.s).length}));
  const stageMax = Math.max(...stages.map(s=>s.pieces),1);
  const stageSum = stages.reduce((s,x)=>s+x.pieces,0);

  // Per-stage daily trend (pieces with that status, by production start day) for sparklines
  const trendDays = Math.min(periodDays, 14);
  const stageTrend = s => {
    const arr=[];
    for(let i=trendDays-1;i>=0;i--){
      const day=addD(TODAY,-i);
      const v=productions.filter(p=>p.status===s&&p.start<=day).reduce((sum,p)=>sum+p.total,0);
      arr.push(v);
    }
    return arr;
  };

  const costData = cats.map(c=>({l:c,v:catTotal(c),c:catColor(c)})).filter(d=>d.v>0).sort((a,b)=>b.v-a.v);
  const finData = [];
  for (let i=showDays-1;i>=0;i--){
    const day = addD(TODAY,-i);
    const amt = payables.filter(p=>p.status==="Pago"&&p.paid===day).reduce((s,p)=>s+p.amt,0);
    finData.push({ l:FD(day).slice(0,5), v:Math.round(amt) });
  }

  const wsRanked = outsourced.filter(w=>w.status==="Ativo").map(w=>({...w,avg:mean(w.hist)})).sort((a,b)=>a.avg-b.avg);

  // ── Top products by size (period filtered) ──
  const prodAgg = {};
  prodsInPeriod.forEach(p=>{
    const pr = data.products.find(x=>x.id===p.productId);
    if(!pr) return;
    if(!prodAgg[p.productId]) prodAgg[p.productId] = { name:pr.name, sku:pr.sku, total:0, sizes:{} };
    (p.qtys||[]).forEach(q=>{
      prodAgg[p.productId].total += q.qty;
      prodAgg[p.productId].sizes[q.size] = (prodAgg[p.productId].sizes[q.size]||0) + q.qty;
    });
  });
  const topProducts = Object.values(prodAgg).sort((a,b)=>b.total-a.total).slice(0,5);
  const topGrandTotal = topProducts.reduce((s,p)=>s+p.total,0);
  const topMax = Math.max(...topProducts.map(p=>p.total),1);

  const Section = ({label,action,children,mt=0}) => (
    <section style={{marginTop:mt}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:18}}>
        <h3 style={{margin:0,fontSize:13,fontWeight:650,color:DS.i2,letterSpacing:"-.1px"}}>{label}</h3>
        {action}
      </div>
      {children}
    </section>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:0}}>

      {/* ── HEADER ── */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:16,paddingBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <h1 style={{margin:0,fontSize:isSmall?24:28,fontWeight:780,color:DS.i1,letterSpacing:"-.8px"}}>Dashboard</h1>
          <button onClick={()=>goTo("financial")} style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",borderRadius:DS.r20,border:`1px solid ${DS.bd}`,background:"transparent",color:DS.i2,fontSize:12,fontWeight:500,cursor:"pointer",fontFamily:"inherit",transition:`all ${DS.fast}`}}
            onMouseEnter={e=>{e.currentTarget.style.background=DS.sur;e.currentTarget.style.borderColor=DS.bdM;e.currentTarget.style.color=DS.i1;}}
            onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.borderColor=DS.bd;e.currentTarget.style.color=DS.i2;}}>
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M2 10V3a1 1 0 011-1h8a1 1 0 011 1v5a1 1 0 01-1 1H4l-2 2z"/></svg>
            Chat financeiro
          </button>
          {overdue.length>0 && <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"4px 10px",borderRadius:DS.r20,background:DS.errSft,color:DS.err,fontSize:12,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:DS.err}}/>{overdue.length} atrasada(s)</span>}
        </div>
        <div style={{maxWidth:"100%",overflowX:"auto"}}><PeriodSelector value={period} onChange={setPeriod} customFrom={cfrom} customTo={cto} onFromChange={setCfrom} onToChange={setCto}/></div>
      </div>

      {/* ── STAGE HERO CARDS: Corte / Costura / Acabamento (+ Finalizado) ── */}
      <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr 1fr":"repeat(4,1fr)",gap:isSmall?12:16,marginTop:4}}>
        {stages.map(c=>{
          const has=c.pieces>0;
          const trend=stageTrend(c.s);
          return (
            <button key={c.l} onClick={()=>goTo("productions",c.s)} style={{display:"flex",flexDirection:"column",gap:0,background:DS.sur,border:`1px solid ${DS.bd}`,borderRadius:DS.r16,padding:0,cursor:"pointer",overflow:"hidden",textAlign:"left",fontFamily:"inherit",transition:`transform ${DS.base}, box-shadow ${DS.base}, border-color ${DS.base}`}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.e2;e.currentTarget.style.borderColor=DS.bdM;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=DS.bd;}}>
              <div style={{padding:isSmall?"16px 16px 8px":"20px 20px 10px"}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:14}}>
                  <span style={{width:8,height:8,borderRadius:"50%",background:has?c.st.c:DS.i4}}/>
                  <span style={{fontSize:12,fontWeight:600,color:has?c.st.c:DS.i3,letterSpacing:".02em"}}>{c.l}</span>
                </div>
                <div style={{display:"flex",alignItems:"baseline",gap:7}}>
                  <span style={{fontSize:isSmall?34:40,fontWeight:800,color:has?DS.i1:DS.i4,fontVariantNumeric:"tabular-nums",lineHeight:.9,letterSpacing:"-1.5px"}}>{c.pieces}</span>
                  <span style={{fontSize:12,color:DS.i3}}>peças</span>
                </div>
                <div style={{fontSize:11.5,color:DS.i3,marginTop:6}}>{c.fichas} ficha(s)</div>
              </div>
              <div style={{marginTop:"auto",height:42}}>
                <Sparkline data={trend} color={has?c.st.c:DS.i4} height={42}/>
              </div>
            </button>
          );
        })}
      </div>

      {/* ── ALERT CENTER — clean cards ── */}
      {alerts.length>0&&(
        <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"repeat(auto-fit, minmax(200px, 240px))",gap:10,marginTop:36}}>
          {alLate>0&&<AlertCard color={DS.err} count={alLate} label="Produções atrasadas" hint="Prazo de entrega excedido" onClick={()=>goTo("productions","late")}/>}
          {alDue>0&&<AlertCard color={DS.err} count={alDue} label="Contas vencidas" hint="Pagamentos em atraso" onClick={()=>goTo("financial")}/>}
        </div>
      )}

      {/* ── PRODUTOS MAIS PRODUZIDOS + EVOLUÇÃO (lado a lado) ── */}
      <div style={{display:"grid",gridTemplateColumns:isMid?"1fr":"1fr 1fr",gap:isSmall?32:44,marginTop:40}}>
        <Section label="Produtos mais produzidos"
          action={<div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:20,fontWeight:780,color:DS.i1,fontVariantNumeric:"tabular-nums",letterSpacing:"-.5px"}}>{topGrandTotal}</span><span style={{fontSize:12,color:DS.i3}}>peças</span></div>}>
          {topProducts.length===0
            ? <div style={{padding:"32px 0",textAlign:"center",color:DS.i3,fontSize:13}}>Nenhuma produção no período</div>
            : <div style={{display:"flex",flexDirection:"column",gap:16}}>
                {topProducts.map((p,i)=>{
                  const sizeEntries = Object.entries(p.sizes).sort((a,b)=>b[1]-a[1]);
                  const widthPct = (p.total/topMax)*100;
                  return (
                    <div key={i}>
                      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,gap:12}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}>
                          <span style={{fontSize:13,fontWeight:700,color:i===0?DS.blue:DS.i4,width:14,flexShrink:0,fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
                          <div style={{minWidth:0}}>
                            <div style={{fontSize:13.5,fontWeight:600,color:DS.i1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{p.name}</div>
                            <div style={{fontSize:10.5,color:DS.i3,fontFamily:"monospace"}}>{p.sku}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",alignItems:"baseline",gap:4,flexShrink:0}}>
                          <span style={{fontSize:18,fontWeight:750,color:DS.i1,fontVariantNumeric:"tabular-nums",letterSpacing:"-.4px"}}>{p.total}</span>
                          <span style={{fontSize:10,color:DS.i3}}>pç</span>
                        </div>
                      </div>
                      <div style={{height:6,background:DS.surEl,borderRadius:4,overflow:"hidden",marginBottom:9}}>
                        <div style={{height:"100%",width:`${Math.max(widthPct,4)}%`,background:i===0?DS.blue:DS.i3,borderRadius:4,transition:`width ${DS.slow}`,opacity:i===0?1:.55}}/>
                      </div>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap",paddingLeft:24}}>
                        {sizeEntries.map(([sz,qt])=>(
                          <div key={sz} style={{display:"flex",alignItems:"center",gap:5,padding:"3px 9px",borderRadius:DS.r8,background:DS.surEl}}>
                            <span style={{fontSize:10.5,fontWeight:600,color:DS.i3}}>{sz}</span>
                            <span style={{fontSize:11.5,fontWeight:700,color:DS.i1,fontVariantNumeric:"tabular-nums"}}>{qt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
          }
        </Section>

        <Section label="Evolução da produção"
          action={<div style={{display:"flex",alignItems:"baseline",gap:6}}><span style={{fontSize:20,fontWeight:750,color:DS.i1,fontVariantNumeric:"tabular-nums",letterSpacing:"-.4px"}}>{totalEvo}</span><span style={{fontSize:12,color:DS.i3}}>no período</span></div>}>
          <LineChart data={evoData} color={DS.blue} suffix=" pç" height={240} grid/>
        </Section>
      </div>

      {/* ── FAIXA DE CONTAS (semana/mês) ── */}
      <Section mt={44} label="Contas a pagar e pagas">
        <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
          {[
            {l:"A pagar na semana",v:dueWeek,c:DS.err,onClick:()=>goTo("financial")},
            {l:"Pagas na semana",v:paidWeek,c:DS.ok,onClick:()=>goTo("financial")},
            {l:"A pagar no mês",v:dueMonth,c:DS.warn,onClick:()=>goTo("financial")},
            {l:"Pagas no mês",v:paidMonth,c:DS.ok,onClick:()=>goTo("financial")},
          ].map(m=>(
            <button key={m.l} onClick={m.onClick} style={{display:"flex",flexDirection:"column",gap:8,padding:"16px 18px",borderRadius:DS.r14,border:`1px solid ${DS.bd}`,background:DS.sur,cursor:"pointer",textAlign:"left",fontFamily:"inherit",transition:`transform ${DS.base}, box-shadow ${DS.base}, border-color ${DS.base}`}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=DS.e2;e.currentTarget.style.borderColor=DS.bdM;}}
              onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=DS.bd;}}>
              <div style={{display:"flex",alignItems:"center",gap:7}}>
                <span style={{width:7,height:7,borderRadius:"50%",background:m.c,flexShrink:0}}/>
                <span style={{fontSize:11.5,color:DS.i3,fontWeight:500}}>{m.l}</span>
              </div>
              <span style={{fontSize:isSmall?17:20,fontWeight:750,color:DS.i1,fontVariantNumeric:"tabular-nums",letterSpacing:"-.4px"}}>{R(m.v)}</span>
            </button>
          ))}
        </div>
      </Section>

      {/* ── ANALYTICS ROW: Cost donut + Financial line ── */}
      <div style={{display:"grid",gridTemplateColumns:isMid?"1fr":"1fr 1.5fr",gap:isSmall?32:48,marginTop:48}}>
        <Section label="Distribuição de custos">
          {costData.length===0
            ? <div style={{height:150,display:"flex",alignItems:"center",justifyContent:"center",color:DS.i3,fontSize:12}}>Nenhum pagamento no período</div>
            : <div style={{display:"flex",alignItems:"center",gap:28}}>
                <Donut data={costData} size={148}/>
                <div style={{flex:1,display:"flex",flexDirection:"column",gap:11}}>
                  {costData.map(d=>(
                    <div key={d.l} style={{display:"flex",alignItems:"center",gap:10}}>
                      <span style={{width:9,height:9,borderRadius:3,background:d.c,flexShrink:0}}/>
                      <span style={{fontSize:13,color:DS.i2,flex:1}}>{d.l}</span>
                      <span style={{fontSize:12,color:DS.i3,fontVariantNumeric:"tabular-nums"}}>{R(d.v)}</span>
                      <span style={{fontSize:13,fontWeight:650,fontVariantNumeric:"tabular-nums",width:38,textAlign:"right"}}>{pct(d.v,totalPaid)}%</span>
                    </div>
                  ))}
                </div>
              </div>
          }
        </Section>
        <Section label="Evolução financeira"
          action={<div style={{display:"flex",alignItems:"baseline",gap:8}}><span style={{fontSize:20,fontWeight:750,color:DS.ok,fontVariantNumeric:"tabular-nums",letterSpacing:"-.3px"}}>{R(totalPaid)}</span><span style={{fontSize:12,color:DS.i3}}>pago</span></div>}>
          <LineChart data={finData} color={DS.ok} height={170} grid/>
        </Section>
      </div>

      {/* ── OPERATIONS ROW: Stock + Workshops ── */}
      <div style={{display:"grid",gridTemplateColumns:isMid?"1fr":"1fr 1fr",gap:isSmall?32:48,marginTop:48}}>
        <Section label="Custo médio dos tecidos" action={<button onClick={()=>goTo("fabrics")} style={linkBtn()}>Ver tecidos →</button>}>
          {rawMaterials.length===0
            ? <div style={{fontSize:13,color:DS.i3,padding:"8px 0"}}>Nenhum tecido cadastrado</div>
            : <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {[...rawMaterials].sort((a,b)=>(b.avgCost||0)-(a.avgCost||0)).slice(0,6).map((item,i,arr)=>(
                  <div key={item.id} onClick={()=>goTo("fabrics")} style={{display:"flex",alignItems:"center",gap:11,cursor:"pointer",padding:"11px 0",borderBottom:i<arr.length-1?`1px solid ${DS.bd}`:"none"}}>
                    <span style={{flex:1,fontSize:13.5,fontWeight:550,color:DS.i1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{item.desc}</span>
                    <span style={{fontSize:13,color:DS.i1,fontVariantNumeric:"tabular-nums",fontWeight:600}}>{R(item.avgCost||0)}</span>
                    <span style={{fontSize:11.5,color:DS.i3}}>/{item.unit}</span>
                  </div>
                ))}
              </div>}
        </Section>

        <Section label="Performance das oficinas" action={<button onClick={()=>goTo("outsourced")} style={linkBtn()}>Ver todas →</button>}>
          {wsRanked.length===0
            ? <div style={{fontSize:13,color:DS.i3,padding:"8px 0"}}>Nenhuma oficina ativa</div>
            : <div style={{display:"flex",flexDirection:"column",gap:0}}>
                {wsRanked.slice(0,5).map((w,i)=>{
                  const fastest = wsRanked[0].avg, slowest = wsRanked[wsRanked.length-1].avg;
                  const range = slowest-fastest||1;
                  const wpct = 100 - ((w.avg-fastest)/range)*70;
                  return (
                    <div key={w.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<Math.min(wsRanked.length,5)-1?`1px solid ${DS.bd}`:"none"}}>
                      <span style={{fontSize:12,fontWeight:700,color:i===0?DS.ok:DS.i4,width:16,fontVariantNumeric:"tabular-nums"}}>{i+1}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:13.5,fontWeight:550,color:DS.i1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",marginBottom:5}}>{w.name}</div>
                        <div style={{height:5,background:DS.surEl,borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${wpct}%`,background:i===0?DS.ok:DS.i3,borderRadius:3,transition:`width ${DS.slow}`}}/></div>
                      </div>
                      <span style={{fontSize:14,fontWeight:700,color:i===0?DS.ok:DS.i1,fontVariantNumeric:"tabular-nums",width:42,textAlign:"right"}}>{w.avg.toFixed(1)}d</span>
                    </div>
                  );
                })}
              </div>
          }
        </Section>
      </div>
    </div>
  );
}

function alertChip(c){ return {display:"inline-flex",alignItems:"center",gap:8,padding:"9px 16px",borderRadius:DS.r20,border:`1px solid ${c}33`,background:`${c}0D`,color:c,fontSize:13,fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:`background ${DS.fast}`}; }
function dot(c){ return {width:7,height:7,borderRadius:"50%",background:c,flexShrink:0,display:"inline-block"}; }
function linkBtn(){ return {background:"none",border:"none",color:DS.i3,fontSize:13,cursor:"pointer",fontFamily:"inherit",fontWeight:500,padding:0}; }
function AlertCard({ color, count, label, hint, onClick }){
  return (
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:11,padding:"11px 14px",borderRadius:DS.r12,border:`1px solid ${DS.bd}`,background:DS.sur,cursor:"pointer",fontFamily:"inherit",textAlign:"left",width:"100%",transition:`transform ${DS.base}, box-shadow ${DS.base}, border-color ${DS.base}`}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-1px)";e.currentTarget.style.boxShadow=DS.e1;e.currentTarget.style.borderColor=color+"55";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="";e.currentTarget.style.borderColor=DS.bd;}}>
      <div style={{width:32,height:32,borderRadius:DS.r8,background:color+"12",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
        <span style={{fontSize:15,fontWeight:800,color:color,fontVariantNumeric:"tabular-nums",lineHeight:1}}>{count}</span>
      </div>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:12.5,fontWeight:600,color:DS.i1}}>{label}</div>
        <div style={{fontSize:11,color:DS.i3}}>{hint}</div>
      </div>
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:.5}}><path d="M6 3l5 5-5 5"/></svg>
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTIONS
// ═══════════════════════════════════════════════════════════════════════════════
function PgProductions({ data, setData, reload, tenantId, fInit }) {
  const [filter,setFilter] = useState(fInit||"all");
  const [selId,setSelId]   = useState(null);
  const [tab,setTab]       = useState("timeline");
  useEffect(function(){if(fInit)setFilter(fInit);},[fInit]);

  const gP = id => data.products.find(p=>p.id===id);
  const fc = p => forecast(p, data.outsourced);
  const sel = data.productions.find(p=>p.id===selId)||null;

  const advance = async prod => {
    const idx = STEPS.indexOf(prod.status);
    if (idx>=3) return;
    const next = STEPS[idx+1];
    const ws   = data.outsourced.find(o=>o.type===next&&o.status==="Ativo");
    const pr   = gP(prod.productId);
    const price = next==="Costura"?pr?.sewPrice:next==="Acabamento"?pr?.finishPrice:pr?.cutPrice;
    const cost  = (price||0)*prod.total;
    const wF = next==="Costura"?"sewWs":next==="Acabamento"?"finWs":null;
    const sF = next==="Costura"?"sewStart":next==="Acabamento"?"finStart":null;
    const eF = idx===0?"cutEnd":idx===1?"sewEnd":"finEnd";
    const updated = {...prod,status:next,[eF]:TODAY,log:[...(prod.log||[]),{date:TODAY,step:next,txt:"Avançado para "+next}]};
    if(wF) updated[wF]=ws?.name||"";
    if(sF) updated[sF]=TODAY;
    if(next==="Costura") updated.sewC=cost;
    if(next==="Acabamento") updated.finC=cost;
    try {
      const savedProd = await sb.saveProd(updated, tenantId);
      setData(d=>({...d,productions:d.productions.map(p=>p.id===savedProd.id?savedProd:p)}));
      if(next!=="Finalizado"){
        const nPay={desc:next+" — "+prod.no,cat:next,sup:ws?.name||next,phone:ws?.phone||"",amt:cost,due:addD(TODAY,30),paid:null,status:"Pendente",prodId:prod.id,notes:prod.total+"pç × "+R(price||0)};
        const savedPay = await sb.savePay(nPay, tenantId);
        setData(d=>({...d,payables:[...d.payables,savedPay]}));
        if(ws) doPrint(savedProd,pr,next,data.outsourced);
      }
      showToast("Produção avançada para "+next+".","ok");
    } catch(e){ showToast("Erro ao avançar: "+e.message,"err"); }
    setSelId(null);
  };

  const list = useMemo(function(){
    if(filter==="all") return data.productions;
    if(filter==="late") return data.productions.filter(p=>p.status!=="Finalizado"&&fc(p).late);
    return data.productions.filter(p=>p.status===filter);
  },[data.productions,filter]);

  return (
    <div>
      <SH title="Produção" sub={data.productions.length+" fichas"}/>
      {/* Filter tabs — segmented, with colored count badges */}
      <div style={{display:"flex",gap:6,marginBottom:24,flexWrap:"wrap"}}>
        {[
          {v:"all",l:"Todas",c:DS.i2},
          {v:"Corte",l:"Corte",c:DS.stCut.c},
          {v:"Costura",l:"Costura",c:DS.stSew.c},
          {v:"Acabamento",l:"Acabamento",c:DS.stFin.c},
          {v:"Finalizado",l:"Finalizadas",c:DS.stDone.c},
          {v:"late",l:"Atrasadas",c:DS.err},
        ].map(({v,l,c})=>{
          const cnt = v==="all"?data.productions.length:v==="late"?data.productions.filter(p=>p.status!=="Finalizado"&&fc(p).late).length:data.productions.filter(p=>p.status===v).length;
          const active = filter===v;
          return (
            <button key={v} onClick={()=>setFilter(v)}
              style={{display:"inline-flex",alignItems:"center",gap:8,padding:"8px 14px",borderRadius:DS.r10,border:`1px solid ${active?(v==="late"?DS.errBd:DS.bdM):DS.bd}`,cursor:"pointer",background:active?(v==="late"?DS.errSft:DS.sur):"transparent",color:active?(v==="late"?DS.err:DS.i1):DS.i3,fontSize:13,fontWeight:active?650:500,fontFamily:"inherit",transition:`all ${DS.fast}`,boxShadow:active?DS.e1:"none"}}>
              {v!=="all"&&<span style={{width:7,height:7,borderRadius:"50%",background:c,flexShrink:0}}/>}
              <span>{l}</span>
              <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:20,height:20,padding:"0 6px",borderRadius:10,background:active?(v==="late"?DS.err:DS.ink):DS.surEl,color:active?"#fff":DS.i2,fontSize:11,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{cnt}</span>
            </button>
          );
        })}
      </div>

      {/* Cards */}
      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {list.map(prod=>{
          const pr = gP(prod.productId);
          const st = STATUS_MAP[prod.status];
          const f2 = fc(prod);
          const totalC = prod.cutC+prod.sewC+prod.finC+prod.matC+prod.trimC;
          return (
            <div key={prod.id} onClick={()=>{setSelId(prod.id);setTab("timeline");}}
              style={{background:DS.sur,border:`1px solid ${DS.bd}`,borderRadius:DS.r12,overflow:"hidden",cursor:"pointer",transition:'all '+DS.base}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.e2;e.currentTarget.style.borderColor=DS.bdM;}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow=DS.e1;e.currentTarget.style.borderColor=DS.bd;}}>
              <div style={{display:"flex"}}>
                <div style={{width:3,background:st.c,flexShrink:0}}/>
                <div style={{flex:1,padding:"14px 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:5}}>
                        <span style={{fontSize:11,fontFamily:"monospace",color:DS.i3}}>{prod.no}</span>
                        <SPill status={prod.status} xs/>
                        {f2.late&&<Chip xs c={DS.err} bg={DS.errSft} bd={DS.errBd}>Atrasada</Chip>}
                        {!f2.late&&prod.status!=="Finalizado"&&f2.dLeft<=2&&f2.dLeft>=0&&<Chip xs c={DS.warn} bg={DS.warnSft} bd={DS.warnBd}>{f2.dLeft===0?"Vence hoje":f2.dLeft+"d para prazo"}</Chip>}
                      </div>
                      <div style={{fontSize:15,fontWeight:700,color:DS.i1,letterSpacing:"-.2px",marginBottom:6}}>{pr?.name}</div>
                      {/* Pieces — primary info */}
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                        <span style={{fontSize:18,fontWeight:800,color:st.c,fontVariantNumeric:"tabular-nums"}}>{prod.total}</span>
                        <span style={{fontSize:12,color:DS.i2}}>peças</span>
                        <span style={{color:DS.bd,margin:"0 2px"}}>·</span>
                        <span style={{fontSize:12,color:DS.i3}}>{prod.totalFab?.toFixed(1)}m tecido</span>
                      </div>
                      <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                        {(prod.qtys||[]).map((q,i)=><Chip key={i} xs>{q.color} {q.size} · {q.qty}pç</Chip>)}
                      </div>
                    </div>
                    <div style={{textAlign:"right",flexShrink:0}}>
                      <div style={{fontSize:12,color:DS.i3,marginBottom:2}}>Início: {FD(prod.start)}</div>
                      <div style={{fontSize:12,color:prod.status!=="Finalizado"?(f2.late?DS.err:DS.i3):DS.ok,marginBottom:6}}>
                        {prod.status!=="Finalizado"?(f2.late?Math.abs(f2.dLeft)+"d atrasado":"Prev. "+FD(f2.fE)):("✓ "+FD(prod.finEnd))}
                      </div>
                      {totalC>0&&<div style={{display:"inline-block",background:DS.surEl,borderRadius:DS.r6,padding:"3px 8px"}}>
                        <span style={{fontSize:10,color:DS.i3}}>Custo/pç </span>
                        <strong style={{fontSize:12,color:DS.i1,fontVariantNumeric:"tabular-nums"}}>{R(totalC/prod.total)}</strong>
                      </div>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {list.length===0&&<div style={{textAlign:"center",padding:48,color:DS.i3,fontSize:13}}>Nenhuma produção encontrada</div>}
      </div>

      {/* Detail modal with tabs */}
      <Modal open={!!sel} onClose={()=>setSelId(null)} title={sel?.no||""} width={680}>
        {sel&&(function(){
          const prod = data.productions.find(p=>p.id===sel.id)||sel;
          const pr = gP(prod.productId);
          const totalC = prod.cutC+prod.sewC+prod.finC+prod.matC+prod.trimC;
          const linked = data.payables.filter(p=>p.prodId===prod.id);
          return (
            <div style={{display:"flex",flexDirection:"column",gap:0}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:20}}>
                <IB label="Produto" value={pr?.name}/>
                <IB label="SKU" value={pr?.sku}/>
                <IB label="Status" value={<SPill status={prod.status}/>}/>
                <IB label="Peças" value={prod.total+" peças"}/>
                <IB label="Tecido total" value={(prod.totalFab?.toFixed(1)||"—")+"m"}/>
                <IB label="Início" value={FD(prod.start)}/>
              </div>
              {/* Tabs */}
              <div style={{display:"flex",gap:0,borderBottom:`1px solid ${DS.bd}`,marginBottom:20}}>
                {[{id:"timeline",l:"Timeline"},{id:"grade",l:"Grade"},{id:"costs",l:"Custos"},{id:"accounts",l:"Contas ("+linked.length+")"},{id:"history",l:"Histórico"}].map(t=>(
                  <button key={t.id} onClick={()=>setTab(t.id)}
                    style={{padding:"8px 14px",fontSize:13,fontWeight:tab===t.id?600:400,color:tab===t.id?DS.i1:DS.i3,background:"none",border:"none",cursor:"pointer",borderBottom:`2px solid ${tab===t.id?DS.i1:"transparent"}`,marginBottom:-1,transition:`all ${DS.fast}`,fontFamily:"inherit"}}>
                    {t.l}
                  </button>
                ))}
              </div>

              {tab==="timeline"&&<PTimeline prod={prod} outsourced={data.outsourced}/>}

              {tab==="grade"&&(
                <div>
                  <div style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,overflow:"hidden"}}>
                    <Tbl cols={[{k:"color",l:"Cor"},{k:"rmName",l:"Tecido"},{k:"size",l:"Tam."},{k:"qty",l:"Peças",r:r=><strong style={{fontVariantNumeric:"tabular-nums"}}>{r.qty}</strong>},{k:"fab",l:"Tecido",r:r=>(r.fab||0).toFixed(2)+"m"}]} rows={prod.qtys||[]}/>
                  </div>
                  {pr?.trimUsage?.length>0&&(
                    <div style={{marginTop:12}}>
                      <Lbl ch="Aviamentos" style={{marginBottom:8}}/>
                      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                        {pr.trimUsage.map(tu=>{const t=data.trims.find(t=>t.id===tu.trimId);return t?<Chip key={tu.trimId}>{t.desc} · {tu.qty}{t.unit}</Chip>:null;})}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab==="costs"&&(
                <div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:12}}>
                    {[["Mat. Prima",prod.matC],["Aviamentos",prod.trimC],["Corte",prod.cutC],["Costura",prod.sewC],["Acabamento",prod.finC]].map(([l,v])=>(
                      <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"12px 14px"}}>
                        <Lbl ch={l} style={{marginBottom:4}}/><div style={{fontSize:16,fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{R(v)}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{padding:"14px 18px",borderRadius:DS.r10,background:DS.ink,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <div><div style={{fontSize:13,fontWeight:600,color:"#fff"}}>Custo total</div><div style={{fontSize:11,color:"rgba(255,255,255,.5)",marginTop:2}}>{R(totalC/prod.total)}/peça</div></div>
                    <div style={{fontSize:22,fontWeight:800,color:"#fff",fontVariantNumeric:"tabular-nums"}}>{R(totalC)}</div>
                  </div>
                </div>
              )}

              {tab==="accounts"&&(
                <div style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,overflow:"hidden"}}>
                  <Tbl cols={[{k:"desc",l:"Descrição"},{k:"amt",l:"Valor",r:r=><strong style={{fontVariantNumeric:"tabular-nums"}}>{R(r.amt)}</strong>},{k:"due",l:"Vencimento",r:r=><span style={{color:r.status!=="Pago"&&isOD(r.due)?DS.err:DS.i1,fontSize:12}}>{FD(r.due)}</span>},{k:"status",l:"",r:r=><Chip xs c={r.status==="Pago"?DS.ok:isOD(r.due)?DS.err:DS.warn} bg={r.status==="Pago"?DS.okSft:isOD(r.due)?DS.errSft:DS.warnSft} bd={r.status==="Pago"?DS.okBd:isOD(r.due)?DS.errBd:DS.warnBd}>{r.status}</Chip>}]} rows={linked}/>
                </div>
              )}

              {tab==="history"&&(
                <div>
                  {prod.log.map((h,i)=>{
                    const st = STATUS_MAP[h.step]||STATUS_MAP["Finalizado"];
                    return (
                      <div key={i} style={{display:"flex",gap:12,paddingBottom:i<prod.log.length-1?14:0}}>
                        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
                          <div style={{width:8,height:8,borderRadius:"50%",background:i===prod.log.length-1?st.c:DS.bd,marginTop:4,flexShrink:0}}/>
                          {i<prod.log.length-1&&<div style={{width:1,flex:1,background:DS.bd,minHeight:12,marginTop:3}}/>}
                        </div>
                        <div><div style={{fontSize:13}}>{h.txt}</div><div style={{fontSize:11,color:DS.i3,marginTop:2}}>{FD(h.date)}</div></div>
                      </div>
                    );
                  })}
                </div>
              )}

              <HR my={20}/>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {prod.status!=="Finalizado"&&<Btn onClick={()=>advance(prod)}>Avançar → {STEPS[STEPS.indexOf(prod.status)+1]}</Btn>}
                <Btn v="secondary" icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3.5 5V1.5h7V5M3.5 10.5h-1a1 1 0 01-1-1V6a1 1 0 011-1h9a1 1 0 011 1v3.5a1 1 0 01-1 1h-1M3.5 8.5h7v4h-7z"/></svg>} onClick={()=>doPrint(prod,pr,prod.status,data.outsourced)}>Imprimir Ficha</Btn>
                <Btn v="danger" icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>}
                  onClick={()=>confirmDelete(async()=>{try{await sb.deleteProd(prod.id);setData(d=>({...d,productions:d.productions.filter(p=>p.id!==prod.id),payables:d.payables.filter(p=>p.prodId!==prod.id)}));setSelId(null);showToast("Produção excluída.","ok");}catch(e){showToast("Erro: "+e.message,"err");}},{title:"Excluir produção",message:"A produção "+prod.no+" e as contas geradas por ela serão excluídas. Esta ação não pode ser desfeita."})}>Excluir</Btn>
              </div>
            </div>
          );
        })()} 
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CUT ORDER
// ═══════════════════════════════════════════════════════════════════════════════
function PgCutOrder({ data, setData, reload, tenantId }) {
  const { products, outsourced, rawMaterials } = data;
  const [pid,setPid]   = useState("");
  const [cw,setCw]     = useState("");
  const [sw,setSw]     = useState("");
  const [fw,setFw]     = useState("");
  const [sd,setSd]     = useState(TODAY);
  const [qtys,setQtys] = useState([]);
  const [ok,setOk]     = useState(false);
  const [editId,setEditId] = useState(null);
  const sp = products.find(p=>p.id==pid);
  const cutWs = outsourced.filter(o=>o.type==="Corte"&&o.status==="Ativo");
  const sewWsList = outsourced.filter(o=>o.type==="Costura"&&o.status==="Ativo");
  const finWsList = outsourced.filter(o=>o.type==="Acabamento"&&o.status==="Ativo");
  useEffect(()=>setQtys([]),[pid]);

  const setQ = (color,rmId,size,val) => setQtys(prev=>{const next=prev.filter(q=>!(q.color===color&&q.size===size));const n=parseInt(val)||0;if(n>0)next.push({color,rmId,size,qty:n});return next;});
  const gQ   = (color,size) => qtys.find(q=>q.color===color&&q.size===size)?.qty||"";
  const totalPcs = qtys.reduce((s,q)=>s+q.qty,0);
  const cFab = (color,size,qty)=>{if(!sp)return 0;const cf=sp.colorFabrics?.find(c=>c.color===color);return (cf?.cons?.[size]||0)*qty;};
  const fabSum=()=>{const m={};qtys.forEach(q=>{const cf=sp?.colorFabrics?.find(c=>c.color===q.color);if(!cf)return;const rm=rawMaterials.find(r=>r.id===cf.rmId);if(!m[cf.rmId])m[cf.rmId]={rm,total:0};m[cf.rmId].total+=cFab(q.color,q.size,q.qty);});return Object.values(m);};
  const matEst=()=>fabSum().reduce((s,{rm,total})=>s+(rm?.avgCost||0)*total,0);
  const cutEst=()=>(sp?.cutPrice||0)*totalPcs;

  const [showNew,setShowNew] = useState(false);
  // Forro — tecido secundário opcional por cor
  const [forroEnabled,setForroEnabled] = useState(false);
  const [forroItems,setForroItems] = useState([]);
  const setForroRm = (color,rmId) => setForroItems(prev=>{const next=prev.filter(f=>f.color!==color);if(rmId)next.push({color,rmId,cons:{}});return next;});
  const setForroCons = (color,sz,val) => setForroItems(prev=>prev.map(f=>f.color===color?{...f,cons:{...f.cons,[sz]:parseFloat(val)||0}}:f));
  const getForroItem = color => forroItems.find(f=>f.color===color);
  const forroFabSum = () => {
    const m={};
    forroItems.forEach(f=>{
      const totalForColor = qtys.filter(q=>q.color===f.color).reduce((s,q)=>s+(f.cons?.[q.size]||0)*q.qty,0);
      if(totalForColor>0&&f.rmId){
        const rm=rawMaterials.find(r=>r.id==f.rmId);
        if(!m[f.rmId])m[f.rmId]={rm,total:0};
        m[f.rmId].total+=totalForColor;
      }
    });
    return Object.values(m);
  };

  const create = async () => {
    if(!pid||!cw||totalPcs===0) return;
    const pr=sp;
    const td=new Date(TODAY+"T12:00:00"); const dd=String(td.getDate()).padStart(2,"0"); const mm=String(td.getMonth()+1).padStart(2,"0"); const aa=String(td.getFullYear()).slice(-2);
    const seq=String(data.productions.filter(p=>p.no&&p.no.startsWith("OP"+dd+mm+aa)).length+1).padStart(2,"0");
    const no="OP"+dd+mm+aa+"-"+seq;
    const enriched=qtys.map(q=>{
      const cf=pr.colorFabrics?.find(c=>c.color===q.color);
      const rm=rawMaterials.find(r=>r.id===cf?.rmId);
      const fi=forroItems.find(f=>f.color===q.color);
      const forroRm=fi?rawMaterials.find(r=>r.id==fi.rmId):null;
      const forroFab=fi?(fi.cons?.[q.size]||0)*q.qty:0;
      return{...q,rmId:cf?.rmId,rmName:rm?.desc,fab:cFab(q.color,q.size,q.qty),forroRmId:fi?.rmId||null,forroRmName:forroRm?.desc||null,forroFab};
    });
    const totalFab=enriched.reduce((s,q)=>s+(q.fab||0),0);
    const matC=matEst(), cutC=cutEst();
    const trimC=(pr.trimUsage||[]).reduce((s,tu)=>{const t=data.trims.find(t=>t.id===tu.trimId);return s+(t?.avgCost||0)*tu.qty*totalPcs;},0);
    const fabConsumed = {};
    enriched.forEach(q=>{ if(q.rmId){ fabConsumed[q.rmId]=(fabConsumed[q.rmId]||0)+(q.fab||0); } });
    // Adicionar consumo do forro ao fabConsumed
    enriched.forEach(q=>{ if(q.forroRmId){ fabConsumed[q.forroRmId]=(fabConsumed[q.forroRmId]||0)+(q.forroFab||0); } });
    const fabByColor = {};
    enriched.forEach(q=>{ if(q.rmId){ if(!fabByColor[q.rmId])fabByColor[q.rmId]={}; fabByColor[q.rmId][q.color]=(fabByColor[q.rmId][q.color]||0)+(q.fab||0); } });
    const trimConsumed = {};
    (pr.trimUsage||[]).forEach(tu=>{ trimConsumed[tu.trimId]=(trimConsumed[tu.trimId]||0)+tu.qty*totalPcs; });
    try {
      // 1. Save production
      const nP={no,productId:pid,qtys:enriched,total:totalPcs,totalFab,cutWs:cw,sewWs:sw,finWs:fw,status:"Corte",start:sd,cutStart:sd,cutEnd:null,sewStart:null,sewEnd:null,finStart:null,finEnd:null,cutC,sewC:0,finC:0,matC,trimC,log:[{date:sd,step:"Corte",txt:"Ordem criada — enviada para "+cw}]};
      const savedProd = await sb.saveProd(nP, tenantId);
      // 2. Save payable
      const nPay={desc:"Corte — "+no,cat:"Corte",sup:cw,phone:outsourced.find(o=>o.name===cw)?.phone||"",amt:cutC,due:addD(sd,30),paid:null,status:"Pendente",prodId:savedProd.id,notes:totalPcs+"pç × "+R(pr.cutPrice)};
      const savedPay = await sb.savePay(nPay, tenantId);
      // Estoque não é mais controlado por quantidade — só o custo médio das compras importa.
      setData(d=>({...d,productions:[...d.productions,savedProd],payables:[...d.payables,savedPay]}));
      doPrint(savedProd,pr,"Corte",outsourced);
      setPid("");setQtys([]);setCw("");setSw("");setFw("");setSd(TODAY);setShowNew(false);setForroEnabled(false);setForroItems([]);
      showToast("OP "+no+" criada com sucesso.","ok");
    } catch(e){ showToast("Erro ao criar OP: "+e.message,"err"); }
  };

  const delProd = (id,e) => { e.stopPropagation(); const prod=data.productions.find(p=>p.id===id); confirmDelete(async()=>{try{await sb.deleteProd(id);setData(d=>({...d,productions:d.productions.filter(p=>p.id!==id),payables:d.payables.filter(p=>p.prodId!==id)}));showToast("Ordem excluída.","ok");}catch(e){showToast("Erro: "+e.message,"err");}},{title:"Excluir ordem de corte",message:"A ordem e as contas geradas por ela serão excluídas. Esta ação não pode ser desfeita."}); };

  const activeProds = data.productions.filter(p=>p.status!=="Finalizado");

  return (
    <div>
      <SH title="Ordem de Corte" sub="Produções em andamento · grade vinculada ao tecido" action={<Btn onClick={()=>{setPid("");setQtys([]);setCw("");setSd(TODAY);setShowNew(true);}} icon={<svg width="15" height="15" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M7 2v10M2 7h10"/></svg>}>Nova ordem</Btn>}/>

      {/* Active productions — main content */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))",gap:14}}>
        {activeProds.map(prod=>{
          const pr=products.find(p=>p.id===prod.productId);
          const st=STATUS_MAP[prod.status];
          const f2=forecast(prod,outsourced);
          return (
            <div key={prod.id} onClick={()=>setEditId(prod.id)} style={{background:DS.sur,border:`1px solid ${DS.bd}`,borderRadius:DS.r14,padding:"16px 18px",cursor:"pointer",transition:`transform ${DS.base}, box-shadow ${DS.base}, border-color ${DS.base}`,position:"relative",overflow:"hidden"}}
              onMouseEnter={e=>{e.currentTarget.style.boxShadow=DS.e2;e.currentTarget.style.borderColor=DS.bdM;e.currentTarget.style.transform="translateY(-2px)";}}
              onMouseLeave={e=>{e.currentTarget.style.boxShadow="none";e.currentTarget.style.borderColor=DS.bd;e.currentTarget.style.transform="";}}>
              <div style={{position:"absolute",top:0,left:0,width:3,height:"100%",background:st.c}}/>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                    <span style={{fontSize:10,fontFamily:"monospace",color:DS.i3}}>{prod.no}</span>
                    <SPill status={prod.status} xs/>
                    {f2.late&&<Chip xs c={DS.err} bg={DS.errSft} bd={DS.errBd}>Atrasada</Chip>}
                  </div>
                  <div style={{fontSize:14,fontWeight:650,color:DS.i1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{pr?.name}</div>
                </div>
                <div style={{display:"flex",gap:2,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
                  <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>setEditId(prod.id)} title="Editar"/>
                  <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 2.5h3v3h-3zM9.5 2.5h3v3h-3zM1.5 8.5h3v3h-3zM9.5 8.5h3v3h-3zM4.5 4h5M4.5 10h5M7 4v6"/></svg>} onClick={()=>doPrint(prod,pr,prod.status,outsourced)} title="Imprimir"/>
                  <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delProd(prod.id,e)} title="Excluir" v="danger"/>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:8}}>
                <span style={{fontSize:26,fontWeight:780,color:DS.i1,fontVariantNumeric:"tabular-nums",letterSpacing:"-.6px"}}>{prod.total}</span>
                <span style={{fontSize:12,color:DS.i3}}>peças · {(prod.totalFab||0).toFixed(1)}m</span>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:11.5,color:DS.i3,paddingTop:10,borderTop:`1px solid ${DS.bd}`}}>
                <span>Início {FD(prod.start)}</span>
                <span style={{color:f2.late?DS.err:DS.i2,fontWeight:600}}>{f2.late?Math.abs(f2.dLeft)+"d atrasado":"Prev. "+FD(f2.fE)}</span>
              </div>
            </div>
          );
        })}
        {activeProds.length===0&&<div style={{gridColumn:"1/-1",textAlign:"center",padding:"56px 24px",color:DS.i3,fontSize:13}}>Nenhuma produção ativa. Clique em "Nova ordem" para começar.</div>}
      </div>

      {/* New order modal */}
      <Modal open={showNew} onClose={()=>setShowNew(false)} title="Nova Ordem de Corte" width={560}>
        <div style={{display:"flex",flexDirection:"column",gap:16}}>
          <Sel label="Produto" req value={pid} onChange={setPid} options={[{v:"",l:"Selecione…"},...products.map(p=>({v:p.id,l:p.sku+" · "+p.name}))]}/>
          {sp&&<>
            <div>
              <label style={{fontSize:12,fontWeight:500,color:DS.i2,display:"block",marginBottom:8}}>Grade por cor e tamanho *</label>
              <div style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                  <thead><tr style={{background:DS.canvas}}>
                    <th style={{padding:"8px 12px",textAlign:"left",fontSize:11,color:DS.i3,fontWeight:600,borderBottom:`1px solid ${DS.bd}`}}>Cor → Tecido</th>
                    {sp.sizes.map(sz=><th key={sz} style={{padding:"8px 10px",textAlign:"center",fontSize:11,color:DS.i3,fontWeight:600,borderBottom:`1px solid ${DS.bd}`}}>{sz}</th>)}
                  </tr></thead>
                  <tbody>{sp.colorFabrics?.map(cf=>{const rm=rawMaterials.find(r=>r.id===cf.rmId);return (
                    <tr key={cf.color} style={{borderBottom:`1px solid ${DS.bd}`}}>
                      <td style={{padding:"8px 12px"}}><div style={{fontSize:12,fontWeight:600}}>{cf.color}</div><div style={{fontSize:10,color:DS.i3,marginTop:1}}>{rm?.desc} · {rm?.code}</div></td>
                      {sp.sizes.map(sz=>{const cons=cf.cons?.[sz]||0;return (
                        <td key={sz} style={{padding:"4px 5px",textAlign:"center"}}>
                          <input type="number" min="0" value={gQ(cf.color,sz)} onChange={e=>setQ(cf.color,cf.rmId,sz,e.target.value)} style={{width:48,height:32,padding:"0 4px",borderRadius:DS.r6,border:`1px solid ${DS.bd}`,textAlign:"center",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                          {cons>0&&<div style={{fontSize:9,color:DS.i4,marginTop:2}}>{cons}m</div>}
                        </td>
                      );})}
                    </tr>
                  );})}
                  </tbody>
                </table>
              </div>
              {totalPcs>0&&<div style={{marginTop:6,fontSize:12,textAlign:"right"}}>Total: <strong style={{color:DS.blue}}>{totalPcs} peças</strong></div>}
            </div>
            {totalPcs>0&&fabSum().length>0&&(
              <div style={{background:DS.blueSft,border:`1px solid ${DS.blueBd}`,borderRadius:DS.r8,padding:"10px 12px"}}>
                <Lbl ch="Tecidos necessários" style={{marginBottom:8,color:DS.blue}}/>
                {fabSum().map(({rm,total})=>(
                  <div key={rm?.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:DS.i2}}>{rm?.desc}</span>
                    <strong style={{color:DS.blue,fontVariantNumeric:"tabular-nums"}}>{total.toFixed(2)}m</strong>
                  </div>
                ))}
                {forroEnabled&&forroFabSum().map(({rm,total})=>(
                  <div key={"forro-"+rm?.id} style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:4}}>
                    <span style={{color:DS.pu}}>Forro: {rm?.desc}</span>
                    <strong style={{color:DS.pu,fontVariantNumeric:"tabular-nums"}}>{total.toFixed(2)}m</strong>
                  </div>
                ))}
              </div>
            )}

            {/* Forro opcional */}
            {sp&&totalPcs>0&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
                  <Lbl ch="Forro (opcional)"/>
                  <button onClick={()=>{setForroEnabled(e=>!e);setForroItems([]);}} style={{fontSize:12,padding:"4px 10px",borderRadius:DS.r8,border:`1px solid ${DS.bd}`,background:forroEnabled?DS.ink:"transparent",color:forroEnabled?"#fff":DS.i2,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>
                    {forroEnabled?"Remover forro":"+ Adicionar forro"}
                  </button>
                </div>
                {forroEnabled&&(
                  <div style={{display:"flex",flexDirection:"column",gap:12,background:DS.surEl,borderRadius:DS.r10,padding:14}}>
                    <div style={{fontSize:12,color:DS.i3}}>Selecione o tecido de forro e o consumo por tamanho para cada cor que utiliza forro.</div>
                    {sp.colorFabrics?.map(cf=>{
                      const fi=getForroItem(cf.color);
                      return (
                        <div key={cf.color} style={{background:DS.sur,borderRadius:DS.r8,padding:"10px 12px",border:`1px solid ${DS.bd}`}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <span style={{fontSize:13,fontWeight:600,color:DS.i1}}>{cf.color}</span>
                            <Sel label="" value={fi?.rmId||""} onChange={v=>setForroRm(cf.color,v)} options={[{v:"",l:"Sem forro"},...rawMaterials.map(r=>({v:r.id,l:r.desc+" ("+r.code+")"}))]}/> 
                          </div>
                          {fi?.rmId&&(
                            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                              {sp.sizes?.map(sz=>(
                                <div key={sz} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                                  <span style={{fontSize:10,color:DS.i3}}>{sz}</span>
                                  <input type="number" min="0" step="0.01" value={fi.cons?.[sz]||""} onChange={e=>setForroCons(cf.color,sz,e.target.value)} placeholder="0m" style={{width:52,height:30,padding:"0 4px",borderRadius:DS.r6,border:`1px solid ${DS.bd}`,textAlign:"center",fontSize:12,fontFamily:"inherit",outline:"none"}}/>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Oficina de Corte" req value={cw} onChange={setCw} options={[{v:"",l:"Selecione…"},...cutWs.map(w=>({v:w.name,l:w.name}))]}/>
            <Inp label="Data de início" type="date" value={sd} onChange={setSd}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Oficina de Costura" value={sw} onChange={setSw} options={[{v:"",l:"Definir depois…"},...sewWsList.map(w=>({v:w.name,l:w.name}))]} hint="Opcional — pode definir ao avançar"/>
            <Sel label="Acabamento" value={fw} onChange={setFw} options={[{v:"",l:"Definir depois…"},...finWsList.map(w=>({v:w.name,l:w.name}))]} hint="Opcional — pode definir ao avançar"/>
          </div>
          {sp&&totalPcs>0&&(
            <div style={{background:DS.surEl,borderRadius:DS.r8,padding:"12px 14px"}}>
              <Lbl ch="Estimativa de custo" style={{marginBottom:8}}/>
              {[["Mat. Prima",matEst()],["Corte",cutEst()]].map(([l,v])=>(
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12,color:DS.i2,marginBottom:4}}>
                  <span>{l}</span><strong style={{color:DS.i1,fontVariantNumeric:"tabular-nums"}}>{R(v)}</strong>
                </div>
              ))}
              <HR my={8}/>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:13,fontWeight:700}}>
                <span>Total</span><span style={{fontVariantNumeric:"tabular-nums"}}>{R(matEst()+cutEst())}</span>
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>setShowNew(false)}>Cancelar</Btn>
            <Btn onClick={create} disabled={!pid||!cw||totalPcs===0}>Criar Ordem e Gerar Ficha</Btn>
          </div>
        </div>
      </Modal>

      {editId&&<CutOrderEdit prod={data.productions.find(p=>p.id===editId)} data={data} setData={setData} tenantId={tenantId} onClose={()=>setEditId(null)}/>}
    </div>
  );
}

function CutOrderEdit({ prod, data, setData, tenantId, onClose }){
  const { products, outsourced } = data;
  const pr = products.find(p=>p.id===prod.productId);
  const [start,setStart]   = useState(prod.start);
  const [cutWs,setCutWs]   = useState(prod.cutWs||"");
  const [sewWs,setSewWs]   = useState(prod.sewWs||"");
  const [finWs,setFinWs]   = useState(prod.finWs||"");
  const [qtys,setQtys]     = useState(prod.qtys||[]);
  const cutList = outsourced.filter(o=>o.type==="Corte"&&o.status==="Ativo");
  const sewList = outsourced.filter(o=>o.type==="Costura"&&o.status==="Ativo");
  const finList = outsourced.filter(o=>o.type==="Acabamento"&&o.status==="Ativo");

  const setQty = (idx,val) => setQtys(prev=>prev.map((q,i)=>i===idx?{...q,qty:parseInt(val)||0,fab:((pr?.colorFabrics?.find(c=>c.color===q.color)?.cons?.[q.size])||0)*(parseInt(val)||0)}:q));
  const total = qtys.reduce((s,q)=>s+q.qty,0);
  const totalFab = qtys.reduce((s,q)=>s+(q.fab||0),0);

  const save = async () => {
    try{
      const updated={...prod,start,cutWs,sewWs,finWs,qtys,total,totalFab};
      const saved=await sb.saveProd(updated,tenantId);
      setData(d=>({...d,productions:d.productions.map(p=>p.id===saved.id?saved:p)}));
      showToast("Ordem de corte atualizada.","ok");
      onClose();
    }catch(e){showToast("Erro: "+e.message,"err");}
  };

  return (
    <Modal open={true} onClose={onClose} title={"Editar "+prod.no} width={560}>
      <div style={{display:"flex",flexDirection:"column",gap:16}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
          <IB label="Produto" value={pr?.name}/>
          <IB label="Status atual" value={<SPill status={prod.status}/>}/>
        </div>
        <Inp label="Data de início" type="date" value={start} onChange={setStart}/>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
          <Sel label="Oficina Corte" value={cutWs} onChange={setCutWs} options={[{v:"",l:"—"},...cutList.map(w=>({v:w.name,l:w.name}))]}/>
          <Sel label="Oficina Costura" value={sewWs} onChange={setSewWs} options={[{v:"",l:"—"},...sewList.map(w=>({v:w.name,l:w.name}))]}/>
          <Sel label="Oficina Acab." value={finWs} onChange={setFinWs} options={[{v:"",l:"—"},...finList.map(w=>({v:w.name,l:w.name}))]}/>
        </div>
        <div>
          <Lbl ch="Quantidades por cor e tamanho" style={{marginBottom:8}}/>
          <div style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}>
              <thead><tr style={{background:DS.surEl}}>
                <th style={{textAlign:"left",padding:"8px 12px",fontSize:11,color:DS.i3,fontWeight:600}}>Cor</th>
                <th style={{textAlign:"left",padding:"8px 12px",fontSize:11,color:DS.i3,fontWeight:600}}>Tam.</th>
                <th style={{textAlign:"center",padding:"8px 12px",fontSize:11,color:DS.i3,fontWeight:600}}>Peças</th>
              </tr></thead>
              <tbody>
                {qtys.map((q,i)=>(
                  <tr key={i} style={{borderTop:`1px solid ${DS.bd}`}}>
                    <td style={{padding:"8px 12px"}}>{q.color}</td>
                    <td style={{padding:"8px 12px"}}>{q.size}</td>
                    <td style={{padding:"4px 12px",textAlign:"center"}}>
                      <input type="number" min="0" value={q.qty} onChange={e=>setQty(i,e.target.value)} style={{width:64,height:32,padding:"0 6px",borderRadius:DS.r6,border:`1px solid ${DS.bd}`,textAlign:"center",fontSize:13,fontFamily:"inherit",outline:"none"}}/>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{marginTop:8,fontSize:13,textAlign:"right"}}>Total: <strong style={{color:DS.blue}}>{total} peças</strong> · {totalFab.toFixed(1)}m</div>
        </div>
        <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
          <Btn v="secondary" onClick={onClose}>Cancelar</Btn>
          <Btn onClick={save}>Salvar alterações</Btn>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FINANCIAL
// ═══════════════════════════════════════════════════════════════════════════════
function PgFinancial({ data, setData, reload, tenantId, fInit }) {
  const [fCat,setFC] = useState("all");
  const [fSt,setFS]  = useState("all");
  const [fPer,setFP] = useState(fInit||"all");
  const [fMes,setFMes] = useState("all");
  const [sel,setSel] = useState(null);
  const [showF,setShowF] = useState(false);
  const [showChat,setShowChat] = useState(false);
  const [chatMsg,setChatMsg] = useState("");
  const [chatHistory,setChatHistory] = useState([]);
  const [chatLoading,setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  useEffect(function(){if(fInit)setFP(fInit);},[fInit]);
  useEffect(function(){chatEndRef.current?.scrollIntoView({behavior:"smooth"});},[chatHistory]);

  const CATEGORIAS = ["Aluguel","Salários","Energia","Água","Internet/Telefone","Impostos","Matéria-prima","Aviamentos","Manutenção","Marketing","Outros"];

  // ── Parser local (sem IA) ──
  const parseMsg = (msg) => {
    const lines = msg.split("\n").map(l=>l.trim()).filter(Boolean);
    const lancamentos = [];

    const catMap = {
      "aluguel":["aluguel","locação","locacao","imóvel","imovel"],
      "Salários":["salário","salario","funcionário","funcionario","pagamento de pessoal","folha"],
      "Energia":["energia","luz","eletric"],
      "Água":["água","agua","saneamento"],
      "Internet/Telefone":["internet","telefone","celular","plano","tim","vivo","claro","oi"],
      "Impostos":["imposto","tax","das","mei","inss","nota fiscal"],
      "Aviamentos":["ziper","zipper","zíper","elástico","elastico","botão","botao","linha","fio","fita","rebite","ilhós","viés","vies","etiqueta","aviamento","fecho","velcro","colchete"],
      "Matéria-prima":["tecido","malha","helanca","oxford","jeans","tricoline","voil","viscose","forro","feltro","neoprene"],
      "Manutenção":["manutenção","manutencao","conserto","reparo","peça","peca"],
      "Marketing":["marketing","publicidade","anuncio","anúncio","instagram","facebook"],
    };

    const detectCat = (txt) => {
      const lower = txt.toLowerCase();
      for(const [cat, words] of Object.entries(catMap)){
        if(words.some(w=>lower.includes(w))) return cat;
      }
      return "Outros";
    };

    const parseDue = (txt) => {
      const lower = txt.toLowerCase();
      // "vence dia X" ou "dia X"
      const diaMatch = lower.match(/(?:vence\s+)?dia\s+(\d{1,2})/);
      if(diaMatch){
        const dia = parseInt(diaMatch[1]);
        const now = new Date(TODAY+"T12:00:00");
        let d = new Date(now.getFullYear(), now.getMonth(), dia);
        if(d <= now) d = new Date(now.getFullYear(), now.getMonth()+1, dia);
        return d.toISOString().split("T")[0];
      }
      // "vence DD/MM" ou "DD/MM"
      const dateMatch = lower.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
      if(dateMatch){
        const [,dd,mm,yy] = dateMatch;
        const year = yy ? (yy.length===2?"20"+yy:yy) : new Date().getFullYear();
        return `${year}-${mm.padStart(2,"0")}-${dd.padStart(2,"0")}`;
      }
      return TODAY;
    };

    const parseAmt = (txt) => {
      // Encontra valor numérico: 1.500,00 ou 1500,00 ou 1500.00 ou 1500
      const m = txt.match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?(?:\.\d{1,2})?)/);
      if(!m) return 0;
      let v = m[1];
      // Formato brasileiro: 1.500,00
      if(v.includes(".") && v.includes(",")) v = v.replace(".","").replace(",",".");
      // Só vírgula: 40,00
      else if(v.includes(",")) v = v.replace(",",".");
      return parseFloat(v)||0;
    };

    const cleanDesc = (txt, amt) => {
      // Remove o valor do texto para ficar só a descrição
      let d = txt
        .replace(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:,\d{1,2})?)/g,"")
        .replace(/vence\s+dia\s+\d{1,2}/gi,"")
        .replace(/dia\s+\d{1,2}/gi,"")
        .replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g,"")
        .replace(/\s{2,}/g," ")
        .trim();
      return d || txt.trim();
    };

    for(const line of lines){
      const amt = parseAmt(line);
      if(amt <= 0) continue;
      const due = parseDue(line);
      const desc = cleanDesc(line, amt);
      const cat = detectCat(line);
      lancamentos.push({desc, amt, cat, due, sup:""});
    }

    return lancamentos;
  };

  const sendChat = async () => {
    if(!chatMsg.trim()||chatLoading) return;
    const msg = chatMsg.trim();
    setChatMsg("");
    setChatHistory(h=>[...h,{role:"user",text:msg}]);
    setChatLoading(true);
    try {
      const lancamentos = parseMsg(msg);
      if(lancamentos.length===0) throw new Error("Não encontrei nenhum valor. Tente: '40,00 Ziper 20cm'");

      const saved = await sb.insertPayBatch(
        lancamentos.map(l=>({
          desc:l.desc, cat:l.cat, sup:"", phone:"",
          amt:l.amt, due:l.due, paid:null, status:"Pendente",
          prodId:null, notes:"Lançado via chat"
        })),
        tenantId
      );
      setData(d=>({...d,payables:[...d.payables,...saved]}));

      const preview = lancamentos.map(l=>`✓ ${l.desc} — ${R(l.amt)} · ${l.cat} · vence ${FD(l.due)}`).join("\n");
      setChatHistory(h=>[...h,{role:"ai",text:`${lancamentos.length} conta(s) lançada(s):\n\n${preview}`,ok:true}]);
    } catch(e){
      setChatHistory(h=>[...h,{role:"ai",text:"Não entendi. Tente assim:\n40,00 Ziper 20cm\n500 elástico vence dia 20\naluguel 1800",ok:false}]);
    }
    setChatLoading(false);
  };

  const EF = {desc:"",cat:"Aluguel",sup:"",phone:"",amt:"",due:TODAY,tipo:"avulsa",parcelas:"2",recMeses:"6"};
  const [form,setForm] = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));

  const doMark = async id => { try{ const u=await sb.updatePayStatus(id,"Pago",TODAY); setData(d=>({...d,payables:d.payables.map(p=>p.id===id?u:p)})); showToast("Pagamento registrado.","ok"); }catch(e){showToast("Erro: "+e.message,"err");} };
  const doUnmark = async id => { try{ const u=await sb.updatePayStatus(id,"Pendente",null); setData(d=>({...d,payables:d.payables.map(p=>p.id===id?u:p)})); showToast("Pagamento revertido para pendente.","ok"); }catch(e){showToast("Erro: "+e.message,"err");} };
  const delPay = (id,e) => { if(e)e.stopPropagation(); confirmDelete(async()=>{try{await sb.deletePay(id);setData(d=>({...d,payables:d.payables.filter(p=>p.id!==id)}));}catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir conta",message:"Esta conta a pagar será excluída. Esta ação não pode ser desfeita."}); };
  const wa = (phone,desc,amt) => { const m=encodeURIComponent("Olá! Pgto ref: *"+desc+"* — "+R(amt)); window.open("https://wa.me/55"+phone.replace(/\D/g,"")+"?text="+m,"_blank"); };

  const doSaveExpense = async () => {
    if(!form.desc||!form.amt){ showToast("Preencha descrição e valor.","err"); return; }
    const amt=parseFloat(form.amt)||0;
    try {
      if(form.tipo==="avulsa"){
        const saved=await sb.savePay({desc:form.desc,cat:form.cat,sup:form.sup,phone:form.phone,amt,due:form.due,paid:null,status:"Pendente",prodId:null,notes:"Despesa avulsa"},tenantId);
        setData(d=>({...d,payables:[...d.payables,saved]}));
      } else if(form.tipo==="parcelada"){
        const n=parseInt(form.parcelas)||2;
        const arr=[];
        for(let i=0;i<n;i++){ arr.push({desc:form.desc+" — Parcela "+(i+1)+"/"+n,cat:form.cat,sup:form.sup,phone:form.phone,amt,due:addD(form.due,i*30),paid:null,status:"Pendente",prodId:null,notes:"Parcelamento"}); }
        const saved=await sb.insertPayBatch(arr,tenantId);
        setData(d=>({...d,payables:[...d.payables,...saved]}));
      } else if(form.tipo==="recorrente"){
        const n=parseInt(form.recMeses)||6;
        const arr=[];
        for(let i=0;i<n;i++){ arr.push({desc:form.desc+" — "+(i+1)+"º mês",cat:form.cat,sup:form.sup,phone:form.phone,amt,due:addD(form.due,i*30),paid:null,status:"Pendente",prodId:null,notes:"Conta recorrente mensal"}); }
        const saved=await sb.insertPayBatch(arr,tenantId);
        setData(d=>({...d,payables:[...d.payables,...saved]}));
      }
      setShowF(false); setForm(EF);
      showToast("Despesa lançada com sucesso.","ok");
    } catch(e){ showToast("Erro ao lançar: "+e.message,"err"); }
  };

  const list = data.payables.filter(p=>{
    if(fCat!=="all"&&p.cat!==fCat) return false;
    if(fSt!=="all"&&p.status!==fSt) return false;
    if(fPer==="overdue"&&!isOD(p.due)) return false;
    if(fPer==="today"&&!isTD(p.due)) return false;
    if(fPer==="week"&&!isWK(p.due)) return false;
    if(fPer==="month"&&!isMO(p.due)) return false;
    if(fMes!=="all"&&(p.due||"").slice(0,7)!==fMes) return false;
    return true;
  });

  /* meses com lançamentos, do mais recente ao mais antigo */
  const mesesFin = [...new Set(data.payables.map(p=>(p.due||"").slice(0,7)).filter(Boolean))].sort().reverse();
  const nomeMesFin = ym => { if(!ym) return ""; const [y,m]=ym.split("-");
    return ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][parseInt(m)-1]+"/"+y.slice(-2); };

  const cats = ["all",...new Set(data.payables.map(p=>p.cat))];
  const sumP = arr => arr.reduce((s,p)=>s+p.amt,0);

  return (
    <div>
      <SH title="Financeiro" action={
        <div style={{display:"flex",gap:8}}>
          <Btn v="secondary" onClick={()=>setShowChat(true)}>💬 Chat rápido</Btn>
          <Btn onClick={()=>{setForm(EF);setShowF(true);}}>+ Nova despesa</Btn>
        </div>
      }/>

      {/* Filtro por mês */}
      {mesesFin.length>0&&(
        <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:20,
          paddingBottom:16,borderBottom:`1px solid ${DS.bd}`}}>
          <span style={{fontSize:11,fontWeight:600,color:DS.i3,letterSpacing:".05em",
            textTransform:"uppercase",marginRight:4}}>Mês</span>
          <button onClick={()=>setFMes("all")}
            style={{height:34,padding:"0 14px",borderRadius:DS.r8,cursor:"pointer",fontFamily:"inherit",
              fontSize:13,fontWeight:fMes==="all"?600:500,
              border:`1px solid ${fMes==="all"?DS.ink:DS.bd}`,
              background:fMes==="all"?DS.ink:"transparent",
              color:fMes==="all"?"#fff":DS.i2,transition:`all ${DS.fast}`}}>Todos</button>
          {mesesFin.slice(0,12).map(ym=>{
            const on=fMes===ym;
            const itens=data.payables.filter(p=>(p.due||"").slice(0,7)===ym);
            const aberto=itens.filter(p=>p.status!=="Pago").length;
            return (
              <button key={ym} onClick={()=>setFMes(ym)}
                style={{height:34,padding:"0 14px",borderRadius:DS.r8,cursor:"pointer",fontFamily:"inherit",
                  fontSize:13,fontWeight:on?600:500,display:"inline-flex",alignItems:"center",gap:6,
                  border:`1px solid ${on?DS.ink:DS.bd}`,background:on?DS.ink:"transparent",
                  color:on?"#fff":DS.i2,transition:`all ${DS.fast}`}}>
                {nomeMesFin(ym)}
                {aberto>0&&<span style={{fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10,
                  background:on?"rgba(255,255,255,.2)":DS.surEl,color:on?"#fff":DS.i3}}>{aberto}</span>}
              </button>
            );
          })}
        </div>
      )}

      {/* Summary row */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:24}}>
        {[
          {l:"Pendente",v:sumP(data.payables.filter(p=>p.status!=="Pago")),c:DS.i1},
          {l:"Vencidas",v:sumP(data.payables.filter(p=>isOD(p.due)&&p.status!=="Pago")),c:DS.err},
          {l:"Pagas",v:sumP(data.payables.filter(p=>p.status==="Pago")),c:DS.ok},
          {l:"Total geral",v:sumP(data.payables),c:DS.i2},
        ].map(item=>(
          <Card key={item.l} p={14}>
            <Lbl ch={item.l} style={{marginBottom:5}}/>
            <div style={{fontSize:20,fontWeight:700,color:item.c,fontVariantNumeric:"tabular-nums"}}>{R(item.v)}</div>
          </Card>
        ))}
      </div>

      {/* Filters — inline, minimal */}
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap",alignItems:"flex-end"}}>
        <Sel value={fCat} onChange={setFC} style={{width:180}} options={cats.map(c=>({v:c,l:c==="all"?"Todas categorias":c}))}/>
        <Sel value={fSt} onChange={setFS} style={{width:130}} options={[{v:"all",l:"Todos status"},{v:"Pendente",l:"Pendente"},{v:"Pago",l:"Pago"}]}/>
        <Sel value={fPer} onChange={setFP} style={{width:150}} options={[{v:"all",l:"Todo período"},{v:"overdue",l:"Vencidas"},{v:"today",l:"Hoje"},{v:"week",l:"Esta semana"},{v:"month",l:"Este mês"}]}/>
        <span style={{marginLeft:"auto",fontSize:12,color:DS.i3,alignSelf:"center"}}>{list.length} registro(s)</span>
      </div>

      <div style={{background:DS.sur,border:`1px solid ${DS.bd}`,borderRadius:DS.r12,overflow:"hidden",boxShadow:DS.e1}}>
        <Tbl onRow={r=>setSel(r)} rows={list} cols={[
          {k:"desc",l:"Descrição",r:r=><span style={{fontWeight:500}}>{r.desc}</span>},
          {k:"cat",l:"Categoria",r:r=><Chip xs>{r.cat}</Chip>},
          {k:"sup",l:"Fornecedor",r:r=><span style={{fontSize:12,color:DS.i2}}>{r.sup}</span>},
          {k:"amt",l:"Valor",r:r=><strong style={{fontVariantNumeric:"tabular-nums"}}>{R(r.amt)}</strong>},
          {k:"due",l:"Vencimento",r:r=><span style={{fontSize:12,color:r.status!=="Pago"&&isOD(r.due)?DS.err:DS.i1}}>{FD(r.due)}{r.status!=="Pago"&&isOD(r.due)?" ⚠":""}</span>},
          {k:"status",l:"",r:r=><Chip xs c={r.status==="Pago"?DS.ok:isOD(r.due)?DS.err:DS.warn} bg={r.status==="Pago"?DS.okSft:isOD(r.due)?DS.errSft:DS.warnSft} bd={r.status==="Pago"?DS.okBd:isOD(r.due)?DS.errBd:DS.warnBd}>{r.status}</Chip>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              {r.status!=="Pago"&&<Btn sz="sm" v="ok" onClick={()=>doMark(r.id)}>Pagar</Btn>}
              {r.status==="Pago"&&<IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 7a5 5 0 105-5M2 7l-.5-2.5M2 7l2.5-.5"/></svg>} onClick={()=>doUnmark(r.id)} title="Reverter para pendente"/>}
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delPay(r.id,e)} title="Excluir" v="danger"/>
            </div>
          )},
        ]}/>
      </div>

      <Modal open={!!sel} onClose={()=>setSel(null)} title="Detalhes do pagamento" width={460}>
        {sel&&(function(){
          const prod=data.productions.find(p=>p.id===sel.prodId);
          const pr=prod?data.products.find(p=>p.id===prod.productId):null;
          return (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["Descrição",sel.desc,"span 2"],["Fornecedor",sel.sup],["Telefone",sel.phone||"—"],["Valor",R(sel.amt)],["Vencimento",FD(sel.due)],["Pago em",FD(sel.paid)],["Status",sel.status],["Categoria",sel.cat]].map(([l,v,col])=>(
                  <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px",gridColumn:col||undefined}}>
                    <Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
              {sel.notes&&<div style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}><Lbl ch="Obs." style={{marginBottom:3}}/><div style={{fontSize:13}}>{sel.notes}</div></div>}
              {prod&&pr&&<div style={{background:DS.blueSft,border:`1px solid ${DS.blueBd}`,borderRadius:DS.r10,padding:"12px 14px"}}>
                <Lbl ch="Produção vinculada" style={{marginBottom:6,color:DS.blue}}/>
                <div style={{fontSize:14,fontWeight:600}}>{prod.no} · {pr.name}</div>
                <div style={{display:"flex",gap:6,marginTop:6}}><SPill status={prod.status} xs/><Chip xs>{prod.total}pç</Chip></div>
              </div>}
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {sel.status!=="Pago"&&<Btn v="ok" onClick={()=>{doMark(sel.id);setSel(null);}}>Marcar como Pago</Btn>}
                {sel.status==="Pago"&&<Btn v="secondary" onClick={()=>{doUnmark(sel.id);setSel(null);}}>Reverter para pendente</Btn>}
                {sel.phone&&<Btn v="ghost" style={{color:"#25D366"}} onClick={()=>wa(sel.phone,sel.desc,sel.amt)}>WhatsApp</Btn>}
                <Btn v="danger" onClick={()=>{delPay(sel.id);setSel(null);}}>Excluir</Btn>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Chat rápido com IA */}
      <Modal open={showChat} onClose={()=>setShowChat(false)} title="💬 Chat financeiro" width={500}>
        <div style={{display:"flex",flexDirection:"column",gap:0}}>
          <div style={{fontSize:12,color:DS.i3,marginBottom:12,lineHeight:1.6,background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}>
            Digite os lançamentos como se fosse WhatsApp. A IA entende e cria as contas automaticamente.<br/>
            <strong>Exemplos:</strong> "40,00 Ziper 20cm" · "500 elástico vence dia 20" · "aluguel 1800"
          </div>
          {/* Histórico */}
          <div style={{minHeight:200,maxHeight:320,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,padding:"4px 0"}}>
            {chatHistory.length===0&&(
              <div style={{textAlign:"center",color:DS.i4,fontSize:13,padding:"40px 0"}}>Nenhuma mensagem ainda.<br/>Digite abaixo para começar.</div>
            )}
            {chatHistory.map((m,i)=>(
              <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start"}}>
                <div style={{
                  maxWidth:"85%",padding:"10px 14px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",
                  background:m.role==="user"?DS.ink:(m.ok?DS.okSft:DS.errSft),
                  color:m.role==="user"?"#fff":(m.ok?DS.ok:DS.err),
                  border:m.role!=="user"?`1px solid ${m.ok?DS.okBd:DS.errBd}`:"none",
                  fontSize:13,lineHeight:1.6,whiteSpace:"pre-wrap"
                }}>{m.text}</div>
              </div>
            ))}
            {chatLoading&&(
              <div style={{display:"flex",justifyContent:"flex-start"}}>
                <div style={{padding:"10px 14px",borderRadius:"16px 16px 16px 4px",background:DS.surEl,color:DS.i3,fontSize:13}}>
                  Analisando...
                </div>
              </div>
            )}
            <div ref={chatEndRef}/>
          </div>
          {/* Input */}
          <div style={{display:"flex",gap:8,alignItems:"flex-end"}}>
            <textarea
              value={chatMsg}
              onChange={e=>setChatMsg(e.target.value)}
              onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendChat();}}}
              placeholder={"40,00 Ziper 20cm\n500 elástico vence dia 20"}
              rows={3}
              style={{flex:1,padding:"10px 12px",borderRadius:DS.r10,border:`1px solid ${DS.bd}`,fontSize:13,fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.6,background:DS.sur,color:DS.i1}}
            />
            <Btn onClick={sendChat} disabled={chatLoading||!chatMsg.trim()} style={{height:44,paddingLeft:20,paddingRight:20}}>
              {chatLoading?"...":"Enviar"}
            </Btn>
          </div>
          <div style={{fontSize:11,color:DS.i4,marginTop:6}}>Enter para enviar · Shift+Enter para nova linha</div>
        </div>
      </Modal>

      {/* Formulário de nova despesa */}
      <Modal open={showF} onClose={()=>{setShowF(false);setForm(EF);}} title="Nova despesa" width={520}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Descrição" req value={form.desc} onChange={fld("desc")} placeholder="Ex: Aluguel do galpão"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Categoria" value={form.cat} onChange={fld("cat")} options={CATEGORIAS.map(c=>({v:c,l:c}))}/>
            <Inp label="Valor (R$)" req type="number" value={form.amt} onChange={fld("amt")} placeholder="0,00"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fornecedor / Para quem" value={form.sup} onChange={fld("sup")} placeholder="Opcional"/>
            <Inp label="Telefone" value={form.phone} onChange={fld("phone")} placeholder="Opcional"/>
          </div>
          <div>
            <Lbl ch="Tipo de lançamento" style={{marginBottom:8}}/>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[{v:"avulsa",l:"Conta única"},{v:"parcelada",l:"Parcelada"},{v:"recorrente",l:"Recorrente (mensal)"}].map(opt=>(
                <button key={opt.v} onClick={()=>fld("tipo")(opt.v)} style={{flex:1,minWidth:130,padding:"10px 12px",borderRadius:DS.r8,border:`1px solid ${form.tipo===opt.v?DS.ink:DS.bd}`,background:form.tipo===opt.v?DS.ink:"transparent",color:form.tipo===opt.v?"#fff":DS.i2,cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:500}}>{opt.l}</button>
              ))}
            </div>
          </div>
          {form.tipo==="parcelada"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:DS.surEl,borderRadius:DS.r10,padding:14}}>
              <Inp label="Nº de parcelas que faltam" type="number" value={form.parcelas} onChange={fld("parcelas")} placeholder="2"/>
              <Inp label="1º vencimento" type="date" value={form.due} onChange={fld("due")}/>
              <div style={{gridColumn:"span 2",fontSize:12,color:DS.i3}}>Serão criadas {form.parcelas||0} parcelas de {R(parseFloat(form.amt)||0)}, uma a cada 30 dias a partir do 1º vencimento.</div>
            </div>
          )}
          {form.tipo==="recorrente"&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,background:DS.surEl,borderRadius:DS.r10,padding:14}}>
              <Inp label="Por quantos meses" type="number" value={form.recMeses} onChange={fld("recMeses")} placeholder="6"/>
              <Inp label="1º vencimento" type="date" value={form.due} onChange={fld("due")}/>
              <div style={{gridColumn:"span 2",fontSize:12,color:DS.i3}}>Conta de {R(parseFloat(form.amt)||0)} repetida por {form.recMeses||0} meses (ex: aluguel, salário fixo).</div>
            </div>
          )}
          {form.tipo==="avulsa"&&(
            <Inp label="Vencimento" type="date" value={form.due} onChange={fld("due")}/>
          )}
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSaveExpense}>Lançar despesa</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// AGENDA — Executive style
// ═══════════════════════════════════════════════════════════════════════════════
function PgAgenda({ data, setData, reload, tenantId }) {
  const [sel,setSel] = useState(null);
  const [mes,setMes] = useState("prox");   // "prox" = próximos vencimentos | "YYYY-MM"
  const pend = data.payables.filter(p=>p.status!=="Pago");

  /* meses que têm contas em aberto, mais recente primeiro */
  const mesesDisponiveis = [...new Set(pend.map(p=>(p.due||"").slice(0,7)).filter(Boolean))].sort();
  const nomeMes = ym => {
    if(!ym) return "";
    const [y,m]=ym.split("-");
    const nm=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"][parseInt(m)-1];
    return nm+"/"+y.slice(-2);
  };

  const doMes = mes!=="prox";
  const doMesItems = pend.filter(p=>(p.due||"").slice(0,7)===mes);
  const secs = doMes
    ? [
        {t:"Vencidas em "+nomeMes(mes), c:DS.err, items:doMesItems.filter(p=>isOD(p.due)), bg:DS.errSft, bd:DS.errBd},
        {t:"A vencer em "+nomeMes(mes), c:DS.i1,  items:doMesItems.filter(p=>!isOD(p.due)), bg:DS.surEl, bd:DS.bd},
      ]
    : [
        {t:"Vencidas",      c:DS.err,  items:pend.filter(p=>isOD(p.due)), bg:DS.errSft,  bd:DS.errBd},
        {t:"Hoje",          c:DS.warn, items:pend.filter(p=>isTD(p.due)&&!isOD(p.due)), bg:DS.warnSft, bd:DS.warnBd},
        {t:"Próximos 7 dias",c:DS.blue,items:pend.filter(p=>!isOD(p.due)&&!isTD(p.due)&&isWK(p.due)), bg:DS.blueSft, bd:DS.blueBd},
        {t:"Este mês",      c:DS.i1,  items:pend.filter(p=>!isWK(p.due)&&isMO(p.due)), bg:DS.surEl, bd:DS.bd},
      ];
  const totalVisivel = secs.reduce((s,x)=>s+x.items.reduce((a,p)=>a+p.amt,0),0);
  const doPay = async id => { try{ const u=await sb.updatePayStatus(id,"Pago",TODAY); setData(d=>({...d,payables:d.payables.map(p=>p.id===id?u:p)})); }catch(e){showToast("Erro: "+e.message,"err");} };

  const agProd = sel ? data.productions.find(p=>p.id===sel.prodId)||null : null;
  const agPr = agProd ? data.products.find(p=>p.id===agProd.productId)||null : null;

  return (
    <div>
      <SH title="Agenda de Pagamentos"
        sub={doMes?`Contas em aberto de ${nomeMes(mes)} · ${R(totalVisivel)}`:"Próximos vencimentos e alertas"}/>

      {/* Filtro por mês */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap",alignItems:"center",marginBottom:20,
        paddingBottom:16,borderBottom:`1px solid ${DS.bd}`}}>
        <span style={{fontSize:11,fontWeight:600,color:DS.i3,letterSpacing:".05em",
          textTransform:"uppercase",marginRight:4}}>Período</span>
        <button onClick={()=>setMes("prox")}
          style={{height:34,padding:"0 14px",borderRadius:DS.r8,cursor:"pointer",fontFamily:"inherit",
            fontSize:13,fontWeight:mes==="prox"?600:500,
            border:`1px solid ${mes==="prox"?DS.ink:DS.bd}`,
            background:mes==="prox"?DS.ink:"transparent",
            color:mes==="prox"?"#fff":DS.i2,transition:`all ${DS.fast}`}}>
          Próximos
        </button>
        {mesesDisponiveis.map(ym=>{
          const on=mes===ym;
          const qtd=pend.filter(p=>(p.due||"").slice(0,7)===ym).length;
          return (
            <button key={ym} onClick={()=>setMes(ym)}
              style={{height:34,padding:"0 14px",borderRadius:DS.r8,cursor:"pointer",fontFamily:"inherit",
                fontSize:13,fontWeight:on?600:500,display:"inline-flex",alignItems:"center",gap:6,
                border:`1px solid ${on?DS.ink:DS.bd}`,background:on?DS.ink:"transparent",
                color:on?"#fff":DS.i2,transition:`all ${DS.fast}`}}>
              {nomeMes(ym)}
              <span style={{fontSize:11,fontWeight:700,padding:"1px 6px",borderRadius:10,
                background:on?"rgba(255,255,255,.2)":DS.surEl,
                color:on?"#fff":DS.i3}}>{qtd}</span>
            </button>
          );
        })}
      </div>

      {/* Summary strip */}
      <div style={{display:"grid",gridTemplateColumns:`repeat(${secs.length},1fr)`,gap:8,marginBottom:24}}>
        {secs.map(sec=>(
          <div key={sec.t} style={{padding:"12px 14px",borderRadius:DS.r10,background:sec.items.length>0?sec.bg:DS.surEl,border:`1px solid ${sec.items.length>0?sec.bd:DS.bd}`}}>
            <div style={{fontSize:22,fontWeight:800,color:sec.items.length>0?sec.c:DS.i4,fontVariantNumeric:"tabular-nums"}}>{sec.items.length}</div>
            <div style={{fontSize:11,fontWeight:500,color:sec.items.length>0?sec.c:DS.i3,marginTop:2}}>{sec.t}</div>
            {sec.items.length>0&&<div style={{fontSize:12,fontVariantNumeric:"tabular-nums",color:sec.c,marginTop:4,fontWeight:600}}>{R(sec.items.reduce((s,p)=>s+p.amt,0))}</div>}
          </div>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:24}}>
        {secs.map(sec=>(
          <div key={sec.t}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:sec.items.length>0?sec.c:DS.i4}}/>
              <span style={{fontSize:14,fontWeight:600,color:sec.items.length>0?sec.c:DS.i3}}>{sec.t}</span>
              {sec.items.length>0&&<span style={{marginLeft:"auto",fontWeight:700,fontSize:13,fontVariantNumeric:"tabular-nums"}}>{R(sec.items.reduce((s,p)=>s+p.amt,0))}</span>}
            </div>
            {sec.items.length===0
              ? <div style={{padding:"10px 14px",background:DS.surEl,borderRadius:DS.r8,fontSize:12,color:DS.i3}}>Nenhum lançamento</div>
              : (
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {sec.items.map(item=>{
                    const prod=data.productions.find(p=>p.id===item.prodId);
                    const pr=prod?data.products.find(p=>p.id===prod.productId):null;
                    return (
                      <div key={item.id} onClick={()=>setSel(item)}
                        style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",borderRadius:DS.r10,background:DS.sur,border:`1px solid ${DS.bd}`,borderLeft:`2px solid ${sec.c}`,cursor:"pointer",transition:`all ${DS.fast}`}}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow=DS.e1}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow=""}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:600}}>{item.desc}</div>
                          <div style={{fontSize:11,color:DS.i2,marginTop:2}}>{item.sup}{pr&&" · "+pr.name} · {FDsh(item.due)}</div>
                        </div>
                        <Chip xs>{item.cat}</Chip>
                        <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums",minWidth:72,textAlign:"right"}}>{R(item.amt)}</span>
                        <Btn sz="sm" v="ok" onClick={e=>{e.stopPropagation();doPay(item.id);}}>Pagar</Btn>
                      </div>
                    );
                  })}
                </div>
              )}
          </div>
        ))}
      </div>

      <Modal open={!!sel} onClose={()=>setSel(null)} title="Detalhes" width={440}>
        {sel&&(function(){
          const prod=data.productions.find(p=>p.id===sel.prodId);
          const pr=prod?data.products.find(p=>p.id===prod.productId):null;
          return (
            <div style={{display:"flex",flexDirection:"column",gap:14}}>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
                {[["Descrição",sel.desc,"span 2"],["Valor",R(sel.amt)],["Vencimento",FD(sel.due)],["Fornecedor",sel.sup],["Categoria",sel.cat]].map(([l,v,col])=>(
                  <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px",gridColumn:col||undefined}}>
                    <Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div>
                  </div>
                ))}
              </div>
              {prod&&pr&&<div style={{background:DS.blueSft,border:`1px solid ${DS.blueBd}`,borderRadius:DS.r10,padding:"12px 14px"}}>
                <Lbl ch="Produção vinculada" style={{marginBottom:6,color:DS.blue}}/>
                <div style={{fontSize:14,fontWeight:600}}>{prod.no} · {pr.name}</div>
                <div style={{marginTop:6}}><SPill status={prod.status} xs/></div>
              </div>}
              <div style={{display:"flex",gap:8}}>
                <Btn v="ok" onClick={async()=>{try{const u=await sb.updatePayStatus(sel.id,"Pago",TODAY);setData(d=>({...d,payables:d.payables.map(p=>p.id===sel.id?u:p)}));setSel(null);}catch(e){showToast("Erro: "+e.message,"err")}}} >Marcar como Pago</Btn>
                {sel.phone&&<Btn v="ghost" style={{color:"#25D366"}} onClick={()=>{const msg=encodeURIComponent("Olá! Pgto ref: *"+sel.desc+"* — "+R(sel.amt));window.open("https://wa.me/55"+sel.phone.replace(/\D/g,"")+"?text="+msg);}}>WA</Btn>}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STOCK (unified view)
// ═══════════════════════════════════════════════════════════════════════════════
function PgStock({ data, setData, reload, tenantId }) {
  const [sel,setSel]     = useState(null);
  const [ed,setEd]       = useState(null);
  const [search,setSearch] = useState("");
  const all = [...data.rawMaterials.map(m=>({...m,tp:"Tecido"})),...data.trims.map(t=>({...t,tp:"Aviamento"}))];
  const filtered = all.filter(i=>i.desc.toLowerCase().includes(search.toLowerCase())||i.code.toLowerCase().includes(search.toLowerCase()));

  const fld = k => v => setEd(p=>({...p,[k]:v}));
  const openEdit = item => setEd({...item});
  const saveEdit = async () => {
    const isRM = ed.tp==="Tecido";
    const patch = { ...ed, avgCost:parseFloat(ed.avgCost)||0 };
    try {
      if(isRM){ const r=await sb.saveRM(patch,tenantId); setData(d=>({...d,rawMaterials:d.rawMaterials.map(m=>m.id===r.id?{...r,tp:"Tecido"}:m)})); }
      else { const r=await sb.saveTrim(patch,tenantId); setData(d=>({...d,trims:d.trims.map(t=>t.id===r.id?r:t)})); }
      setEd(null); setSel(null);
      showToast("Item atualizado com sucesso.","ok");
    } catch(e){ showToast("Erro: "+e.message,"err"); }
  };

  return (
    <div>
      <SH title="Custos de materiais" sub={all.length+" itens · custo médio calculado pelas compras"}/>
      <div style={{marginBottom:16}}>
        <Inp placeholder="Buscar por nome ou código…" value={search} onChange={setSearch}/>
      </div>
      <Card p={0}>
        <Tbl onRow={r=>setSel(r)} rows={filtered} cols={[
          {k:"tp",l:"Tipo",r:r=><Chip xs>{r.tp}</Chip>},
          {k:"code",l:"Código",r:r=><span style={{fontFamily:"monospace",fontSize:11,color:DS.i3}}>{r.code}</span>},
          {k:"desc",l:"Descrição",r:r=><span style={{fontWeight:500}}>{r.desc}</span>},
          {k:"avgCost",l:"Custo médio",r:r=><span style={{fontWeight:700,fontVariantNumeric:"tabular-nums"}}>{R(r.avgCost||0)}<span style={{fontSize:11,color:DS.i3,fontWeight:400}}>/{r.unit}</span></span>},
          {k:"compras",l:"Compras",r:r=>{const n=purchaseHistory(data.purchases,r.id,r.tp==="Tecido"?"rm":"trim").length;return <span style={{fontSize:12,color:n?DS.i2:DS.i4}}>{n?n+" compra(s)":"sem compras"}</span>;}},
          {k:"avgCost",l:"Custo médio",r:r=><span style={{fontVariantNumeric:"tabular-nums",fontWeight:500}}>{R(r.avgCost)}/{r.unit}</span>},
          {k:"supplier",l:"Fornecedor",r:r=><span style={{fontSize:12,color:DS.i2}}>{r.supplier}</span>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4,alignItems:"center"}} onClick={e=>e.stopPropagation()}>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>openEdit(r)} title="Editar"/>
            </div>
          )},
        ]}/>
      </Card>

      {/* View modal */}
      <Modal open={!!sel&&!ed} onClose={()=>setSel(null)} title={sel?.desc||""} width={480}>
        {sel&&<StockItemView item={(sel.tp==="Tecido"?data.rawMaterials:data.trims).find(x=>x.id===sel.id&&x.code===sel.code)||sel} onEdit={()=>openEdit(sel)}/>}
      </Modal>

      {/* Edit modal */}
      <Modal open={!!ed} onClose={()=>setEd(null)} title={"Editar "+(ed?.desc||"")} width={460}>
        {ed&&<div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Código" value={ed.code} onChange={fld("code")}/>
            <Sel label="Unidade" value={ed.unit||"m"} onChange={fld("unit")} options={["m","kg","un","rolo"].map(u=>({v:u,l:u}))}/>
          </div>
          <Inp label="Descrição" req value={ed.desc} onChange={fld("desc")}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fornecedor" value={ed.supplier} onChange={fld("supplier")}/>
            <Inp label="Telefone" value={ed.phone} onChange={fld("phone")}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Inp label="Mínimo" type="number" value={ed.min} onChange={fld("min")}/>
            <Inp label="Custo médio" type="number" value={ed.avgCost} onChange={fld("avgCost")}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>setEd(null)}>Cancelar</Btn>
            <Btn onClick={saveEdit}>Salvar alterações</Btn>
          </div>
        </div>}
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PURCHASES — with installments
// ═══════════════════════════════════════════════════════════════════════════════
function PgPurchases({ data, setData, reload, tenantId }) {
  const [showF,setShowF]   = useState(false);
  const [ed,setEd]         = useState(null);
  const [sel,setSel]       = useState(null);
  const EF = { type:"rm",itemId:"",sup:"",phone:"",item:"",color:"",qty:"",price:"",pay:"Boleto",parcelas:"1",date:TODAY,due:"",parcelaDates:[],notes:"" };
  const [form,setForm]     = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));

  // Items available = registered fabrics or trims (depends on type)
  const itemOptions = (form.type==="rm" ? data.rawMaterials : data.trims);
  const selItem = itemOptions.find(x=>x.id===parseInt(form.itemId));
  // Color variations come from the fabric's own registered colors
  const itemColors = form.type==="rm" && selItem && selItem.colors ? selItem.colors.map(c=>c.name) : [];

  // When item picked, auto-fill supplier/phone
  const pickItem = id => {
    const it = itemOptions.find(x=>x.id===parseInt(id));
    setForm(p=>({...p, itemId:id, item:it?it.desc:"", sup:it?.supplier||p.sup, phone:it?.phone||p.phone, color:""}));
  };
  // Update a single parcela date
  const setParcelaDate = (i,v) => setForm(p=>{ const arr=[...(p.parcelaDates||[])]; arr[i]=v; return {...p,parcelaDates:arr}; });
  const parcelaDateAt = i => (form.parcelaDates&&form.parcelaDates[i]) ? form.parcelaDates[i] : (form.due?addD(form.due,i*30):addD(TODAY,(i+1)*30));

  const showParcelas = ["Boleto","Cheque","Cartão"].includes(form.pay);
  const totalVal = parseFloat(form.qty||0)*parseFloat(form.price||0);
  const nParcelas = parseInt(form.parcelas)||1;
  const parcelaVal = totalVal/nParcelas;

  // doSave — salva compra no Supabase e atualiza estoque
  const doSave = async () => {
    if(!form.itemId||!form.qty||!form.price||!form.sup){ showToast("Preencha todos os campos obrigatórios.","err"); return; }
    const total = totalVal;
    const isNew = !ed;
    const catLabel = form.type==="rm" ? "Tecidos" : "Aviamentos";
    try {
      // 1. Salvar compra
      const purchData = {...(ed?{id:ed.id}:{}), ...form, qty:parseFloat(form.qty), price:parseFloat(form.price), total, parcelas:nParcelas};
      const savedPurch = await sb.savePurch(purchData, tenantId);
      // 2. Recalcular o custo médio a partir de TODAS as compras deste item
      const todasCompras=[...data.purchases.filter(x=>x.id!==savedPurch.id),savedPurch];
      const novoCusto=avgFromPurchases(todasCompras,form.itemId,form.type);
      if(novoCusto!=null){
        if(form.type==="rm"){
          const m=data.rawMaterials.find(x=>String(x.id)===String(form.itemId));
          if(m){
            const updRM=await sb.saveRM({...m,avgCost:novoCusto},tenantId);
            setData(d=>({...d,rawMaterials:d.rawMaterials.map(x=>x.id===updRM.id?updRM:x)}));
          }
        } else {
          const t=data.trims.find(x=>String(x.id)===String(form.itemId));
          if(t){
            const updTrim=await sb.saveTrim({...t,avgCost:novoCusto},tenantId);
            setData(d=>({...d,trims:d.trims.map(x=>x.id===updTrim.id?updTrim:x)}));
          }
        }
      }
      // 3. Lançar no financeiro — toda compra vira conta, à vista ou parcelada
      if(!isNew){
        // ao editar, refaz os lançamentos desta compra
        await sb.deletePaysByPurchase(savedPurch.id);
        setData(d=>({...d,payables:d.payables.filter(p=>p.purchaseId!==savedPurch.id)}));
      }
      const payArr=[];
      if(form.pay==="À Vista"){
        payArr.push({desc:form.item+" — compra à vista",cat:catLabel,sup:form.sup,phone:form.phone,
          amt:Math.round(total*100)/100,due:form.date||TODAY,paid:form.date||TODAY,status:"Pago",
          prodId:null,purchaseId:savedPurch.id,
          notes:form.qty+" "+(form.type==="rm"?"m":"un")+" × "+R(parseFloat(form.price)||0)});
      } else {
        for(let i=0;i<nParcelas;i++){
          const dueD=(form.parcelaDates&&form.parcelaDates[i])?form.parcelaDates[i]
            :(form.due?addD(form.due,i*30):addD(TODAY,(i+1)*30));
          payArr.push({desc:form.item+" — Parcela "+(i+1)+"/"+nParcelas,cat:catLabel,sup:form.sup,
            phone:form.phone,amt:Math.round(parcelaVal*100)/100,due:dueD,paid:null,status:"Pendente",
            prodId:null,purchaseId:savedPurch.id,notes:nParcelas+"x de "+R(parcelaVal)});
        }
      }
      if(payArr.length){
        const savedPays=await sb.insertPayBatch(payArr,tenantId);
        setData(d=>({...d,payables:[...d.payables,...savedPays]}));
      }
      setData(d=>({...d,purchases:isNew?[...d.purchases,savedPurch]:d.purchases.map(p=>p.id===savedPurch.id?savedPurch:p)}));
      setShowF(false);setEd(null);setForm(EF);
      showToast(isNew?"Compra registrada e lançada no financeiro.":"Compra atualizada.","ok");
    } catch(e){ showToast("Erro ao salvar: "+e.message,"err"); }
  };

  // Cascade: delete purchase AND its generated payables
  const delPurch = (id,e) => { e.stopPropagation();
    const alvo=data.purchases.find(p=>p.id===id);
    confirmDelete(async()=>{try{
      await sb.deletePurch(id); await sb.deletePaysByPurchase(id);
      const restantes=data.purchases.filter(p=>p.id!==id);
      if(alvo?.itemId){
        const novo=avgFromPurchases(restantes,alvo.itemId,alvo.type);
        if(novo!=null){
          if(alvo.type==="rm"){
            const m=data.rawMaterials.find(x=>String(x.id)===String(alvo.itemId));
            if(m){const u=await sb.saveRM({...m,avgCost:novo},tenantId);
              setData(d=>({...d,rawMaterials:d.rawMaterials.map(x=>x.id===u.id?u:x)}));}
          } else {
            const t=data.trims.find(x=>String(x.id)===String(alvo.itemId));
            if(t){const u=await sb.saveTrim({...t,avgCost:novo},tenantId);
              setData(d=>({...d,trims:d.trims.map(x=>x.id===u.id?u:x)}));}
          }
        }
      }
      setData(d=>({...d,purchases:restantes,payables:d.payables.filter(p=>p.purchaseId!==id)}));
      showToast("Compra excluída e custo médio recalculado.","ok");
    }catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir compra",message:"A compra e as contas a pagar geradas por ela serão excluídas. Esta ação não pode ser desfeita."}); };

  return (
    <div>
      <SH title="Compras" sub="Custo médio atualizado automaticamente · parcelamento automático"
        action={<Btn onClick={()=>{setEd(null);setForm(EF);setShowF(true);}}>+</Btn>}/>
      <Card p={0}>
        <Tbl onRow={r=>setSel(r)} rows={data.purchases} cols={[
          {k:"sup",l:"Fornecedor",r:r=><span style={{fontWeight:500}}>{r.sup}</span>},
          {k:"item",l:"Item"},
          {k:"qty",l:"Qtd"},
          {k:"price",l:"Vl. Unit.",r:r=>R(r.price)},
          {k:"total",l:"Total",r:r=><strong style={{fontVariantNumeric:"tabular-nums"}}>{R(r.total)}</strong>},
          {k:"pay",l:"Pgto",r:r=><span>{r.pay}{r.parcelas>1?" · "+r.parcelas+"x":""}</span>},
          {k:"date",l:"Data",r:r=>FD(r.date)},
          {k:"due",l:"Vencimento",r:r=>r.due?FD(r.due):<Chip xs c={DS.ok} bg={DS.okSft} bd={DS.okBd}>À Vista</Chip>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>{setEd(r);setForm({...r,parcelas:r.parcelas||1});setShowF(true);}} title="Editar"/>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delPurch(r.id,e)} title="Excluir" v="danger"/>
            </div>
          )},
        ]}/>
      </Card>

      <Modal open={!!sel&&!showF} onClose={()=>setSel(null)} title="Detalhes da compra" width={440}>
        {sel&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
            {[["Fornecedor",sel.sup],["Telefone",sel.phone||"—"],["Item",sel.item],["Tipo",sel.type==="rm"?"Tecido":"Aviamento"],["Qtd",""+sel.qty],["Vl. Unit.",R(sel.price)],["Total",R(sel.total)],["Pagamento",sel.pay],["Parcelas",sel.parcelas||1],["Data",FD(sel.date)],["Vencimento",sel.due?FD(sel.due):"À Vista"]].map(([l,v])=>(
              <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}><Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
            ))}
          </div>
          <Btn v="secondary" onClick={()=>{setEd(sel);setForm({...sel,parcelas:sel.parcelas||1});setSel(null);setShowF(true);}}>Editar compra</Btn>
        </div>}
      </Modal>

      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);setForm(EF);}} title={ed?"Editar Compra":"Nova Compra"} width={500}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Sel label="Tipo" value={form.type} onChange={v=>setForm(p=>({...p,type:v,itemId:"",item:"",color:""}))} options={[{v:"rm",l:"Tecido"},{v:"trim",l:"Aviamento"}]}/>
          <Sel label={form.type==="rm"?"Tecido":"Aviamento"} req value={form.itemId} onChange={pickItem}
            options={[{v:"",l:"Selecione um item cadastrado…"},...itemOptions.map(x=>({v:x.id,l:x.code+" · "+x.desc}))]}
            hint={itemOptions.length===0?("Nenhum "+(form.type==="rm"?"tecido":"aviamento")+" cadastrado. Cadastre antes de comprar."):"Atualiza estoque e custo médio do item"}/>
          {form.type==="rm"&&selItem&&itemColors.length>0&&(
            <div>
              <Lbl ch="Variação de cor" style={{marginBottom:6}}/>
              <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                {itemColors.map(c=>(
                  <button key={c} onClick={()=>fld("color")(form.color===c?"":c)} style={{padding:"6px 12px",borderRadius:DS.r8,border:`1px solid ${form.color===c?DS.ink:DS.bd}`,background:form.color===c?DS.ink:DS.sur,color:form.color===c?"#fff":DS.i2,fontSize:12,fontWeight:550,cursor:"pointer",fontFamily:"inherit",transition:`all ${DS.fast}`}}>{c}</button>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fornecedor" req value={form.sup} onChange={fld("sup")}/>
            <Inp label="Telefone" value={form.phone} onChange={fld("phone")} placeholder="11999999999"/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label={"Quantidade"+(selItem?" ("+selItem.unit+")":"")} type="number" req value={form.qty} onChange={fld("qty")}/>
            <Inp label="Valor unitário" type="number" req value={form.price} onChange={fld("price")}/>
          </div>
          {form.qty&&form.price&&<div style={{padding:"10px 12px",background:DS.surEl,borderRadius:DS.r8,display:"flex",justifyContent:"space-between",fontSize:13}}><span style={{color:DS.i2}}>Total</span><strong style={{fontVariantNumeric:"tabular-nums"}}>{R(totalVal)}</strong></div>}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Sel label="Forma de pagamento" value={form.pay} onChange={fld("pay")} options={["À Vista","Boleto","Pix","Cartão","Cheque"].map(v=>({v,l:v}))}/>
            {showParcelas&&<Inp label="Nº de parcelas" type="number" min="1" step="1" value={form.parcelas} onChange={fld("parcelas")} hint={nParcelas>1?nParcelas+"x de "+R(parcelaVal):undefined}/>}
          </div>
          <Inp label="Data da compra" type="date" value={form.date} onChange={fld("date")}/>
          {form.pay!=="À Vista"&&nParcelas===1&&(
            <Inp label="Vencimento" type="date" value={form.due} onChange={fld("due")}/>
          )}
          {showParcelas&&nParcelas>1&&(
            <div style={{background:DS.surEl,borderRadius:DS.r10,padding:"14px 14px"}}>
              <Lbl ch="Vencimento de cada parcela" style={{marginBottom:10}}/>
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {Array.from({length:nParcelas},(_,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:10}}>
                    <span style={{fontSize:12,color:DS.i2,minWidth:78}}>Parcela {i+1}/{nParcelas}</span>
                    <input type="date" value={parcelaDateAt(i)} onChange={e=>setParcelaDate(i,e.target.value)} style={{flex:1,height:38,padding:"0 11px",borderRadius:DS.r8,border:`1px solid ${DS.bd}`,fontSize:13,fontFamily:"inherit",outline:"none",background:DS.sur,color:DS.i1}}/>
                    <strong style={{fontSize:12,fontVariantNumeric:"tabular-nums",minWidth:64,textAlign:"right"}}>{R(parcelaVal)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}
          <Inp label="Observações" value={form.notes} onChange={fld("notes")}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave} disabled={!form.itemId||!form.qty||!form.price||!form.sup}>{ed?"Salvar":"Registrar compra"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// OUTSOURCED — with ranking & daily capacity
// ═══════════════════════════════════════════════════════════════════════════════
function OutsourcedView({ ws, stats, onEdit }) {
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Serviço",ws.type],["Status",ws.status],["Prazo médio",stats.avgD+"d"],["Cap. diária","~"+(ws.dailyCap||stats.cap)+" pç/dia"],["Contato",ws.contact],["Telefone",ws.phone],["Endereço",ws.addr]].map(([l,v])=>(
          <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}><Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
        {[["Produções feitas",stats.done],["Ativas agora",stats.active],["Atrasos ativos",stats.late]].map(([l,v])=>(
          <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px",textAlign:"center"}}><Lbl ch={l} style={{marginBottom:4}}/><div style={{fontSize:22,fontWeight:800}}>{v}</div></div>
        ))}
      </div>
      <Bnr type="info">Preço por peça é definido no cadastro de cada produto.</Bnr>
      <Btn v="secondary" onClick={onEdit}>Editar informações</Btn>
    </div>
  );
}

function PgOutsourced({ data, setData, reload, tenantId }) {
  const [sel,setSel]   = useState(null);
  const [ed,setEd]     = useState(false);
  const [showNew,setShowNew] = useState(false);
  const [form,setForm] = useState({});
  const fld = k => v => setForm(p=>({...p,[k]:v}));
  const EF = {name:"",type:"Costura",deadline:"7",contact:"",phone:"",addr:"",dailyCap:"",status:"Ativo"};

  const getStats = ws => {
    const prods = data.productions.filter(p=>p.sewWs===ws.name||p.cutWs===ws.name||p.finWs===ws.name);
    const done  = prods.filter(p=>p.status==="Finalizado").length;
    const active= prods.filter(p=>p.status!=="Finalizado").length;
    const late  = prods.filter(p=>p.status!=="Finalizado"&&forecast(p,data.outsourced).late).length;
    const avgD  = mean(ws.hist).toFixed(1);
    // Estimated daily capacity from history
    const cap = ws.dailyCap || Math.round(mean(ws.hist)*50);
    return { prods, done, active, late, avgD, cap };
  };

  const ranked = [...data.outsourced].filter(w=>w.status==="Ativo").map(w=>({...w,stats:getStats(w)})).sort((a,b)=>parseFloat(a.stats.avgD)-parseFloat(b.stats.avgD));

  const doSave = async () => {
    const saveData = {...form,deadline:parseInt(form.deadline)||7,dailyCap:parseInt(form.dailyCap)||100,hist:form.hist||[parseInt(form.deadline)||7],status:form.status||"Ativo"};
    try {
      const saved = await sb.saveOut(saveData, tenantId);
      if(ed || form.id){
        setData(d=>({...d,outsourced:d.outsourced.map(o=>o.id===saved.id?saved:o)}));
        setSel(saved); setEd(false);
      } else {
        setData(d=>({...d,outsourced:[...d.outsourced,saved]}));
        setShowNew(false); setForm(EF);
      }
      showToast(ed||form.id?"Terceirizado atualizado.":"Terceirizado cadastrado.","ok");
    } catch(e){ showToast("Erro: "+e.message,"err"); }
  };

  const delWs = (id,e) => { e.stopPropagation(); confirmDelete(async()=>{try{await sb.deleteOut(id);setData(d=>({...d,outsourced:d.outsourced.filter(o=>o.id!==id)}));}catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir terceirizado"}); };

  return (
    <div>
      <SH title="Terceirizados" sub="Ranking por performance · capacidade diária estimada"
        action={<Btn onClick={()=>{setShowNew(true);setForm(EF);}}>+</Btn>}/>

      {/* Podium */}
      {ranked.length>=3&&(
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12,marginBottom:24}}>
          {ranked.slice(0,3).map((ws,i)=>(
            <div key={ws.id} style={{padding:"16px",borderRadius:DS.r12,background:i===0?DS.okSft:DS.sur,border:`1px solid ${i===0?DS.okBd:DS.bd}`,textAlign:"center"}}>
              <div style={{fontSize:22,marginBottom:6}}>{["🥇","🥈","🥉"][i]}</div>
              <div style={{fontSize:13,fontWeight:700,letterSpacing:"-.2px"}}>{ws.name}</div>
              <div style={{fontSize:11,color:DS.i3,marginBottom:8}}>{ws.type}</div>
              <div style={{fontSize:24,fontWeight:800,color:i===0?DS.ok:DS.i1,fontVariantNumeric:"tabular-nums"}}>{ws.stats.avgD}d</div>
              <div style={{fontSize:10,color:DS.i3}}>prazo médio</div>
              <div style={{marginTop:8,fontSize:12,color:DS.i2}}>~{ws.stats.cap} pç/dia</div>
            </div>
          ))}
        </div>
      )}

      {/* All cards */}
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {data.outsourced.map(ws=>{
          const stats=getStats(ws);
          return (
            <Card key={ws.id} style={{borderLeft:`2px solid ${ws.status==="Ativo"?DS.ok:DS.bd}`}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{fontSize:15,fontWeight:600,letterSpacing:"-.2px"}}>{ws.name}</div>
                  <div style={{fontSize:12,color:DS.i2,marginTop:2}}>{ws.contact} · {ws.phone}</div>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Chip xs c={ws.status==="Ativo"?DS.ok:DS.i3} bg={ws.status==="Ativo"?DS.okSft:DS.surEl} bd={ws.status==="Ativo"?DS.okBd:DS.bd}>{ws.status}</Chip>
                  <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={e=>{e.stopPropagation();setSel(ws);setEd(true);setForm({...ws});}} title="Editar"/>
                  <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delWs(ws.id,e)} title="Excluir" v="danger"/>
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr 1fr",gap:8,marginBottom:12}}>
                {[["Serviço",ws.type],["Prazo médio",stats.avgD+"d"],["Cap. diária","~"+(ws.dailyCap||stats.cap)+"pç"],["Realizadas",stats.done]].map(([l,v])=>(
                  <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"8px 10px"}}><Lbl ch={l} style={{marginBottom:2,fontSize:9}}/><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
                ))}
              </div>
              {/* Sparkline */}
              <div style={{display:"flex",gap:2,alignItems:"flex-end",height:18}}>
                {ws.hist.map((v,i)=>{const mx=Math.max(...ws.hist);return <div key={i} style={{flex:1,height:((v/mx)*18)+"px",borderRadius:2,background:i===ws.hist.length-1?DS.blue:DS.bd,transition:`height ${DS.base}`}}/>;  })}
              </div>
              <div style={{fontSize:10,color:DS.i3,marginTop:3}}>Histórico de prazos</div>
              {stats.late>0&&<div style={{marginTop:8}}><Chip xs c={DS.err} bg={DS.errSft} bd={DS.errBd}>{stats.late} atraso(s)</Chip></div>}
            </Card>
          );
        })}
      </div>

      {/* Detail / Edit modal */}
      <Modal open={!!sel} onClose={()=>{setSel(null);setEd(false);}} title={sel?.name||""} width={480}>
        {sel&&!ed&&<OutsourcedView ws={data.outsourced.find(o=>o.id===sel.id)||sel} stats={getStats(data.outsourced.find(o=>o.id===sel.id)||sel)} onEdit={()=>{setEd(true);setForm({...(data.outsourced.find(o=>o.id===sel.id)||sel)});}}/>}
        {(sel&&ed||showNew)&&(
          <div style={{display:"flex",flexDirection:"column",gap:12}}>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Nome" value={form.name||""} onChange={fld("name")}/>
              <Sel label="Serviço" value={form.type||""} onChange={fld("type")} options={["Corte","Costura","Acabamento","Bordado","Silk","Outro"].map(s=>({v:s,l:s}))}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Prazo médio (dias)" type="number" value={form.deadline||""} onChange={fld("deadline")}/>
              <Inp label="Capacidade diária (pç)" type="number" value={form.dailyCap||""} onChange={fld("dailyCap")}/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
              <Inp label="Contato" value={form.contact||""} onChange={fld("contact")}/>
              <Inp label="Telefone" value={form.phone||""} onChange={fld("phone")}/>
            </div>
            <Inp label="Endereço" value={form.addr||""} onChange={fld("addr")}/>
            <Sel label="Status" value={form.status||"Ativo"} onChange={fld("status")} options={[{v:"Ativo",l:"Ativo"},{v:"Inativo",l:"Inativo"}]}/>
            <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
              <Btn v="secondary" onClick={()=>{setEd(false);setSel(null);setShowNew(false);setForm(EF);}}>Cancelar</Btn>
              <Btn onClick={doSave}>Salvar</Btn>
            </div>
          </div>
        )}
      </Modal>
      <Modal open={showNew} onClose={()=>{setShowNew(false);setForm(EF);}} title="Novo Terceirizado" width={480}>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Nome" req value={form.name||""} onChange={fld("name")}/>
            <Sel label="Serviço" value={form.type||"Costura"} onChange={fld("type")} options={["Corte","Costura","Acabamento","Bordado","Silk","Outro"].map(s=>({v:s,l:s}))}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Prazo médio (dias)" type="number" value={form.deadline||"7"} onChange={fld("deadline")}/>
            <Inp label="Capacidade diária (pç)" type="number" value={form.dailyCap||""} onChange={fld("dailyCap")}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Contato" value={form.contact||""} onChange={fld("contact")}/>
            <Inp label="Telefone" value={form.phone||""} onChange={fld("phone")}/>
          </div>
          <Inp label="Endereço" value={form.addr||""} onChange={fld("addr")}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowNew(false);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave}>Criar terceirizado</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRODUCTS
// ═══════════════════════════════════════════════════════════════════════════════
function StockItemView({ item, onEdit }) {
  const prices = (item.hist||[]).map(p=>p.price);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["Código",item.code],["Unidade",item.unit],["Estoque",item.stock+item.unit],["Mínimo",item.min+item.unit],["Custo médio",R(item.avgCost)+"/"+item.unit],["Fornecedor",item.supplier]].map(([l,v])=>(
          <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}><Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
        ))}
      </div>
      {(item.hist||[]).length>0&&<div>
        <Lbl ch="Histórico de compras" style={{marginBottom:8}}/>
        <div style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,overflow:"hidden"}}>
          <Tbl rows={item.hist} cols={[{k:"date",l:"Data",r:r=>FD(r.date)},{k:"qty",l:"Qtd",r:r=>r.qty+item.unit},{k:"price",l:"Preço",r:r=>R(r.price)}]}/>
        </div>
        {prices.length>1&&<div style={{marginTop:8,padding:"10px 12px",background:DS.surEl,borderRadius:DS.r8,display:"flex",justifyContent:"space-between"}}><span style={{fontSize:12,color:DS.i2}}>Custo médio calculado</span><strong style={{color:DS.blue}}>{R(mean(prices))}/{item.unit}</strong></div>}
      </div>}
      <Btn v="secondary" onClick={onEdit}>Editar</Btn>
    </div>
  );
}

function calcProductCost(prod, data){
  const zero={fabric:0,forro:0,trim:0,cut:0,sew:0,fin:0,total:0};
  if(!prod) return zero;

  /* Tecido principal — consumo médio entre tamanhos, custo médio do tecido.
     Média entre as cores, já que cada peça usa uma cor só. */
  let fabric=0;
  (prod.colorFabrics||[]).forEach(cf=>{
    const rm=data.rawMaterials.find(r=>r.id===cf.rmId);
    if(rm){
      const sizes=prod.sizes||[];
      const consVals=sizes.map(sz=>cf.cons?.[sz]||0).filter(v=>v>0);
      const avgCons=consVals.length?consVals.reduce((a,b)=>a+b,0)/consVals.length:0;
      fabric+=avgCons*(rm.avgCost||0);
    }
  });
  const nColors=(prod.colorFabrics||[]).length||1;
  fabric=fabric/nColors;

  /* Forro — usa o consumo médio registrado nas ordens de corte deste produto */
  let forro=0;
  const ordersWithForro=(data.productions||[])
    .filter(p=>p.productId===prod.id&&(p.qtys||[]).some(q=>q.forroRmId));
  if(ordersWithForro.length){
    let totalForroCost=0,totalPieces=0;
    ordersWithForro.forEach(p=>{
      (p.qtys||[]).forEach(q=>{
        if(!q.forroRmId) return;
        const rm=data.rawMaterials.find(r=>r.id==q.forroRmId);
        totalForroCost+=(q.forroFab||0)*(rm?.avgCost||0);
        totalPieces+=q.qty||0;
      });
    });
    forro=totalPieces>0?totalForroCost/totalPieces:0;
  }

  /* Aviamentos */
  let trim=0;
  (prod.trimUsage||[]).forEach(tu=>{
    const t=data.trims.find(t=>t.id===tu.trimId);
    if(t) trim+=(t.avgCost||0)*(tu.qty||0);
  });

  const cut=prod.cutPrice||0, sew=prod.sewPrice||0, fin=prod.finishPrice||0;
  return {fabric,forro,trim,cut,sew,fin,total:fabric+forro+trim+cut+sew+fin};
}

function ProductView({ sel, data, onEdit }) {
  const prods = data.productions.filter(p=>p.productId===sel.id);
  const cost = calcProductCost(sel, data);
  return (
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        {[["SKU",sel.sku],["Categoria",sel.category],["Coleção",sel.collection],["Corte/pç",R(sel.cutPrice)],["Costura/pç",R(sel.sewPrice)],["Acab./pç",R(sel.finishPrice)]].map(([l,v])=>(
          <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"10px 12px"}}><Lbl ch={l} style={{marginBottom:3}}/><div style={{fontSize:13,fontWeight:500}}>{v}</div></div>
        ))}
      </div>
      {/* Custo médio total do produto */}
      <div style={{background:DS.ink,borderRadius:DS.r12,padding:"16px 18px",color:"#fff"}}>
        <div style={{fontSize:11,color:"rgba(255,255,255,.6)",marginBottom:6,letterSpacing:".04em",textTransform:"uppercase"}}>Custo médio por peça</div>
        <div style={{fontSize:26,fontWeight:780,letterSpacing:"-.6px",marginBottom:10}}>{R(cost.total)}</div>
        <div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:11,color:"rgba(255,255,255,.7)"}}>
          <span>Tecido {R(cost.fabric)}</span>
          {cost.forro>0&&<span>Forro {R(cost.forro)}</span>}
          <span>Aviamentos {R(cost.trim)}</span>
          <span>Corte {R(cost.cut)}</span>
          <span>Costura {R(cost.sew)}</span>
          <span>Acab. {R(cost.fin)}</span>
        </div>
      </div>
      <div><Lbl ch="Cores e tecidos" style={{marginBottom:8}}/>
        {sel.colorFabrics?.map(cf=>{
          const rm=data.rawMaterials.find(r=>r.id===cf.rmId);
          return (
            <div key={cf.color} style={{marginBottom:8,padding:"10px 12px",border:`1px solid ${DS.bd}`,borderRadius:DS.r8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}><strong style={{fontSize:13}}>{cf.color}</strong><Chip xs>{rm?.desc} · {rm?.code}</Chip></div>
              <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{sel.sizes?.map(sz=><div key={sz} style={{background:DS.surEl,borderRadius:DS.r6,padding:"4px 8px",fontSize:11}}><span style={{color:DS.i3}}>{sz}:</span> <strong>{cf.cons?.[sz]||0}m</strong></div>)}</div>
            </div>
          );
        })}
      </div>
      <div><Lbl ch="Aviamentos" style={{marginBottom:8}}/>
        <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
          {(sel.trimUsage||[]).map(tu=>{const t=data.trims.find(t=>t.id===tu.trimId);return t?<Chip key={tu.trimId}>{t.desc} · {tu.qty}{t.unit}</Chip>:null;})}
        </div>
      </div>
      {prods.length>0&&<div><Lbl ch="Produções" style={{marginBottom:8}}/>
        {prods.map(p=><div key={p.id} style={{display:"flex",justifyContent:"space-between",padding:"8px 10px",background:DS.surEl,borderRadius:DS.r8,marginBottom:6}}><div><div style={{fontSize:12,fontWeight:600}}>{p.no}</div><div style={{fontSize:11,color:DS.i2}}>{FD(p.start)} · {p.total}pç</div></div><SPill status={p.status} xs/></div>)}
      </div>}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        <Btn onClick={()=>printCostSheet(sel,data)}>Imprimir ficha de custo</Btn>
        <Btn v="secondary" onClick={onEdit}>Editar produto</Btn>
      </div>
    </div>
  );
}

function PgProducts({ data, setData, reload, tenantId }) {
  const [showF,setShowF] = useState(false);
  const [ed,setEd]       = useState(null);
  const [sel,setSel]     = useState(null);
  const EF = {sku:"",name:"",category:"",collection:"",sizes:"",colorFabrics:[],trimUsage:[],cutPrice:"",sewPrice:"",finishPrice:"",modelCons:{}};
  const [form,setForm]   = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));
  const openEdit = p => {setSel(null);setEd(p);setForm({...p,sizes:p.sizes?.join(", ")||"",colorFabrics:p.colorFabrics.map(cf=>({...cf,cons:{...cf.cons}})),trimUsage:[...p.trimUsage],modelCons:p.modelCons||p.colorFabrics?.[0]?.cons||{}});setShowF(true);};
  const addCF = () => setForm(p=>({...p,colorFabrics:[...p.colorFabrics,{color:"",rmId:"",cons:{}}]}));
  const remCF = i => setForm(p=>({...p,colorFabrics:p.colorFabrics.filter((_,j)=>j!==i)}));
  const setCFcol = (i,v)=>setForm(p=>({...p,colorFabrics:p.colorFabrics.map((cf,j)=>j===i?{...cf,color:v}:cf)}));
  const setCFrm  = (i,v)=>setForm(p=>({...p,colorFabrics:p.colorFabrics.map((cf,j)=>j===i?{...cf,rmId:v||""}:cf)}));
  const setCFcons= (i,sz,v)=>setForm(p=>({...p,colorFabrics:p.colorFabrics.map((cf,j)=>j===i?{...cf,cons:{...cf.cons,[sz]:parseFloat(v)||0}}:cf)}));
  const setModelCons = (sz,v)=>setForm(p=>({...p,modelCons:{...p.modelCons,[sz]:parseFloat(v)||0}}));
  const setTrimQty = (trimId,qty) => setForm(p=>({...p,trimUsage:p.trimUsage.map(tu=>tu.trimId===trimId?{...tu,qty:qty}:tu)}));
  const togTrim = id => setForm(p=>{const has=p.trimUsage.find(tu=>tu.trimId===id);return{...p,trimUsage:has?p.trimUsage.filter(tu=>tu.trimId!==id):[...p.trimUsage,{trimId:id,qty:1}]};});
  const delProd = (id,e) => {e.stopPropagation();confirmDelete(async()=>{try{await sb.deleteProduct(id);setData(d=>({...d,products:d.products.filter(p=>p.id!==id)}));}catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir produto"});};
  const doSave = async () => {
    const sizes=(form.sizes||"").split(",").map(s=>s.trim()).filter(Boolean);
    const prod={...(ed?{id:ed.id}:{}),sku:form.sku,name:form.name,category:form.category,collection:form.collection,sizes,colorFabrics:form.colorFabrics.map(cf=>({...cf,cons:{...form.modelCons}})),trimUsage:form.trimUsage.map(tu=>({...tu,qty:parseInt(tu.qty)||0})).filter(tu=>tu.qty>0),cutPrice:parseFloat(form.cutPrice)||0,sewPrice:parseFloat(form.sewPrice)||0,finishPrice:parseFloat(form.finishPrice)||0,modelCons:form.modelCons};
    try{
      const saved=await sb.saveProduct(prod,tenantId);
      setData(d=>({...d,products:ed?d.products.map(p=>p.id===saved.id?saved:p):[...d.products,saved]}));
      setShowF(false);setEd(null);setForm(EF);
      showToast(ed?"Produto atualizado.":"Produto criado.","ok");
    }catch(e){showToast("Erro: "+e.message,"err");}
  };
  const szList=(form.sizes||"").split(",").map(s=>s.trim()).filter(Boolean);

  return (
    <div>
      <SH title="Produtos" sub={data.products.length+" cadastrados"} action={<Btn onClick={()=>{setEd(null);setForm(EF);setShowF(true);}}>+</Btn>}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {data.products.map(p=>(
          <Card key={p.id} onClick={()=>setSel(p)} style={{borderTop:`2px solid ${DS.i1}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontSize:10,fontFamily:"monospace",color:DS.i3}}>{p.sku}</div>
                <div style={{fontSize:15,fontWeight:700,marginTop:2,letterSpacing:"-.3px"}}>{p.name}</div>
              </div>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={e=>{e.stopPropagation();openEdit(p);}} title="Editar"/>
                <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delProd(p.id,e)} title="Excluir" v="danger"/>
              </div>
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
              {p.colorFabrics?.map(cf=>{const rm=data.rawMaterials.find(r=>r.id===cf.rmId);return <Chip key={cf.color} xs>{cf.color} → {rm?.desc||"?"}</Chip>;})}
            </div>
            <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:12}}>
              {p.sizes?.map(s=><Chip key={s} xs c={DS.pu} bg={DS.puSft} bd={DS.puBd}>{s}</Chip>)}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8}}>
              {[["Corte/pç",R(p.cutPrice)],["Costura/pç",R(p.sewPrice)],["Acab./pç",R(p.finishPrice)]].map(([l,v])=>(
                <div key={l} style={{background:DS.surEl,borderRadius:DS.r8,padding:"8px 10px"}}><Lbl ch={l} style={{marginBottom:2}}/><div style={{fontSize:13,fontWeight:700}}>{v}</div></div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      <Modal open={!!sel&&!showF} onClose={()=>setSel(null)} title={sel?.name||""} width={560}>
        {sel&&<ProductView sel={sel} data={data} onEdit={()=>openEdit(sel)}/>}
      </Modal>

      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);setForm(EF);}} title={ed?"Editar Produto":"Novo Produto"} width={640}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="SKU" req value={form.sku} onChange={fld("sku")} placeholder="VES-001"/>
            <Inp label="Nome" req value={form.name} onChange={fld("name")}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Categoria" value={form.category} onChange={fld("category")} placeholder="Vestidos"/>
            <Inp label="Coleção" value={form.collection} onChange={fld("collection")} placeholder="Verão 2025"/>
          </div>
          <Inp label="Tamanhos" value={form.sizes} onChange={fld("sizes")} placeholder="P, M, G, GG" hint="Separe com vírgula"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
            <Inp label="Corte/pç (R$)" type="number" value={form.cutPrice} onChange={fld("cutPrice")} hint="Pago ao terceirizado"/>
            <Inp label="Costura/pç (R$)" type="number" value={form.sewPrice} onChange={fld("sewPrice")}/>
            <Inp label="Acab./pç (R$)" type="number" value={form.finishPrice} onChange={fld("finishPrice")}/>
          </div>
          {/* Aviamentos com quantidade */}
          <div>
            <Lbl ch="Aviamentos utilizados" style={{marginBottom:8}}/>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {data.trims.map(t=>{
                const tu=form.trimUsage?.find(u=>u.trimId===t.id);
                const selected=!!tu;
                return (
                  <div key={t.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:DS.r8,background:selected?DS.blueSft:DS.surEl,border:`1px solid ${selected?DS.blueBd:DS.bd}`,transition:`all ${DS.fast}`}}>
                    <button onClick={()=>togTrim(t.id)} style={{width:18,height:18,borderRadius:4,border:`1.5px solid ${selected?DS.blue:DS.bdS}`,background:selected?DS.blue:"transparent",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                      {selected&&<svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="white" strokeWidth="2"><path d="M2 5l2.5 2.5L8 2.5"/></svg>}
                    </button>
                    <span style={{fontSize:13,fontWeight:500,flex:1}}>{t.desc}</span>
                    <span style={{fontSize:11,color:DS.i3,marginRight:4}}>un/{t.unit}</span>
                    {selected&&(
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontSize:11,color:DS.i2}}>Qtd:</span>
                        <input type="number" min="0" value={tu.qty} onChange={e=>setTrimQty(t.id,e.target.value)}
                          style={{width:52,height:30,padding:"0 6px",borderRadius:DS.r6,border:`1px solid ${DS.blueBd}`,textAlign:"center",fontSize:12,fontFamily:"inherit",outline:"none",background:DS.sur}}/>
                        <span style={{fontSize:11,color:DS.i3}}>{t.unit}/pç</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Consumo por modelo (compartilhado entre cores) */}
          <div>
            <Lbl ch="Consumo de tecido por tamanho (do modelo)" style={{marginBottom:8}}/>
            {szList.length>0 ? (
              <div style={{display:"flex",gap:8,flexWrap:"wrap",padding:"12px 14px",background:DS.surEl,borderRadius:DS.r10}}>
                {szList.map(sz=>(
                  <div key={sz} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:4}}>
                    <span style={{fontSize:10,color:DS.i3,fontWeight:600}}>{sz}</span>
                    <input type="number" step="0.1" min="0" value={form.modelCons?.[sz]||""} onChange={e=>setModelCons(sz,e.target.value)} placeholder="0m" style={{width:56,height:32,padding:"0 4px",borderRadius:DS.r6,border:`1px solid ${DS.bd}`,textAlign:"center",fontSize:12,fontFamily:"inherit"}}/>
                  </div>
                ))}
              </div>
            ) : <Bnr type="info">Preencha os tamanhos acima para configurar o consumo.</Bnr>}
          </div>
          {/* Cores e tecidos */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <Lbl ch="Cores e tecidos"/>
              <Btn sz="sm" v="secondary" onClick={addCF}>+ Cor</Btn>
            </div>
            {form.colorFabrics?.map((cf,i)=>{
              const selRm=data.rawMaterials.find(r=>r.id===cf.rmId);
              const rmColors=selRm?.colors||[];
              return (
                <div key={i} style={{border:`1px solid ${DS.bd}`,borderRadius:DS.r10,padding:"12px 14px",marginBottom:10}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr auto",gap:10}}>
                    <Sel label="Tecido" value={cf.rmId||""} onChange={v=>setCFrm(i,v)} options={[{v:"",l:"Selecione…"},...data.rawMaterials.map(rm=>({v:rm.id,l:rm.desc+" ("+rm.code+")"}))]}/>
                    {rmColors.length>0
                      ? <Sel label="Cor" value={cf.color||""} onChange={v=>setCFcol(i,v)} options={[{v:"",l:"Selecione…"},...rmColors.map(c=>({v:c.name,l:c.name}))]}/>
                      : <Inp label="Cor" value={cf.color} onChange={v=>setCFcol(i,v)} placeholder={selRm?"Tecido sem cores":"Ex: Preto"}/>}
                    <div style={{display:"flex",alignItems:"flex-end"}}><IBt icon="✕" onClick={()=>remCF(i)} v="danger"/></div>
                  </div>
                  {selRm&&rmColors.length===0&&<div style={{fontSize:11,color:DS.i3,marginTop:6}}>Dica: cadastre cores neste tecido para escolher na lista.</div>}
                </div>
              );
            })}
            {form.colorFabrics?.length===0&&<div style={{padding:14,background:DS.surEl,borderRadius:DS.r8,textAlign:"center",fontSize:12,color:DS.i3}}>Clique em "+ Cor" para adicionar</div>}
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave}>{ed?"Salvar alterações":"Criar produto"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FABRICS (Tecidos)
// ═══════════════════════════════════════════════════════════════════════════════
function PgFabrics({ data, setData, reload, tenantId }) {
  const [showF,setShowF] = useState(false);
  const [ed,setEd]       = useState(null);
  const [sel,setSel]     = useState(null);
  const EF = {code:"",desc:"",unit:"m",supplier:"",phone:"",avgCost:"",colors:[]};
  const [form,setForm]   = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));
  // Colors
  const addColor = () => setForm(p=>({...p,colors:[...(p.colors||[]),{name:""}]}));
  const remColor = i => setForm(p=>({...p,colors:p.colors.filter((_,j)=>j!==i)}));
  const setColorName = (i,v) => setForm(p=>({...p,colors:p.colors.map((c,j)=>j===i?{...c,name:v}:c)}));
  const hasColors = (form.colors||[]).length>0;

  const doSave = async () => {
    const colors=(form.colors||[]).map(c=>({name:c.name})).filter(c=>c.name);
    const rmData = {...form,colors,stock:0,min:0,avgCost:parseFloat(form.avgCost)||0,
      ...(ed?{id:ed.id,hist:ed.hist||[]}:{hist:[]})};
    try{
      const saved=await sb.saveRM(rmData,tenantId);
      if(ed) setData(d=>({...d,rawMaterials:d.rawMaterials.map(m=>m.id===saved.id?saved:m)}));
      else setData(d=>({...d,rawMaterials:[...d.rawMaterials,saved]}));
      setShowF(false);setEd(null);setForm(EF);
      showToast(ed?"Tecido atualizado.":"Tecido cadastrado.","ok");
    }catch(e){showToast("Erro: "+e.message,"err");}
  };
  const openEdit = m => {setSel(null);setEd(m);setForm({...m,colors:(m.colors||[]).map(c=>({...c}))});setShowF(true);};
  const delRM = (id,e) => {e.stopPropagation();confirmDelete(async()=>{try{await sb.deleteRM(id);setData(d=>({...d,rawMaterials:d.rawMaterials.filter(m=>m.id!==id)}));}catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir tecido"});};

  return (
    <div>
      <SH title="Tecidos" sub="Matérias-primas · estoque por cor · custo médio automático" action={<Btn onClick={()=>{setEd(null);setForm(EF);setShowF(true);}}>+</Btn>}/>
      <Card p={0}>
        <Tbl onRow={r=>setSel(r)} rows={data.rawMaterials} cols={[
          {k:"code",l:"Código",r:r=><span style={{fontFamily:"monospace",fontSize:11,color:DS.i3}}>{r.code}</span>},
          {k:"desc",l:"Descrição",r:r=><span style={{fontWeight:500}}>{r.desc}</span>},
          {k:"colors",l:"Cores",r:r=>(r.colors&&r.colors.length>0)?<span style={{fontSize:12,color:DS.i2}}>{r.colors.length} cor(es)</span>:<span style={{fontSize:12,color:DS.i4}}>—</span>},
          {k:"compras",l:"Compras",r:r=>{const n=purchaseHistory(data.purchases,r.id,"rm").length;return <span style={{fontSize:12,color:n?DS.i2:DS.i4}}>{n?n+"x":"—"}</span>;}},
          {k:"avgCost",l:"Custo médio",r:r=><span style={{fontVariantNumeric:"tabular-nums",fontWeight:600}}>{R(r.avgCost)}/{r.unit}</span>},
          {k:"supplier",l:"Fornecedor",r:r=><span style={{fontSize:12,color:DS.i2}}>{r.supplier}</span>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>openEdit(r)} title="Editar"/>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delRM(r.id,e)} title="Excluir" v="danger"/>
            </div>
          )},
        ]}/>
      </Card>
      <Modal open={!!sel&&!showF} onClose={()=>setSel(null)} title={sel?.desc||""} width={480}>
        {sel&&<StockItemView item={data.rawMaterials.find(m=>m.id===sel.id)||sel} onEdit={()=>openEdit(data.rawMaterials.find(m=>m.id===sel.id)||sel)}/>}
      </Modal>
      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);setForm(EF);}} title={ed?"Editar Tecido":"Novo Tecido"} width={520}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Código" req value={form.code} onChange={fld("code")} placeholder="TEC-001"/>
            <Sel label="Unidade" value={form.unit||"m"} onChange={fld("unit")} options={["m","kg","un","rolo"].map(u=>({v:u,l:u}))}/>
          </div>
          <Inp label="Descrição" req value={form.desc} onChange={fld("desc")} placeholder="Ex: Crepe Georgette"/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fornecedor" value={form.supplier} onChange={fld("supplier")}/>
            <Inp label="Telefone" value={form.phone} onChange={fld("phone")}/>
          </div>

          {/* Cores do tecido */}
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
              <Lbl ch="Cores deste tecido"/>
              <Btn sz="sm" v="secondary" onClick={addColor}>+ Cor</Btn>
            </div>
            {hasColors ? (
              <div style={{display:"flex",flexDirection:"column",gap:8}}>
                {form.colors.map((c,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",gap:8}}>
                    <input value={c.name} onChange={e=>setColorName(i,e.target.value)} placeholder="Nome da cor (ex: Preto)" style={{flex:1,height:38,padding:"0 12px",borderRadius:DS.r8,border:`1px solid ${DS.bd}`,fontSize:13,fontFamily:"inherit",outline:"none",background:DS.sur,color:DS.i1}}/>
                    <span style={{fontSize:12,color:DS.i3,minWidth:18}}>{form.unit}</span>
                    <IBt icon="✕" onClick={()=>remColor(i)} v="danger"/>
                  </div>
                ))}
                <div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:DS.surEl,borderRadius:DS.r8,fontSize:12}}>
                  <span style={{color:DS.i2}}>Estoque total (soma das cores)</span>
                </div>
              </div>
            ) : (
              <div style={{padding:14,background:DS.surEl,borderRadius:DS.r8,textAlign:"center",fontSize:12,color:DS.i3}}>
                Adicione cores para controlar o estoque por variação. Sem cores, usa o estoque único abaixo.
              </div>
            )}
          </div>

          <div style={{display:"grid",gridTemplateColumns:hasColors?"1fr 1fr":"1fr 1fr 1fr",gap:12}}>
            <Inp label="Custo médio" type="number" req value={form.avgCost} onChange={fld("avgCost")}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave}>{ed?"Salvar":"Criar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRIMS
// ═══════════════════════════════════════════════════════════════════════════════
function PgTrims({ data, setData, reload, tenantId }) {
  const [showF,setShowF] = useState(false);
  const [ed,setEd]       = useState(null);
  const [sel,setSel]     = useState(null);
  const EF = {code:"",desc:"",unit:"un",supplier:"",phone:"",avgCost:""};
  const [form,setForm]   = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));
  const doSave = async () => {
    const trimData={...form,stock:0,min:0,avgCost:parseFloat(form.avgCost)||0,...(ed?{id:ed.id,hist:ed.hist||[]}:{hist:[]})};
    try{
      const saved=await sb.saveTrim(trimData,tenantId);
      if(ed) setData(d=>({...d,trims:d.trims.map(t=>t.id===saved.id?saved:t)}));
      else setData(d=>({...d,trims:[...d.trims,saved]}));
      setShowF(false);setEd(null);setForm(EF);
      showToast(ed?"Aviamento atualizado.":"Aviamento cadastrado.","ok");
    }catch(e){showToast("Erro: "+e.message,"err");}
  };
  const openEdit = t => {setSel(null);setEd(t);setForm({...t});setShowF(true);};
  const delTrim  = (id,e) => {e.stopPropagation();confirmDelete(()=>setData(d=>({...d,trims:d.trims.filter(t=>t.id!==id)})),{title:"Excluir aviamento"});};

  return (
    <div>
      <SH title="Aviamentos & Insumos" sub="Custo médio atualizado automaticamente" action={<Btn onClick={()=>{setEd(null);setForm(EF);setShowF(true);}}>+</Btn>}/>
      <Card p={0}>
        <Tbl onRow={r=>setSel(r)} rows={data.trims} cols={[
          {k:"code",l:"Código",r:r=><span style={{fontFamily:"monospace",fontSize:11,color:DS.i3}}>{r.code}</span>},
          {k:"desc",l:"Descrição",r:r=><span style={{fontWeight:500}}>{r.desc}</span>},
          {k:"compras",l:"Compras",r:r=>{const n=purchaseHistory(data.purchases,r.id,"trim").length;return <span style={{fontSize:12,color:n?DS.i2:DS.i4}}>{n?n+"x":"—"}</span>;}},
          {k:"avgCost",l:"Custo médio",r:r=><span style={{fontVariantNumeric:"tabular-nums",fontWeight:600}}>{R(r.avgCost)}/{r.unit}</span>},
          {k:"supplier",l:"Fornecedor",r:r=><span style={{fontSize:12,color:DS.i2}}>{r.supplier}</span>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>openEdit(r)} title="Editar"/>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delTrim(r.id,e)} title="Excluir" v="danger"/>
            </div>
          )},
        ]}/>
      </Card>
      <Modal open={!!sel&&!showF} onClose={()=>setSel(null)} title={sel?.desc||""} width={440}>
        {sel&&<StockItemView item={data.trims.find(t=>t.id===sel.id)||sel} onEdit={()=>openEdit(data.trims.find(t=>t.id===sel.id)||sel)}/>}
      </Modal>
      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);setForm(EF);}} title={ed?"Editar Aviamento":"Novo Aviamento"} width={460}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Código" req value={form.code} onChange={fld("code")} placeholder="ETI-001"/>
            <Sel label="Unidade" value={form.unit||"un"} onChange={fld("unit")} options={["un","m","kg","rolo","caixa"].map(u=>({v:u,l:u}))}/>
          </div>
          <Inp label="Descrição" req value={form.desc} onChange={fld("desc")}/>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>
            <Inp label="Fornecedor" value={form.supplier} onChange={fld("supplier")}/>
            <Inp label="Telefone" value={form.phone} onChange={fld("phone")}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:12}}>
            <Inp label="Custo médio" type="number" req value={form.avgCost} onChange={fld("avgCost")}/>
          </div>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave}>{ed?"Salvar":"Criar"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════════
function PgUsers({ data, setData, reload, tenantId, currentUser }) {
  const [showF,setShowF] = useState(false);
  const [ed,setEd]       = useState(null);
  const EF = {name:"",username:"",password:"",role:"production",active:true};
  const [form,setForm]   = useState(EF);
  const fld = k => v => setForm(p=>({...p,[k]:v}));
  const roles = [{v:"admin",l:"Administrador"},{v:"financial",l:"Financeiro"},{v:"production",l:"Produção"},{v:"stock",l:"Materiais"}];
  const doSave = () => {
    if(!form.name||!form.username){ showToast("Preencha nome e usuário.","err"); return; }
    // handled by async doSave — ID comes from Supabase
    setData(d=>({...d,users:ed?d.users.map(x=>x.id===u.id?u:x):[...d.users,u]}));
    showToast(ed?"Usuário atualizado.":"Usuário criado.","ok");
    setShowF(false);setEd(null);setForm(EF);
  };
  const delUser = (id,e) => {e.stopPropagation();confirmDelete(async()=>{try{await sb.deleteProfile(id);setData(d=>({...d,users:d.users.filter(u=>u.id!==id)}));}catch(er){showToast("Erro: "+er.message,"err");}},{title:"Excluir usuário"});};

  return (
    <div>
      <SH title="Usuários" sub="Controle de acesso por perfil" action={<Btn onClick={()=>{setEd(null);setForm(EF);setShowF(true);}}>+</Btn>}/>
      <Card p={0}>
        <Tbl rows={data.users} cols={[
          {k:"name",l:"Nome",r:r=><span style={{fontWeight:500}}>{r.name}</span>},
          {k:"username",l:"Usuário",r:r=><span style={{fontSize:12,color:DS.i2,fontFamily:"monospace"}}>{r.username}</span>},
          {k:"role",l:"Perfil",r:r=><Chip xs>{roles.find(x=>x.v===r.role)?.l||r.role}</Chip>},
          {k:"active",l:"Status",r:r=><Chip xs c={r.active?DS.ok:DS.i3} bg={r.active?DS.okSft:DS.surEl} bd={r.active?DS.okBd:DS.bd}>{r.active?"Ativo":"Inativo"}</Chip>},
          {k:"_",l:"",r:r=>(
            <div style={{display:"flex",gap:4}} onClick={e=>e.stopPropagation()}>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M1.5 10.5L10 2l2 2-8.5 8.5H1.5v-2z"/></svg>} onClick={()=>{setEd(r);setForm({...r});setShowF(true);}} title="Editar"/>
              <IBt icon={<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3.5h10M5 3.5V2.5a.5.5 0 01.5-.5h3a.5.5 0 01.5.5v1M5.5 6v4M8.5 6v4M3 3.5l.7 8a1 1 0 001 .9h4.6a1 1 0 001-.9l.7-8"/></svg>} onClick={e=>delUser(r.id,e)} title="Excluir" v="danger"/>
            </div>
          )},
        ]}/>
      </Card>
      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);setForm(EF);}} title={ed?"Editar Usuário":"Novo Usuário"} width={440}>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <Inp label="Nome" req value={form.name} onChange={fld("name")}/>
          <Inp label="Usuário" req value={form.username} onChange={fld("username")} hint="Usado para login"/>
          <Inp label="Senha" type="password" req value={form.password} onChange={fld("password")} hint={ed?"Deixe a senha atual ou troque":undefined}/>
          <Sel label="Perfil" value={form.role} onChange={fld("role")} options={roles}/>
          <Sel label="Status" value={form.active?"true":"false"} onChange={v=>fld("active")(v==="true")} options={[{v:"true",l:"Ativo"},{v:"false",l:"Inativo"}]}/>
          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);setForm(EF);}}>Cancelar</Btn>
            <Btn onClick={doSave}>{ed?"Salvar":"Criar usuário"}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// NAV STRUCTURE
// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════
// FATURAMENTO — marketplaces, metas e evolução mensal
// ═══════════════════════════════════════════════════════════════════
const MES_NOMES = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const mesLabel = ym => { if(!ym) return "—"; const [y,m]=ym.split("-");
  return MES_NOMES[parseInt(m)-1]+" "+y; };
const mesCurto = ym => { if(!ym) return "—"; const [y,m]=ym.split("-");
  return MES_NOMES[parseInt(m)-1].slice(0,3)+"/"+y.slice(-2); };

const CANAIS_PADRAO = [
  {name:"Mercado Livre", cor:"#FFE600", txt:"#0C0C0B"},
  {name:"Shopee",        cor:"#EE4D2D", txt:"#fff"},
  {name:"Shein",         cor:"#0C0C0B", txt:"#fff"},
  {name:"TikTok Shop",   cor:"#25F4EE", txt:"#0C0C0B"},
  {name:"Magalu",        cor:"#0086FF", txt:"#fff"},
];
const corCanal = n => CANAIS_PADRAO.find(c=>c.name===n) || {cor:"#767672",txt:"#fff"};
const GASTOS_PADRAO = ["Ads Mercado Livre","Ads Shopee","Ads TikTok",
                       "Afiliados Shopee","Afiliados TikTok","DAS"];

const somaCanais  = r => (r.channels||[]).reduce((s,c)=>s+(Number(c.revenue)||0),0);
const somaLucros  = r => (r.channels||[]).reduce((s,c)=>s+(Number(c.profit)||0),0);
const somaGastos  = r => (r.expenses||[]).reduce((s,e)=>s+(Number(e.amount)||0),0);
const liquido     = r => somaLucros(r)-somaGastos(r);

/* variação percentual entre dois meses */
const varPct = (atual,ant) => {
  if(ant===0&&atual===0) return {v:0,tipo:"igual"};
  if(ant===0) return {v:null,tipo:"novo"};
  const v=((atual-ant)/Math.abs(ant))*100;
  if(Math.abs(v)<0.5) return {v:0,tipo:"igual"};
  return {v,tipo:v>0?"subiu":"caiu"};
};

function Variacao({dado,inverso,titulo}){
  if(!dado) return null;
  const {v,tipo}=dado;
  if(tipo==="novo")
    return <span title={titulo} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",
      borderRadius:20,background:DS.blueSft,border:`1px solid ${DS.blueBd}`,color:DS.blue,
      fontSize:11,fontWeight:700}}>novo</span>;
  if(tipo==="igual")
    return <span title={titulo} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",
      borderRadius:20,background:DS.surEl,color:DS.i3,fontSize:11,fontWeight:700}}>0%</span>;
  const bom = inverso ? tipo==="caiu" : tipo==="subiu";
  const cor = bom?DS.ok:DS.err;
  const bg  = bom?DS.okSft:DS.errSft;
  const bd  = bom?DS.okBd:DS.errBd;
  return (
    <span title={titulo} style={{display:"inline-flex",alignItems:"center",gap:3,padding:"2px 8px",
      borderRadius:20,background:bg,border:`1px solid ${bd}`,color:cor,fontSize:11,fontWeight:700,
      cursor:titulo?"help":"default"}}>
      {tipo==="subiu"?"▲":"▼"}{Math.abs(v).toFixed(Math.abs(v)<10?1:0).replace(".",",")}%
    </span>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Gráfico de tendência — área + linha
   Segue as regras de Charts & Data da skill:
   linhas de grade discretas, eixo Y rotulado, tooltip no hover e no
   teclado, pontos navegáveis por Tab, resumo em texto para leitores
   de tela e tabela alternativa.
   ───────────────────────────────────────────────────────────────── */
function TrendChart({ serie, atualMonth, onPick, isSmall }){
  const [hover,setHover] = useState(null);
  const H = isSmall?150:190, PAD_L = isSmall?46:58, PAD_R = 14, PAD_T = 16, PAD_B = 30;
  const [w,setW] = useState(760);
  const boxRef = useRef(null);
  useEffect(()=>{
    if(!boxRef.current) return;
    const ro=new ResizeObserver(e=>setW(e[0].contentRect.width));
    ro.observe(boxRef.current); return ()=>ro.disconnect();
  },[]);
  if(!serie.length) return null;

  const vals  = serie.map(m=>somaCanais(m));
  const nets  = serie.map(m=>liquido(m));
  const maxV  = Math.max(...vals,...nets,1);
  /* topo arredondado para uma escala legível */
  const step  = Math.pow(10,Math.floor(Math.log10(maxV)))/2;
  const top   = Math.ceil(maxV/step)*step;
  const innerW = Math.max(120,w-PAD_L-PAD_R), innerH = H-PAD_T-PAD_B;
  const x = i => PAD_L + (serie.length===1?innerW/2:(i/(serie.length-1))*innerW);
  const y = v => PAD_T + innerH - (v/top)*innerH;

  const linha = arr => arr.map((v,i)=>`${i?"L":"M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area  = arr => `${linha(arr)} L${x(arr.length-1).toFixed(1)},${(PAD_T+innerH).toFixed(1)} L${x(0).toFixed(1)},${(PAD_T+innerH).toFixed(1)} Z`;

  const ticks = [0,.25,.5,.75,1].map(f=>top*f);
  const fmtEixo = v => v>=1000000?(v/1000000).toFixed(1).replace(".",",")+"M"
                     : v>=1000?Math.round(v/1000)+"k" : String(Math.round(v));

  const ptAtivo = hover!=null?hover:serie.findIndex(m=>m.month===atualMonth);
  const mAtivo  = ptAtivo>=0?serie[ptAtivo]:null;

  /* resumo textual para leitores de tela */
  const primeiro=vals[0], ultimo=vals[vals.length-1];
  const variacao = primeiro>0?((ultimo-primeiro)/primeiro)*100:0;
  const resumo = `Faturamento de ${mesLabel(serie[0].month)} a ${mesLabel(serie[serie.length-1].month)}: `+
    `de ${R(primeiro)} para ${R(ultimo)}, variação de ${variacao.toFixed(0)}%.`;

  return (
    <div ref={boxRef} style={{position:"relative"}}>
      <p style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)"}}>{resumo}</p>
      <svg width="100%" height={H} viewBox={`0 0 ${w} ${H}`} role="img"
        aria-label={resumo} style={{display:"block",overflow:"visible"}}>
        <defs>
          <linearGradient id="fadeFat" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={DS.ink} stopOpacity=".13"/>
            <stop offset="100%" stopColor={DS.ink} stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* grade discreta e eixo Y */}
        {ticks.map((t,i)=>(
          <g key={i}>
            <line x1={PAD_L} x2={w-PAD_R} y1={y(t)} y2={y(t)}
              stroke={DS.bd} strokeWidth="1" shapeRendering="crispEdges"/>
            <text x={PAD_L-10} y={y(t)+4} textAnchor="end"
              style={{fontSize:11,fill:DS.i4,fontVariantNumeric:"tabular-nums"}}>{fmtEixo(t)}</text>
          </g>
        ))}

        {/* faturamento */}
        <path d={area(vals)}  fill="url(#fadeFat)"/>
        <path d={linha(vals)} fill="none" stroke={DS.ink} strokeWidth="2"
          strokeLinejoin="round" strokeLinecap="round"/>
        {/* lucro líquido — tracejado, distinguível sem depender da cor */}
        <path d={linha(nets)} fill="none" stroke={DS.ok} strokeWidth="2"
          strokeDasharray="5 4" strokeLinejoin="round" strokeLinecap="round"/>

        {/* guia vertical do ponto ativo */}
        {mAtivo&&ptAtivo>=0&&(
          <line x1={x(ptAtivo)} x2={x(ptAtivo)} y1={PAD_T} y2={PAD_T+innerH}
            stroke={DS.bdS} strokeWidth="1" strokeDasharray="3 3"/>
        )}

        {/* pontos — alvo de toque amplo e navegáveis por teclado */}
        {serie.map((m,i)=>{
          const on = i===ptAtivo;
          return (
            <g key={m.id}>
              <circle cx={x(i)} cy={y(nets[i])} r={on?4:3} fill={DS.sur}
                stroke={DS.ok} strokeWidth="2"/>
              <circle cx={x(i)} cy={y(vals[i])} r={on?5:3.5} fill={on?DS.ink:DS.sur}
                stroke={DS.ink} strokeWidth="2"/>
              <circle cx={x(i)} cy={y(vals[i])} r={22} fill="transparent"
                tabIndex={0} role="button"
                aria-label={`${mesLabel(m.month)}: faturamento ${R(vals[i])}, líquido ${R(nets[i])}`}
                onMouseEnter={()=>setHover(i)} onMouseLeave={()=>setHover(null)}
                onFocus={()=>setHover(i)} onBlur={()=>setHover(null)}
                onClick={()=>onPick(m.month)}
                onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onPick(m.month);}}}
                style={{cursor:"pointer",outline:"none"}}/>
            </g>
          );
        })}

        {/* eixo X */}
        {serie.map((m,i)=>{
          const pular = isSmall && serie.length>6 && i%2!==0;
          if(pular) return null;
          return (
            <text key={m.id} x={x(i)} y={H-8} textAnchor="middle"
              style={{fontSize:11,fill:i===ptAtivo?DS.i1:DS.i4,
                fontWeight:i===ptAtivo?700:500}}>{mesCurto(m.month)}</text>
          );
        })}
      </svg>

      {/* tooltip */}
      {mAtivo&&(
        <div role="status" style={{position:"absolute",top:0,
          left:Math.min(Math.max(x(ptAtivo)-88,0),Math.max(0,w-176)),
          width:176,background:DS.ink,color:"#fff",borderRadius:DS.r10,
          padding:"10px 12px",boxShadow:DS.e3,pointerEvents:"none",zIndex:3}}>
          <div style={{fontSize:11,color:"rgba(255,255,255,.6)",fontWeight:600,
            textTransform:"uppercase",letterSpacing:".05em",marginBottom:6}}>
            {mesLabel(mAtivo.month)}
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:4}}>
            <span style={{width:9,height:2.5,background:"#fff",borderRadius:2}}/>
            <span style={{fontSize:11.5,color:"rgba(255,255,255,.7)",flex:1}}>Faturamento</span>
            <span className="tnum" style={{fontSize:12.5,fontWeight:700}}>{R(vals[ptAtivo])}</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7}}>
            <span style={{width:9,height:0,borderTop:`2.5px dashed ${DS.ok}`}}/>
            <span style={{fontSize:11.5,color:"rgba(255,255,255,.7)",flex:1}}>Líquido</span>
            <span className="tnum" style={{fontSize:12.5,fontWeight:700,color:"#6EE7B7"}}>{R(nets[ptAtivo])}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PgFaturamento({ data, setData, tenantId }){
  const { isSmall } = useViewport();
  const meses = useMemo(()=>[...(data.revenue||[])].sort((a,b)=>b.month.localeCompare(a.month)),[data.revenue]);
  const [selMes,setSelMes] = useState(null);
  const [showF,setShowF]   = useState(false);
  const [ed,setEd]         = useState(null);
  const [salvando,setSalvando] = useState(false);

  const EF = () => ({
    month: TODAY.slice(0,7), goal:"",
    channels: CANAIS_PADRAO.slice(0,4).map(c=>({name:c.name,revenue:"",profit:"",pct:""})),
    expenses: GASTOS_PADRAO.map(n=>({name:n,amount:""})),
    notes:"",
  });
  const [form,setForm] = useState(EF);
  const [modoLucro,setModoLucro] = useState("valor"); // "valor" | "pct"
  const [pctGeral,setPctGeral] = useState("");

  const atual = selMes ? meses.find(m=>m.month===selMes) : meses[0];
  const idx = atual ? meses.findIndex(m=>m.month===atual.month) : -1;
  const anterior = idx>=0 && idx<meses.length-1 ? meses[idx+1] : null;

  const fat = atual?somaCanais(atual):0;
  const luc = atual?somaLucros(atual):0;
  const gas = atual?somaGastos(atual):0;
  const liq = atual?liquido(atual):0;
  const meta = Number(atual?.goal)||0;
  const margem = fat>0 ? (liq/fat)*100 : 0;

  const vFat = anterior?varPct(fat,somaCanais(anterior)):null;
  const vLuc = anterior?varPct(luc,somaLucros(anterior)):null;
  const vGas = anterior?varPct(gas,somaGastos(anterior)):null;
  const vLiq = anterior?varPct(liq,liquido(anterior)):null;
  const tipAnt = anterior?`Mês anterior: ${mesCurto(anterior.month)}`:null;

  const abrirNovo = () => { setEd(null); setForm(EF()); setShowF(true); };
  const abrirEdit = m => {
    setEd(m);
    setForm({
      month:m.month, goal:m.goal?fmtNum(Number(m.goal)):"",
      channels:(m.channels||[]).map(c=>{
        const rev=Number(c.revenue)||0, pf=Number(c.profit)||0;
        return {name:c.name,revenue:fmtNum(rev),profit:fmtNum(pf),
          pct: rev>0&&pf>0 ? (pf/rev*100).toFixed(2).replace(".",",") : ""};
      }),
      expenses:(m.expenses||[]).map(e=>({name:e.name,amount:fmtNum(Number(e.amount)||0)})),
      notes:m.notes||"",
    });
    setShowF(true);
  };

  /* Lê números em qualquer formato: 33692.83 · 1.500,50 · 110574 · 7,50
     Decide se o ponto é decimal ou separador de milhar pelo contexto. */
  const num = v => {
    if(v==null||v==="") return 0;
    let t=String(v).trim().replace(/[R$\s%]/g,"");
    if(!t) return 0;
    const pt=t.includes("."), vg=t.includes(",");
    if(pt&&vg){
      t = t.lastIndexOf(",")>t.lastIndexOf(".")
        ? t.replace(/\./g,"").replace(",",".")   // 1.500,50
        : t.replace(/,/g,"");                    // 1,500.50
    } else if(vg){
      t = t.replace(",",".");                    // 30,47
    } else if(pt){
      const p=t.split(".");
      const milhar = p.length>2 || (p.length===2 && p[1].length===3 && p[0].length>0);
      if(milhar) t = t.replace(/\./g,"");        // 1.000
    }
    return parseFloat(t)||0;
  };
  /* Formata para exibir no campo, com vírgula decimal */
  const fmtNum = n => n===0||n==null?"":String(Math.round(n*100)/100).replace(".",",");

  const salvar = async () => {
    if(!form.month){ showToast("Escolha o mês.","err"); return; }
    if(!ed && meses.some(m=>m.month===form.month)){
      showToast("Este mês já existe. Abra o mês e use Editar.","err"); return;
    }
    setSalvando(true);
    try{
      const payload = {
        ...(ed?{id:ed.id}:{}),
        month:form.month, goal:num(form.goal),
        channels:form.channels.filter(c=>c.name&&(c.revenue!==""||c.profit!==""))
          .map(c=>({name:c.name,revenue:num(c.revenue),profit:num(c.profit)})),
        expenses:form.expenses.filter(e=>e.name&&e.amount!=="")
          .map(e=>({name:e.name,amount:num(e.amount)})),
        notes:form.notes,
      };
      const saved = await sb.saveRevenue(payload,tenantId);
      setData(d=>({...d,revenue: ed
        ? (d.revenue||[]).map(m=>m.id===saved.id?saved:m)
        : [...(d.revenue||[]),saved]}));
      setSelMes(saved.month); setShowF(false); setEd(null);
      showToast(ed?"Mês atualizado.":"Mês cadastrado.","ok");
    }catch(e){ showToast("Erro: "+e.message,"err"); }
    finally{ setSalvando(false); }
  };

  const excluir = m => confirmDelete(async()=>{
    try{ await sb.deleteRevenue(m.id);
      setData(d=>({...d,revenue:(d.revenue||[]).filter(x=>x.id!==m.id)}));
      setSelMes(null); showToast("Mês excluído.","ok");
    }catch(e){ showToast("Erro: "+e.message,"err"); }
  },{title:"Excluir "+mesLabel(m.month),message:"Todos os dados deste mês serão removidos."});

  const setCanal = (i,k,v) => setForm(p=>({...p,channels:p.channels.map((c,j)=>{
    if(j!==i) return c;
    const upd={...c,[k]:v};
    /* em modo %, o lucro é recalculado sempre que a % ou o faturamento mudam */
    if(modoLucro==="pct"&&(k==="pct"||k==="revenue")){
      const rev=num(k==="revenue"?v:c.revenue);
      const pc=parseFloat(String(k==="pct"?v:c.pct).replace(",","."))||0;
      upd.profit = rev&&pc ? fmtNum(rev*pc/100) : "";
    }
    /* em modo R$, mostra a margem correspondente */
    if(modoLucro==="valor"&&(k==="profit"||k==="revenue")){
      const rev=num(k==="revenue"?v:c.revenue);
      const pf=num(k==="profit"?v:c.profit);
      upd.pct = rev>0&&pf>0 ? (pf/rev*100).toFixed(2).replace(".",",") : "";
    }
    return upd;
  })}));

  /* aplica a mesma margem a todos os canais de uma vez */
  const aplicarPctGeral = () => {
    const pc=parseFloat(String(pctGeral).replace(",","."))||0;
    if(!pc){ showToast("Informe a margem em %.","err"); return; }
    setForm(p=>({...p,channels:p.channels.map(c=>{
      const rev=num(c.revenue);
      return {...c,pct:String(pc).replace(".",","),profit:rev?fmtNum(rev*pc/100):""};
    })}));
    showToast("Margem de "+pc+"% aplicada a todos os canais.","ok");
  };
  const setGasto = (i,k,v) => setForm(p=>({...p,expenses:p.expenses.map((e,j)=>j===i?{...e,[k]:v}:e)}));

  const prevFat = form.channels.reduce((s,c)=>s+num(c.revenue),0);
  const prevLuc = form.channels.reduce((s,c)=>s+num(c.profit),0);
  const prevGas = form.expenses.reduce((s,e)=>s+num(e.amount),0);

  /* série dos últimos 12 meses, do mais antigo ao mais recente */
  const serie = [...meses].reverse().slice(-12);
  const maxSerie = Math.max(...serie.map(m=>somaCanais(m)),1);

  /* Cartão de indicador */
  const Kpi = ({label,valor,variacao,inverso,sub,acento}) => (
    <div style={{background:DS.sur,borderRadius:DS.r12,border:`1px solid ${DS.bd}`,
      padding:"16px 18px",boxShadow:DS.e1}}>
      <div style={{...tsCss(TS.micro),textTransform:"uppercase",color:DS.i3,marginBottom:10}}>{label}</div>
      <div style={{display:"flex",alignItems:"baseline",gap:9,flexWrap:"wrap"}}>
        <span className="tnum" style={{...tsCss(TS.h3),color:acento||DS.i1,fontFamily:FONT_DISPLAY}}>{valor}</span>
        <Variacao dado={variacao} inverso={inverso} titulo={tipAnt}/>
      </div>
      {sub&&<div style={{...tsCss(TS.caption),color:DS.i3,marginTop:6}}>{sub}</div>}
    </div>
  );

  return (
    <div>
      {/* ── Cabeçalho ── */}
      <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",
        gap:16,flexWrap:"wrap",marginBottom:isSmall?20:26}}>
        <div>
          <div style={{...tsCss(TS.micro),textTransform:"uppercase",color:DS.i3,marginBottom:7}}>
            Faturamento por marketplace
          </div>
          <h1 style={{fontFamily:FONT_DISPLAY,...tsCss(TS.h1),color:DS.i1,margin:0}}>
            {atual?mesLabel(atual.month):"Sem lançamentos"}
          </h1>
        </div>
        <Btn onClick={abrirNovo}>+ Novo mês</Btn>
      </div>

      {meses.length===0 ? (
        <div style={{background:DS.sur,borderRadius:DS.r14,border:`1px solid ${DS.bd}`,
          padding:"76px 24px",textAlign:"center"}}>
          <div style={{width:48,height:48,borderRadius:DS.r12,background:DS.surEl,
            display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:18}}>
            <svg width="22" height="22" viewBox="0 0 16 16" fill="none" stroke={DS.i3}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 12l3.5-4.5 3 3L13 4.5M13 4.5H9.5M13 4.5V8"/></svg>
          </div>
          <div style={{...tsCss(TS.h4),color:DS.i1,marginBottom:8}}>Nenhum mês registrado</div>
          <p style={{...tsCss(TS.body),color:DS.i3,maxWidth:380,margin:"0 auto 22px"}}>
            Registre o faturamento e o lucro de cada canal, mais os gastos com anúncios e
            impostos. A comparação entre meses aparece automaticamente.
          </p>
          <Btn onClick={abrirNovo}>Registrar primeiro mês</Btn>
        </div>
      ) : (
        <>
          {/* ── Seletor de mês ── */}
          <div role="tablist" aria-label="Selecionar mês"
            style={{display:"flex",gap:3,overflowX:"auto",paddingBottom:14,marginBottom:22,
              borderBottom:`1px solid ${DS.bd}`,scrollbarWidth:"none"}}>
            {[...meses].reverse().map(m=>{
              const on=atual?.month===m.month;
              return (
                <button key={m.id} role="tab" aria-selected={on} onClick={()=>setSelMes(m.month)}
                  style={{padding:"7px 13px",borderRadius:DS.r8,cursor:"pointer",border:"none",
                    background:on?DS.ink:"transparent",color:on?"#fff":DS.i3,
                    fontFamily:"inherit",...tsCss(TS.caption),fontWeight:on?600:500,
                    whiteSpace:"nowrap",transition:`all ${DS.fast}`}}
                  onMouseEnter={e=>{if(!on)e.currentTarget.style.background=DS.surEl}}
                  onMouseLeave={e=>{if(!on)e.currentTarget.style.background="transparent"}}>
                  {mesCurto(m.month)}
                </button>
              );
            })}
          </div>

          {/* ── Bloco principal: número herói + indicadores ── */}
          <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"1.15fr 1fr",
            gap:12,marginBottom:12}}>

            <div style={{background:DS.ink,borderRadius:DS.r14,padding:isSmall?"22px 20px":"26px 28px",
              color:"#fff",display:"flex",flexDirection:"column",justifyContent:"space-between",
              minHeight:isSmall?"auto":186,boxShadow:DS.e2}}>
              <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                <div style={{...tsCss(TS.micro),textTransform:"uppercase",color:"rgba(255,255,255,.6)"}}>
                  Faturamento do mês
                </div>
                <Variacao dado={vFat} titulo={tipAnt}/>
              </div>
              <div style={{margin:"18px 0"}}>
                <div className="tnum" style={{fontFamily:FONT_DISPLAY,fontSize:isSmall?36:44,
                  fontWeight:700,letterSpacing:"-.034em",lineHeight:1.02}}>{R(fat)}</div>
                {anterior&&(
                  <div className="tnum" style={{...tsCss(TS.caption),color:"rgba(255,255,255,.5)",marginTop:8}}>
                    {mesLabel(anterior.month)} · {R(somaCanais(anterior))}
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:isSmall?18:28,paddingTop:16,
                borderTop:"1px solid rgba(255,255,255,.14)",flexWrap:"wrap"}}>
                <div>
                  <div style={{...tsCss(TS.micro),textTransform:"uppercase",
                    color:"rgba(255,255,255,.5)",marginBottom:4}}>Lucro líquido</div>
                  <div className="tnum" style={{...tsCss(TS.h4),
                    color:liq>=0?"#6EE7B7":"#FCA5A5"}}>{R(liq)}</div>
                </div>
                <div>
                  <div style={{...tsCss(TS.micro),textTransform:"uppercase",
                    color:"rgba(255,255,255,.5)",marginBottom:4}}>Margem</div>
                  <div className="tnum" style={{...tsCss(TS.h4),color:"#fff"}}>
                    {margem.toFixed(1).replace(".",",")}%
                  </div>
                </div>
                {meta>0&&(
                  <div style={{flex:1,minWidth:130}}>
                    <div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:6}}>
                      <span style={{...tsCss(TS.micro),textTransform:"uppercase",
                        color:"rgba(255,255,255,.5)"}}>Meta</span>
                      <span className="tnum" style={{fontSize:11.5,fontWeight:700,
                        color:fat>=meta?"#6EE7B7":"rgba(255,255,255,.85)"}}>
                        {((fat/meta)*100).toFixed(0)}%
                      </span>
                    </div>
                    <div style={{height:5,borderRadius:3,background:"rgba(255,255,255,.16)",overflow:"hidden"}}>
                      <div style={{width:Math.min(100,(fat/meta)*100)+"%",height:"100%",
                        background:fat>=meta?"#6EE7B7":"#fff",borderRadius:3,
                        transition:`width ${DS.slow}`}}/>
                    </div>
                    <div className="tnum" style={{fontSize:11,color:"rgba(255,255,255,.45)",marginTop:5}}>
                      {fat>=meta?"batida · +"+R(fat-meta):"faltam "+R(meta-fat)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"grid",gridTemplateRows:"repeat(3,1fr)",gap:12}}>
              <Kpi label="Lucro bruto" valor={R(luc)} variacao={vLuc}
                sub={fat>0?((luc/fat)*100).toFixed(1).replace(".",",")+"% do faturamento":null}/>
              <Kpi label="Gastos" valor={R(gas)} variacao={vGas} inverso acento={DS.err}
                sub={fat>0?((gas/fat)*100).toFixed(1).replace(".",",")+"% do faturamento":null}/>
              <Kpi label="Ticket por canal" valor={R((atual?.channels||[]).length?fat/(atual.channels.length):0)}
                sub={`${(atual?.channels||[]).length} canais ativos`}/>
            </div>
          </div>

          {/* ── Tendência ── */}
          {serie.length>1&&(
            <div style={{background:DS.sur,borderRadius:DS.r14,border:`1px solid ${DS.bd}`,
              marginBottom:12,boxShadow:DS.e1,padding:isSmall?"18px 14px":"20px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",
                gap:16,flexWrap:"wrap",marginBottom:6}}>
                <div>
                  <div style={{...tsCss(TS.h4),color:DS.i1,fontFamily:FONT_DISPLAY}}>Tendência</div>
                  <div style={{...tsCss(TS.caption),color:DS.i3,marginTop:2}}>
                    Últimos {serie.length} meses · valores em reais
                  </div>
                </div>
                <div style={{display:"flex",gap:16,flexWrap:"wrap"}}>
                  <span style={{display:"flex",alignItems:"center",gap:7,...tsCss(TS.caption),color:DS.i2}}>
                    <span style={{width:14,height:2.5,background:DS.ink,borderRadius:2}}/>Faturamento
                  </span>
                  <span style={{display:"flex",alignItems:"center",gap:7,...tsCss(TS.caption),color:DS.i2}}>
                    <span style={{width:14,height:0,borderTop:`2.5px dashed ${DS.ok}`}}/>Lucro líquido
                  </span>
                </div>
              </div>
              <TrendChart serie={serie} atualMonth={atual?.month} onPick={setSelMes} isSmall={isSmall}/>
            </div>
          )}

          {/* ── Canais e gastos ── */}
          <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"1.4fr 1fr",
            gap:12,marginBottom:12}}>

            <div style={{background:DS.sur,borderRadius:DS.r14,border:`1px solid ${DS.bd}`,
              boxShadow:DS.e1,overflow:"hidden"}}>
              <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${DS.bd}`}}>
                <div style={{...tsCss(TS.h4),color:DS.i1,fontFamily:FONT_DISPLAY}}>Canais de venda</div>
                <div style={{...tsCss(TS.caption),color:DS.i3,marginTop:2}}>
                  Ordenados por faturamento
                </div>
              </div>
              {(atual?.channels||[]).length===0
                ? <div style={{padding:"40px 20px",textAlign:"center",...tsCss(TS.body),color:DS.i3}}>
                    Nenhum canal lançado neste mês
                  </div>
                : <div style={{overflowX:"auto"}}>
                    <table style={{width:"100%",borderCollapse:"collapse"}}>
                      <caption style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0 0 0 0)"}}>
                        Faturamento, participação, lucro e margem por canal em {mesLabel(atual.month)}
                      </caption>
                      <thead>
                        <tr>
                          {["Canal","Faturamento","Part.","Lucro","Margem",""].map((h,i)=>(
                            <th key={h+i} scope="col" style={{...tsCss(TS.micro),textTransform:"uppercase",
                              color:DS.i3,textAlign:i===0?"left":"right",padding:"11px 20px 9px",
                              whiteSpace:"nowrap",borderBottom:`1px solid ${DS.bd}`,
                              background:DS.canvas}}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...(atual.channels||[])].sort((a,b)=>(b.revenue||0)-(a.revenue||0))
                          .map((c,i,arr)=>{
                          const antC=(anterior?.channels||[]).find(x=>x.name===c.name);
                          const vc=antC?varPct(Number(c.revenue)||0,Number(antC.revenue)||0):null;
                          const share=fat>0?((Number(c.revenue)||0)/fat)*100:0;
                          const cc=corCanal(c.name);
                          const mg=Number(c.revenue)>0&&Number(c.profit)>0
                            ? (Number(c.profit)/Number(c.revenue))*100 : null;
                          const td={padding:"13px 20px",borderBottom:i<arr.length-1?`1px solid ${DS.bd}`:"none",
                            textAlign:"right",whiteSpace:"nowrap"};
                          return (
                            <tr key={c.name}>
                              <th scope="row" style={{...td,textAlign:"left",fontWeight:400}}>
                                <span style={{display:"flex",alignItems:"center",gap:9}}>
                                  <span style={{width:3,height:22,borderRadius:2,background:cc.cor,
                                    flexShrink:0}}/>
                                  <span style={{...tsCss(TS.bodyMd),color:DS.i1}}>{c.name}</span>
                                </span>
                              </th>
                              <td className="tnum" style={{...td,...tsCss(TS.bodyMd),fontWeight:650,color:DS.i1}}>
                                {R(c.revenue)}
                              </td>
                              <td className="tnum" style={{...td,...tsCss(TS.caption),color:DS.i2}}>
                                {share.toFixed(1).replace(".",",")}%
                              </td>
                              <td className="tnum" style={{...td,...tsCss(TS.caption),
                                color:Number(c.profit)>0?DS.ok:DS.i4}}>
                                {Number(c.profit)>0?R(c.profit):"—"}
                              </td>
                              <td className="tnum" style={{...td,...tsCss(TS.caption),
                                color:mg!=null?DS.i2:DS.i4}}>
                                {mg!=null?mg.toFixed(1).replace(".",",")+"%":"—"}
                              </td>
                              <td style={{...td,paddingLeft:0}}><Variacao dado={vc} titulo={tipAnt}/></td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr>
                          <th scope="row" style={{padding:"13px 20px",textAlign:"left",
                            borderTop:`2px solid ${DS.ink}`,...tsCss(TS.bodyMd),fontWeight:700,color:DS.i1}}>
                            Total
                          </th>
                          <td className="tnum" style={{padding:"13px 20px",textAlign:"right",
                            borderTop:`2px solid ${DS.ink}`,...tsCss(TS.bodyMd),fontWeight:700}}>{R(fat)}</td>
                          <td className="tnum" style={{padding:"13px 20px",textAlign:"right",
                            borderTop:`2px solid ${DS.ink}`,...tsCss(TS.caption),color:DS.i2}}>100%</td>
                          <td className="tnum" style={{padding:"13px 20px",textAlign:"right",
                            borderTop:`2px solid ${DS.ink}`,...tsCss(TS.caption),fontWeight:650,color:DS.ok}}>{R(luc)}</td>
                          <td className="tnum" style={{padding:"13px 20px",textAlign:"right",
                            borderTop:`2px solid ${DS.ink}`,...tsCss(TS.caption),color:DS.i2}}>
                            {fat>0?(luc/fat*100).toFixed(1).replace(".",",")+"%":"—"}
                          </td>
                          <td style={{borderTop:`2px solid ${DS.ink}`}}/>
                        </tr>
                      </tfoot>
                    </table>
                  </div>}
            </div>

            <div style={{background:DS.sur,borderRadius:DS.r14,border:`1px solid ${DS.bd}`,
              boxShadow:DS.e1,overflow:"hidden"}}>
              <div style={{padding:"18px 20px 14px",borderBottom:`1px solid ${DS.bd}`,
                display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10}}>
                <div>
                  <div style={{...tsCss(TS.h4),color:DS.i1,fontFamily:FONT_DISPLAY}}>Gastos</div>
                  <div style={{...tsCss(TS.caption),color:DS.i3,marginTop:2}}>
                    {(atual?.expenses||[]).length} lançamentos
                  </div>
                </div>
                <div className="tnum" style={{...tsCss(TS.h4),color:DS.err,fontFamily:FONT_DISPLAY}}>
                  {R(gas)}
                </div>
              </div>
              {(atual?.expenses||[]).length===0
                ? <div style={{padding:"40px 20px",textAlign:"center",...tsCss(TS.body),color:DS.i3}}>
                    Nenhum gasto lançado
                  </div>
                : <div style={{padding:"4px 0"}}>
                    {[...(atual.expenses||[])].sort((a,b)=>(b.amount||0)-(a.amount||0))
                      .map((e,i,arr)=>{
                      const antE=(anterior?.expenses||[]).find(x=>x.name===e.name);
                      const ve=antE?varPct(Number(e.amount)||0,Number(antE.amount)||0):null;
                      const sh=gas>0?((Number(e.amount)||0)/gas)*100:0;
                      return (
                        <div key={e.name} style={{padding:"12px 20px",
                          borderBottom:i<arr.length-1?`1px solid ${DS.bd}`:"none"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                            <span style={{flex:1,...tsCss(TS.body),color:DS.i2}}>{e.name}</span>
                            <Variacao dado={ve} inverso titulo={tipAnt}/>
                            <span className="tnum" style={{...tsCss(TS.bodyMd),color:DS.i1,
                              minWidth:86,textAlign:"right"}}>{R(e.amount)}</span>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:9}}>
                            <div style={{flex:1,height:3,borderRadius:2,background:DS.surEl,overflow:"hidden"}}>
                              <div style={{width:sh+"%",height:"100%",background:DS.err,opacity:.42,borderRadius:2}}/>
                            </div>
                            <span className="tnum" style={{fontSize:11,color:DS.i4,minWidth:32,textAlign:"right"}}>
                              {sh.toFixed(0)}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div style={{padding:"13px 20px",borderTop:`2px solid ${DS.ink}`,
                      display:"flex",justifyContent:"space-between",alignItems:"baseline"}}>
                      <span style={{...tsCss(TS.caption),color:DS.i3}}>Sobre o faturamento</span>
                      <span className="tnum" style={{...tsCss(TS.bodyMd),fontWeight:700,color:DS.i1}}>
                        {fat>0?(gas/fat*100).toFixed(1).replace(".",",")+"%":"—"}
                      </span>
                    </div>
                  </div>}
            </div>
          </div>

          {atual?.notes&&(
            <div style={{background:DS.surEl,borderRadius:DS.r12,padding:"15px 18px",marginBottom:14}}>
              <div style={{...tsCss(TS.micro),textTransform:"uppercase",color:DS.i3,marginBottom:7}}>
                Observações
              </div>
              <div style={{...tsCss(TS.body),color:DS.i2,whiteSpace:"pre-wrap"}}>{atual.notes}</div>
            </div>
          )}

          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            <Btn v="secondary" onClick={()=>abrirEdit(atual)}>Editar {mesCurto(atual.month)}</Btn>
            <Btn v="danger" onClick={()=>excluir(atual)}>Excluir mês</Btn>
          </div>
        </>
      )}

      {/* FORMULÁRIO */}
      <Modal open={showF} onClose={()=>{setShowF(false);setEd(null);}}
        title={ed?"Editar "+mesLabel(ed.month):"Novo mês"} width={680}>
        <div style={{display:"flex",flexDirection:"column",gap:22}}>
          <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"1fr 1fr",gap:12}}>
            <Inp label="Mês" type="month" value={form.month}
              onChange={v=>setForm(p=>({...p,month:v}))} req/>
            <Inp label="Meta de faturamento (R$)" value={form.goal}
              onChange={v=>setForm(p=>({...p,goal:v}))} placeholder="Ex: 58000"/>
          </div>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
              marginBottom:10,gap:10,flexWrap:"wrap"}}>
              <Lbl ch="Faturamento por marketplace"/>
              <div style={{display:"flex",gap:8,alignItems:"center"}}>
                <div style={{display:"inline-flex",background:DS.surEl,borderRadius:DS.r8,padding:3,gap:2}}>
                  {[{v:"valor",l:"Lucro em R$"},{v:"pct",l:"Lucro em %"}].map(o=>{
                    const on=modoLucro===o.v;
                    return (
                      <button key={o.v} onClick={()=>setModoLucro(o.v)}
                        style={{padding:"5px 11px",borderRadius:DS.r6,border:"none",cursor:"pointer",
                          background:on?DS.sur:"transparent",color:on?DS.i1:DS.i3,
                          fontFamily:"inherit",fontSize:12,fontWeight:on?600:500,
                          boxShadow:on?DS.e1:"none",transition:`all ${DS.fast}`,whiteSpace:"nowrap"}}>
                        {o.l}
                      </button>
                    );
                  })}
                </div>
                <Btn sz="sm" v="secondary"
                  onClick={()=>setForm(p=>({...p,channels:[...p.channels,{name:"",revenue:"",profit:"",pct:""}]}))}>
                  + Canal
                </Btn>
              </div>
            </div>

            {modoLucro==="pct"&&(
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10,flexWrap:"wrap",
                background:DS.blueSft,border:`1px solid ${DS.blueBd}`,borderRadius:DS.r10,
                padding:"11px 13px"}}>
                <span style={{fontSize:12.5,color:DS.i2,flex:1,minWidth:180}}>
                  Mesma margem em todos os canais?
                </span>
                <input value={pctGeral} onChange={e=>setPctGeral(e.target.value)}
                  placeholder="Ex: 28" inputMode="decimal" aria-label="Margem para todos os canais"
                  style={{width:80,height:36,borderRadius:DS.r8,border:`1px solid ${DS.bd}`,
                    padding:"0 10px",fontSize:13,fontFamily:"inherit",textAlign:"center",
                    background:DS.sur,color:DS.i1,fontVariantNumeric:"tabular-nums"}}/>
                <span style={{fontSize:13,color:DS.i3}}>%</span>
                <Btn sz="sm" onClick={aplicarPctGeral}>Aplicar a todos</Btn>
              </div>
            )}
            <div style={{background:DS.surEl,borderRadius:DS.r10,padding:12}}>
              <div style={{display:"grid",gridTemplateColumns:isSmall?"1fr":"1.3fr 1fr 1fr 40px",
                gap:8,marginBottom:8,fontSize:10.5,color:DS.i3,fontWeight:600,
                textTransform:"uppercase",letterSpacing:".05em"}}>
                <span>Canal</span><span>Faturamento</span>
                <span>{modoLucro==="pct"?"Margem (%)":"Lucro (R$)"}</span><span/>
              </div>
              {form.channels.map((c,i)=>(
                <div key={i} style={{display:"grid",
                  gridTemplateColumns:isSmall?"1fr":"1.3fr 1fr 1fr 40px",gap:8,marginBottom:8,
                  alignItems:"center"}}>
                  <input value={c.name} onChange={e=>setCanal(i,"name",e.target.value)}
                    placeholder="Nome do canal" list="canais-sugestao"
                    style={{height:40,borderRadius:DS.r8,border:`1px solid ${DS.bd}`,padding:"0 11px",
                      fontSize:13,fontFamily:"inherit",background:DS.sur,color:DS.i1}}/>
                  <input value={c.revenue} onChange={e=>setCanal(i,"revenue",e.target.value)}
                    placeholder="0,00" inputMode="decimal"
                    style={{height:40,borderRadius:DS.r8,border:`1px solid ${DS.bd}`,padding:"0 11px",
                      fontSize:13,fontFamily:"inherit",background:DS.sur,color:DS.i1,
                      fontVariantNumeric:"tabular-nums"}}/>
                  {modoLucro==="pct" ? (
                    <div style={{position:"relative"}}>
                      <input value={c.pct||""} onChange={e=>setCanal(i,"pct",e.target.value)}
                        placeholder="0" inputMode="decimal" aria-label={"Margem de "+(c.name||"canal")}
                        style={{height:40,width:"100%",borderRadius:DS.r8,border:`1px solid ${DS.bd}`,
                          padding:"0 26px 0 11px",fontSize:13,fontFamily:"inherit",background:DS.sur,
                          color:DS.i1,fontVariantNumeric:"tabular-nums"}}/>
                      <span style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",
                        fontSize:12,color:DS.i3,pointerEvents:"none"}}>%</span>
                      {num(c.profit)>0&&(
                        <div style={{fontSize:11,color:DS.ok,marginTop:3,fontWeight:600,
                          fontVariantNumeric:"tabular-nums"}}>= {R(num(c.profit))}</div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input value={c.profit} onChange={e=>setCanal(i,"profit",e.target.value)}
                        placeholder="opcional" inputMode="decimal" aria-label={"Lucro de "+(c.name||"canal")}
                        style={{height:40,width:"100%",borderRadius:DS.r8,border:`1px solid ${DS.bd}`,
                          padding:"0 11px",fontSize:13,fontFamily:"inherit",background:DS.sur,
                          color:DS.i1,fontVariantNumeric:"tabular-nums"}}/>
                      {c.pct&&(
                        <div style={{fontSize:11,color:DS.i3,marginTop:3,
                          fontVariantNumeric:"tabular-nums"}}>margem de {c.pct}%</div>
                      )}
                    </div>
                  )}
                  <button onClick={()=>setForm(p=>({...p,channels:p.channels.filter((_,j)=>j!==i)}))}
                    aria-label="Remover canal"
                    style={{height:40,width:40,borderRadius:DS.r8,border:"none",background:"transparent",
                      color:DS.err,cursor:"pointer",fontSize:15}}>✕</button>
                </div>
              ))}
              <datalist id="canais-sugestao">
                {CANAIS_PADRAO.map(c=><option key={c.name} value={c.name}/>)}
              </datalist>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
                borderTop:`1px solid ${DS.bd}`,fontSize:13}}>
                <span style={{color:DS.i2}}>Total do mês</span>
                <span style={{fontWeight:700,fontVariantNumeric:"tabular-nums"}}>
                  {R(prevFat)}
                  {prevLuc>0&&<span style={{color:DS.ok}}> · lucro {R(prevLuc)}
                    {prevFat>0?" ("+(prevLuc/prevFat*100).toFixed(1).replace(".",",")+"%)":""}</span>}
                </span>
              </div>
            </div>
          </div>

          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
              <Lbl ch="Gastos do mês"/>
              <Btn sz="sm" v="secondary"
                onClick={()=>setForm(p=>({...p,expenses:[...p.expenses,{name:"",amount:""}]}))}>
                + Gasto
              </Btn>
            </div>
            <div style={{background:DS.surEl,borderRadius:DS.r10,padding:12}}>
              {form.expenses.map((e,i)=>(
                <div key={i} style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 40px",gap:8,
                  marginBottom:8,alignItems:"center"}}>
                  <input value={e.name} onChange={ev=>setGasto(i,"name",ev.target.value)}
                    placeholder="Descrição" list="gastos-sugestao"
                    style={{height:40,borderRadius:DS.r8,border:`1px solid ${DS.bd}`,padding:"0 11px",
                      fontSize:13,fontFamily:"inherit",background:DS.sur,color:DS.i1}}/>
                  <input value={e.amount} onChange={ev=>setGasto(i,"amount",ev.target.value)}
                    placeholder="0,00" inputMode="decimal"
                    style={{height:40,borderRadius:DS.r8,border:`1px solid ${DS.bd}`,padding:"0 11px",
                      fontSize:13,fontFamily:"inherit",background:DS.sur,color:DS.i1,
                      fontVariantNumeric:"tabular-nums"}}/>
                  <button onClick={()=>setForm(p=>({...p,expenses:p.expenses.filter((_,j)=>j!==i)}))}
                    aria-label="Remover gasto"
                    style={{height:40,width:40,borderRadius:DS.r8,border:"none",background:"transparent",
                      color:DS.err,cursor:"pointer",fontSize:15}}>✕</button>
                </div>
              ))}
              <datalist id="gastos-sugestao">
                {GASTOS_PADRAO.map(n=><option key={n} value={n}/>)}
              </datalist>
              <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,
                borderTop:`1px solid ${DS.bd}`,fontSize:13}}>
                <span style={{color:DS.i2}}>Total de gastos</span>
                <span style={{fontWeight:700,color:DS.err,fontVariantNumeric:"tabular-nums"}}>{R(prevGas)}</span>
              </div>
            </div>
          </div>

          {/* prévia */}
          <div style={{background:DS.ink,borderRadius:DS.r12,padding:"16px 18px",color:"#fff"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:11,color:"rgba(255,255,255,.6)",textTransform:"uppercase",
                  letterSpacing:".06em",fontWeight:600}}>Lucro líquido do mês</div>
                <div style={{fontSize:12,color:"rgba(255,255,255,.55)",marginTop:3}}>
                  {R(prevLuc)} de lucro − {R(prevGas)} de gastos
                </div>
              </div>
              <div style={{fontSize:26,fontWeight:800,letterSpacing:"-.6px",
                fontVariantNumeric:"tabular-nums",
                color:(prevLuc-prevGas)>=0?"#4ADE80":"#FCA5A5"}}>
                {R(prevLuc-prevGas)}
              </div>
            </div>
          </div>

          <Inp label="Observações" value={form.notes}
            onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Opcional"/>

          <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
            <Btn v="secondary" onClick={()=>{setShowF(false);setEd(null);}}>Cancelar</Btn>
            <Btn onClick={salvar} disabled={salvando}>{salvando?"Salvando…":(ed?"Salvar alterações":"Cadastrar mês")}</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}

const buildNav = (role) => {
  const allowed = ROLE_PAGES[role] || ROLE_PAGES.production;
  const all = [
    { id:"dashboard",   l:"Dashboard",     group:null, ic:"M2 8.5l6-5.5 6 5.5M3.5 7.5V13h9V7.5" },
    { id:"cut-order",   l:"Ordem de Corte",group:null, ic:"M4.5 4.5a2 2 0 11-2 2M4.5 9.5a2 2 0 11-2 2M6.2 5.8l7 4.8M6.2 10.2l7-4.8" },
    { id:"productions", l:"Produção",       group:null, ic:"M2.5 12.5h2V7h-2zM6 12.5h2V3.5H6zM9.5 12.5h2v-6h-2z" },
    { id:"__cadastro",  l:"Cadastro",       group:null, isGroup:true, ic:"M2.5 4.5h11M2.5 8h11M2.5 11.5h11", children:[
      { id:"products",  l:"Produtos",            ic:"M3 4.5L8 2l5 2.5v5L8 12 3 9.5zM3 4.5L8 7m0 5V7m5-2.5L8 7" },
      { id:"stock",     l:"Custos de materiais", ic:"M8 2v12M11 4.5H6.75a1.75 1.75 0 100 3.5h2.5a1.75 1.75 0 010 3.5H5" },
      { id:"fabrics",   l:"Tecidos",             ic:"M2.5 3.5h9v2l-2 1.5 2 1.5v2.5h-9V8l2-1.5L2.5 5zM4.5 3.5v2M4.5 8v2.5" },
      { id:"trims",     l:"Aviamentos & Insumos",ic:"M5 5.5a2.5 2.5 0 105 0 2.5 2.5 0 00-5 0zM7.5 8v4.5M5.5 10.5h4" },
      { id:"users",     l:"Usuários", adminOnly:true, ic:"M5.5 6a2 2 0 100-4 2 2 0 000 4zM2 12.5c0-2 1.5-3.5 3.5-3.5S9 10.5 9 12.5M10.5 6.5a1.5 1.5 0 100-3M13.5 12.5c0-1.5-1-2.7-2.5-3.1" },
    ]},
    { id:"revenue",     l:"Faturamento",   group:null, ic:"M2 12l3.5-4.5 3 3L13 4.5M13 4.5H9.5M13 4.5V8" },
    { id:"financial",   l:"Financeiro",    group:null, ic:"M8 2v12M11 4.5H6.75a1.75 1.75 0 100 3.5h2.5a1.75 1.75 0 010 3.5H5" },
    { id:"agenda",      l:"Agenda",         group:null, ic:"M3 3.5h10v10H3zM3 6.5h10M5.5 1.5v3M10.5 1.5v3" },
    { id:"outsourced",  l:"Terceirizados",  group:null, ic:"M5.5 7a2 2 0 100-4 2 2 0 000 4zM2 13c0-2 1.5-3.5 3.5-3.5S9 11 9 13M11 7.5a1.5 1.5 0 100-3M14 13c0-1.5-1-2.8-2.5-3.2" },
    { id:"purchases",   l:"Compras",        group:null, ic:"M2 2h2l1.5 8h6l1.5-5.5H4.5M6 13a1 1 0 100-2 1 1 0 000 2zM11.5 13a1 1 0 100-2 1 1 0 000 2z" },
  ];
  return all.filter(item => {
    if (item.isGroup) return true;
    return allowed.includes(item.id);
  });
};

// ═══════════════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [data,setData]         = useState(EMPTY);
  const [page,setPage]         = useState("dashboard");
  const [filter,setFilter]     = useState(null);
  const [sideOpen,setSideOpen] = useState(true);
  const [mMenu,setMMenu]       = useState(false);
  const [openGroup,setOpenGroup] = useState(false);
  const [currentUser,setCurrentUser] = useState(null);
  const [tenantId,setTenantId] = useState(null);
  const [loading,setLoading]   = useState(true);
  const [appErr,setAppErr]     = useState(null);
  const { isSmall } = useViewport();

  // ── Auth listener — single source of truth ──
  useEffect(()=>{
    if(!supabase){ setLoading(false); setAppErr("Supabase não configurado. Adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY ao .env.local"); return; }
    const unsub = sb.onAuthChange(async (event, session)=>{
      if(session?.user){
        try {
          const profile = await sb.getProfile(session.user.id);
          setCurrentUser(profile);
          setTenantId(profile.tenant_id || null);
          const allData = await sb.loadAll();
          setData(allData);
        } catch(e){
          setAppErr("Erro ao carregar dados: "+e.message);
        } finally { setLoading(false); }
      } else {
        setCurrentUser(null); setTenantId(null); setData(EMPTY); setLoading(false);
      }
    });
    return unsub;
  },[]);

  // Helper: reload a single collection after mutation
  const reload = async (key) => {
    try {
      const fresh = await sb.loadAll();
      setData(fresh);
    } catch(e){ showToast("Erro ao recarregar dados: "+e.message,"err"); }
  };

  const logout = async () => { await sb.signOut(); };

  const alerts = getAlerts(data);
  const badgeFor = id => {
    if(id==="financial"||id==="agenda") return data.payables.filter(p=>isOD(p.due)&&p.status!=="Pago").length;
    return 0;
  };

  const goTo = useCallback((id,f=null)=>{ setPage(id); setFilter(f); setMMenu(false); },[]);

  // Loading screen
  if(loading){
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:DS.bg,fontFamily:"-apple-system,sans-serif"}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{textAlign:"center"}}>
          <div style={{width:40,height:40,background:`linear-gradient(135deg,${DS.ink},#2A2A28)`,borderRadius:DS.r12,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <svg width="22" height="22" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.4" fill="white"/><rect x="10" y="2.5" width="5.5" height="5.5" rx="1.4" fill={DS.blue}/><rect x="2.5" y="10" width="5.5" height="5.5" rx="1.4" fill="white" opacity=".45"/><rect x="10" y="10" width="5.5" height="5.5" rx="1.4" fill="white"/></svg>
          </div>
          <div style={{fontSize:14,color:DS.i3}}>Carregando CONTROfabric...</div>
        </div>
      </div>
    );
  }

  // Error screen
  if(appErr){
    return (
      <div style={{height:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:DS.bg,fontFamily:"-apple-system,sans-serif",padding:24}}>
        <style>{GLOBAL_CSS}</style>
        <div style={{maxWidth:480,textAlign:"center"}}>
          <div style={{fontSize:16,fontWeight:700,color:DS.err,marginBottom:12}}>Erro de configuração</div>
          <div style={{fontSize:13,color:DS.i2,lineHeight:1.6,background:DS.errSft,padding:16,borderRadius:DS.r10,border:`1px solid ${DS.errBd}`,textAlign:"left"}}>{appErr}</div>
        </div>
      </div>
    );
  }

  if(!currentUser) return <LoginPage onLogin={(email,pass)=>sb.signIn(email,pass)}/>;

  const pages = {
    dashboard:    <PgDash        data={data} goTo={goTo} currentUser={currentUser}/>,
    productions:  <PgProductions data={data} setData={setData} reload={reload} tenantId={tenantId} fInit={filter}/>,
    "cut-order":  <PgCutOrder   data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    revenue:      <PgFaturamento data={data} setData={setData} tenantId={tenantId}/>,
    financial:    <PgFinancial   data={data} setData={setData} reload={reload} tenantId={tenantId} fInit={filter}/>,
    agenda:       <PgAgenda      data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    stock:        <PgStock       data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    purchases:    <PgPurchases   data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    outsourced:   <PgOutsourced  data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    products:     <PgProducts    data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    fabrics:      <PgFabrics     data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    trims:        <PgTrims       data={data} setData={setData} reload={reload} tenantId={tenantId}/>,
    users:        <PgUsers       data={data} setData={setData} reload={reload} tenantId={tenantId} currentUser={currentUser}/>,
  };

  const nav = buildNav(currentUser.role);
  const roleLabel = {admin:"Administrador",financial:"Financeiro",production:"Produção",stock:"Estoque"}[currentUser.role]||currentUser.role;

  const NavItem = ({item, depth=0}) => {
    const active = page===item.id;
    const bc = badgeFor(item.id);
    return (
      <button onClick={()=>goTo(item.id)}
        style={{display:"flex",alignItems:"center",gap:10,padding:depth?"7px 12px 7px 20px":"8px 12px",borderRadius:DS.r8,width:"100%",border:"none",fontFamily:"inherit",cursor:"pointer",transition:`background ${DS.fast}, color ${DS.fast}`,background:active?DS.surEl:"transparent",color:active?DS.i1:DS.i2,fontSize:depth?12.5:13,fontWeight:active?600:450,marginBottom:2,whiteSpace:"nowrap",textAlign:"left",position:"relative"}}
        onMouseEnter={e=>!active&&(e.currentTarget.style.background=DS.canvas)}
        onMouseLeave={e=>!active&&(e.currentTarget.style.background="transparent")}>
        {active&&<div style={{position:"absolute",left:0,top:"50%",transform:"translateY(-50%)",width:3,height:16,background:DS.ink,borderRadius:"0 2px 2px 0",flexShrink:0}}/>}
        {item.ic&&<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:active?1:.7}}><path d={item.ic}/></svg>}
        {sideOpen&&<span style={{flex:1}}>{item.l}</span>}
        {sideOpen&&bc>0&&<span style={{minWidth:18,height:18,borderRadius:9,background:DS.err,color:"#fff",fontSize:10,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{bc}</span>}
      </button>
    );
  };

  return (
    <div style={{display:"flex",height:"100vh",background:DS.bg,fontFamily:DS.font,overflow:"hidden",fontSize:14,color:DS.i1}}>
      <style>{GLOBAL_CSS}</style>
      {!isSmall&&(
        <aside style={{width:sideOpen?236:56,flexShrink:0,background:DS.sur,borderRight:`1px solid ${DS.bd}`,display:"flex",flexDirection:"column",transition:`width ${DS.base}`,overflow:"hidden",height:"100%"}}>
          <div style={{padding:"18px 16px",borderBottom:`1px solid ${DS.bd}`,display:"flex",alignItems:"center",gap:11,flexShrink:0}}>
            <div style={{width:34,height:34,background:`linear-gradient(135deg, ${DS.ink} 0%, #2A2A28 100%)`,borderRadius:DS.r10,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:DS.e1}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2.5" y="2.5" width="5.5" height="5.5" rx="1.4" fill="white"/><rect x="10" y="2.5" width="5.5" height="5.5" rx="1.4" fill={DS.blue}/><rect x="2.5" y="10" width="5.5" height="5.5" rx="1.4" fill="white" opacity=".45"/><rect x="10" y="10" width="5.5" height="5.5" rx="1.4" fill="white"/></svg>
            </div>
            {sideOpen&&<div style={{lineHeight:1}}>
              <div style={{fontSize:15,fontWeight:800,color:DS.i1,letterSpacing:"-.4px"}}>CONTRO<span style={{color:DS.blue}}>fabric</span></div>
              <div style={{fontSize:10.5,color:DS.i3,marginTop:3,letterSpacing:".02em"}}>Gestão de Produção</div>
            </div>}
          </div>
          {alerts.length>0&&sideOpen&&(
            <div style={{margin:"10px 12px 0",padding:"8px 11px",background:DS.errSft,borderRadius:DS.r8,display:"flex",alignItems:"center",gap:6}}>
              <span style={{display:"flex",alignItems:"center",gap:6,fontSize:11,color:DS.err,fontWeight:600}}><span style={{width:6,height:6,borderRadius:"50%",background:DS.err}}/>{alerts.length} alerta(s) pendente(s)</span>
            </div>
          )}
          <nav style={{flex:1,padding:"10px 6px",overflowY:"auto"}}>
            {nav.map(item=>{
              if(item.isGroup){
                const visChildren=(item.children||[]).filter(c=>{
                  if(c.adminOnly&&currentUser.role!=="admin") return false;
                  return ROLE_PAGES[currentUser.role]?.includes(c.id)!==false;
                });
                if(visChildren.length===0) return null;
                return (
                  <div key={item.id}>
                    <button onClick={()=>setOpenGroup(o=>!o)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",width:"100%",border:"none",background:"none",cursor:"pointer",fontFamily:"inherit",borderRadius:DS.r8,transition:`background ${DS.fast}`,color:DS.i2}}
                      onMouseEnter={e=>e.currentTarget.style.background=DS.canvas}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      {item.ic&&<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,opacity:.7}}><path d={item.ic}/></svg>}
                      {sideOpen&&<span style={{flex:1,textAlign:"left",fontSize:13,fontWeight:450}}>{item.l}</span>}
                      {sideOpen&&<span style={{fontSize:10,color:DS.i4,transform:openGroup?"rotate(0)":"rotate(-90deg)",transition:"transform "+DS.fast}}>▾</span>}
                    </button>
                    {(openGroup||!sideOpen)&&visChildren.map(c=><NavItem key={c.id} item={c} depth={1}/>)}
                  </div>
                );
              }
              return <NavItem key={item.id} item={item}/>;
            })}
          </nav>
          <div style={{borderTop:`1px solid ${DS.bd}`,flexShrink:0}}>
            {sideOpen&&(
              <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:24,height:24,borderRadius:DS.r6,background:DS.surEl,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:DS.i2,flexShrink:0}}>{currentUser.name.slice(0,1)}</div>
                <div style={{flex:1,overflow:"hidden"}}>
                  <div style={{fontSize:12,fontWeight:500,color:DS.i1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{currentUser.name}</div>
                  <div style={{fontSize:10,color:DS.i3}}>{roleLabel}</div>
                </div>
                <button onClick={logout} style={{background:"none",border:"none",cursor:"pointer",color:DS.i3,fontSize:11,padding:4}} title="Sair">↩</button>
              </div>
            )}
            <button onClick={()=>setSideOpen(o=>!o)} style={{padding:"10px 14px",background:"none",border:"none",borderTop:`1px solid ${DS.bd}`,cursor:"pointer",color:DS.i3,fontSize:11,fontFamily:"inherit",textAlign:"left",width:"100%"}}>
              {sideOpen?"← Recolher":"→"}
            </button>
          </div>
        </aside>
      )}

      <main style={{flex:1,overflow:"auto",padding:isSmall?"20px 16px 80px":"32px 40px",maxWidth:"100%"}}>
        <div key={page} style={{animation:`cf-fade ${DS.slow} both`,maxWidth:1280,margin:"0 auto"}}>
          {pages[page]||<div style={{color:DS.i3,textAlign:"center",padding:48}}>Módulo sem permissão de acesso.</div>}
        </div>
      </main>

      <ConfirmModal/>
      <ToastHost/>
      <FichaHost/>

      {isSmall&&(
        <>
          <div style={{position:"fixed",bottom:0,left:0,right:0,background:`${DS.sur}F2`,backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderTop:`1px solid ${DS.bd}`,display:"flex",zIndex:200,paddingBottom:"env(safe-area-inset-bottom,0px)"}}>
            {[
              {id:"dashboard",l:"Início",icon:"M2 7l6-5 6 5v6a1 1 0 01-1 1h-3v-4H6v4H3a1 1 0 01-1-1z"},
              {id:"cut-order",l:"Corte",icon:"M5 5a2 2 0 11-2 2M5 9a2 2 0 11-2 2M7 6l7 5M7 8l7-5"},
              {id:"productions",l:"Produção",icon:"M2 12h3V6H2zM6.5 12h3V3h-3zM11 12h3V8h-3z"},
              {id:"financial",l:"Financeiro",icon:"M8 1v14M11 4H6.5a2 2 0 000 4h3a2 2 0 010 4H5"},
              {id:"agenda",l:"Agenda",icon:"M3 3h10v11H3zM3 6h10M6 1v3M10 1v3"},
            ].map(item=>{
              const active=page===item.id; const bc=badgeFor(item.id);
              return (
                <button key={item.id} onClick={()=>goTo(item.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px 7px",background:"none",border:"none",cursor:"pointer",position:"relative",transition:`color ${DS.fast}`}}>
                  <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={active?DS.i1:DS.i3} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d={item.icon}/></svg>
                  <span style={{fontSize:10,fontWeight:active?650:450,color:active?DS.i1:DS.i3,textAlign:"center"}}>{item.l}</span>
                  {bc>0&&<span style={{position:"absolute",top:4,right:"22%",minWidth:15,height:15,borderRadius:8,background:DS.err,color:"#fff",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",border:`1.5px solid ${DS.sur}`}}>{bc}</span>}
                </button>
              );
            })}
            <button onClick={()=>setMMenu(true)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,padding:"9px 4px 7px",background:"none",border:"none",cursor:"pointer"}}>
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke={DS.i3} strokeWidth="1.6" strokeLinecap="round"><circle cx="3" cy="8" r="1"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="8" r="1"/></svg>
              <span style={{fontSize:10,color:DS.i3}}>Mais</span>
            </button>
          </div>
          {mMenu&&(
            <div style={{position:"fixed",inset:0,zIndex:300}}>
              <div onClick={()=>setMMenu(false)} style={{position:"absolute",inset:0,background:"rgba(12,12,11,.42)",backdropFilter:"blur(4px)",animation:`cf-fade ${DS.base} both`}}/>
              <div style={{position:"absolute",bottom:0,left:0,right:0,background:DS.sur,borderRadius:"20px 20px 0 0",padding:"24px 16px calc(28px + env(safe-area-inset-bottom,0px))",animation:`cf-slideUp ${DS.base} both`}}>
                <div style={{width:36,height:4,borderRadius:2,background:DS.bdM,margin:"0 auto 20px"}}/>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10}}>
                  {[{id:"products",l:"Produtos"},{id:"stock",l:"Custos"},{id:"fabrics",l:"Tecidos"},{id:"trims",l:"Aviamentos"},{id:"outsourced",l:"Terceirizados"},{id:"purchases",l:"Compras"},{id:"users",l:"Usuários"}].filter(it=>(ROLE_PAGES[currentUser.role]||[]).includes(it.id)).map(item=>{
                    const active=page===item.id;
                    return (
                      <button key={item.id} onClick={()=>{goTo(item.id);setMMenu(false);}} style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"16px 8px",borderRadius:DS.r12,border:"none",background:active?DS.ink:DS.surEl,cursor:"pointer",transition:`all ${DS.fast}`}}>
                        <span style={{fontSize:12,fontWeight:600,color:active?"#fff":DS.i1,textAlign:"center"}}>{item.l}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
