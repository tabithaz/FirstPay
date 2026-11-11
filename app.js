import { monthlyBudget, compareOffers, estimateHealthPlan, usd, clamp } from "./finance.mjs";
const KEY = "firstpay.v1";
const defaults = {
  budget: { salary: 85000, bonus: 0, effectiveTaxPercent: 25, retirementPercent: 6, premium: 170, rent: 1600, utilities: 180, food: 420, transport: 250, debt: 200, other: 250 },
  offers: [
    { salary: 93000, signingBonus: 4000, relocationCost: 3000, effectiveTaxPercent: 25, retirementPercent: 6, premium: 180, rent: 2100, utilities: 200, food: 460, transport: 260, debt: 200, other: 250 },
    { salary: 100000, signingBonus: 0, relocationCost: 6500, effectiveTaxPercent: 27, retirementPercent: 6, premium: 210, rent: 2650, utilities: 220, food: 500, transport: 320, debt: 200, other: 280 }
  ],
  health: { charges: 4500, plans: [{ monthlyPremium: 145, deductible: 2800, coinsurancePercent: 20, oopMax: 6000 }, { monthlyPremium: 290, deductible: 850, coinsurancePercent: 10, oopMax: 3500 }] }
};
const deepCopy = value => JSON.parse(JSON.stringify(value));
const MAX_NUMBER = 10000000;
const schema = {
  salary: ["Annual salary ($)", 1000], bonus: ["Annual cash bonus ($)", 100],
  effectiveTaxPercent: ["Estimated effective taxes (%)", 1], retirementPercent: ["401(k) contribution (%)", 1],
  premium: ["Monthly health premium ($)", 10], rent: ["Monthly rent ($)", 50],
  utilities: ["Utilities ($/mo)", 10], food: ["Groceries & food ($/mo)", 10],
  transport: ["Transportation ($/mo)", 10], debt: ["Loan payments ($/mo)", 10], other: ["Other expenses ($/mo)", 10],
  signingBonus: ["First-year signing bonus ($)", 500], relocationCost: ["One-time moving cost ($)", 500],
  monthlyPremium: ["Monthly premium ($)", 10], deductible: ["Annual deductible ($)", 100],
  coinsurancePercent: ["Coinsurance you pay (%)", 5], oopMax: ["Out-of-pocket maximum ($)", 100],
  charges: ["Annual eligible healthcare charges ($)", 500]
};
const budgetKeys = ["salary", "effectiveTaxPercent", "retirementPercent", "premium", "rent", "utilities", "food", "transport", "debt", "other"];
const offerKeys = ["salary", "signingBonus", "relocationCost", "effectiveTaxPercent", "retirementPercent", "premium", "rent", "utilities", "food", "transport", "debt", "other"];
const healthKeys = ["monthlyPremium", "deductible", "coinsurancePercent", "oopMax"];
const percentKeys = new Set(["effectiveTaxPercent", "retirementPercent", "coinsurancePercent"]);
function safeState(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Expected scenario data");
  const clean = deepCopy(defaults);
  function copyValues(dest, source, keys) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return;
    for (const key of keys) {
      if (!Object.hasOwn(source, key)) continue;
      const n = Number(source[key]);
      if (!Number.isFinite(n)) continue;
      dest[key] = clamp(n, 0, percentKeys.has(key) ? 100 : MAX_NUMBER);
    }
  }
  copyValues(clean.budget, data.budget, budgetKeys);
  if (Array.isArray(data.offers)) data.offers.slice(0, 2).forEach((o, i) => copyValues(clean.offers[i], o, offerKeys));
  if (data.health && typeof data.health === "object") {
    copyValues(clean.health, data.health, ["charges"]);
    if (Array.isArray(data.health.plans)) data.health.plans.slice(0, 2).forEach((p, i) => copyValues(clean.health.plans[i], p, healthKeys));
  }
  return clean;
}
let state = deepCopy(defaults);
try { const saved = localStorage.getItem(KEY); if (saved) state = safeState(JSON.parse(saved)); } catch { /* ignore corrupt local data */ }
function persist() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage unavailable */ } }
function field(container, object, key, onChange) {
  const wrap = document.createElement("div"); wrap.className = "field";
  const label = document.createElement("label"); label.textContent = schema[key][0];
  const input = document.createElement("input"); input.type = "number"; input.min = "0";
  input.max = String(percentKeys.has(key) ? 100 : MAX_NUMBER);
  input.step = String(schema[key][1]); input.value = String(object[key]);
  input.id = container.id + "-" + key; label.htmlFor = input.id;
  input.addEventListener("input", () => {
    if (input.value.trim() === "") return;
    const n = Number(input.value);
    if (!Number.isFinite(n)) return;
    object[key] = clamp(n, 0, percentKeys.has(key) ? 100 : MAX_NUMBER);
    persist(); onChange();
  });
  input.addEventListener("change", () => { input.value = String(object[key]); });
  wrap.append(label, input); container.append(wrap);
}
function buildFields(id, obj, keys, onChange) {
  const parent = document.getElementById(id); parent.replaceChildren();
  for (const key of keys) field(parent, obj, key, onChange);
}
function renderBudget() {
  const x = monthlyBudget(state.budget);
  document.getElementById("take-home").textContent = usd(x.takeHome);
  document.getElementById("expenses").textContent = usd(x.expenses);
  const rem = document.getElementById("remaining"); rem.textContent = usd(x.remaining); rem.classList.toggle("negative", x.remaining < 0);
  document.getElementById("emergency").textContent = usd(x.emergencyTarget);
  const parts = [
    ["Retirement", x.retirement, "dark"], ["Illustrative taxes", x.estimatedTax, "gold"],
    ["Insurance premium", x.premium, ""], ["Living expenses", x.expenses, "dark"],
    ["Money left", Math.max(0, x.remaining), ""]
  ];
  const parent = document.getElementById("money-bars"); parent.replaceChildren();
  for (const [name, value, cls] of parts) {
    const el = document.createElement("div");
    const h = document.createElement("div"); h.className = "bar-heading";
    const n = document.createElement("span"); n.textContent = name;
    const v = document.createElement("strong"); v.textContent = usd(value);
    h.append(n, v);
    const track = document.createElement("div"); track.className = "track";
    const fill = document.createElement("div"); fill.className = "fill " + cls;
    fill.style.width = (x.monthlyGross ? Math.min(100, value / x.monthlyGross * 100) : 0) + "%";
    track.append(fill); el.append(h, track); parent.append(el);
  }
}
function renderOffers() {
  const r = compareOffers(...state.offers);
  const parent = document.getElementById("offer-results"); parent.replaceChildren();
  const header = document.createElement("div"); header.className = "compare-row compare-header";
  for (const text of ["Metric", "Offer A", "Offer B"]) { const s=document.createElement("span");s.textContent=text;header.append(s); }
  parent.append(header);
  for (const [label, a, b, highIsGood] of [
    ["First-year cash cushion", r.a.firstYearCushion, r.b.firstYearCushion, true],
    ["Ongoing monthly cushion", r.a.ongoingMonthlyCushion, r.b.ongoingMonthlyCushion, true],
    ["Monthly take-home (year 1)", r.a.takeHome, r.b.takeHome, true],
    ["Monthly living costs", r.a.expenses, r.b.expenses, false],
    ["One-time moving cost", state.offers[0].relocationCost, state.offers[1].relocationCost, false]
  ]) {
    const row = document.createElement("div"); row.className = "compare-row";
    const title = document.createElement("span"); title.textContent = label; row.append(title);
    for (const [v, other] of [[a,b],[b,a]]) {
      const cell = document.createElement("strong"); cell.textContent = usd(v);
      if (v !== other && ((v > other) === highIsGood)) cell.className = "winner";
      row.append(cell);
    }
    parent.append(row);
  }
}
function renderHealth() {
  for (const i of [0, 1]) {
    const v = estimateHealthPlan(state.health.plans[i], state.health.charges);
    const parent = document.getElementById("health-total-" + (i ? "b" : "a")); parent.replaceChildren();
    const label = document.createElement("span"); label.textContent = "ESTIMATED TOTAL ANNUAL COST";
    const total = document.createElement("strong"); total.textContent = usd(v.annualTotal);
    const details = document.createElement("p"); details.className="fine"; details.textContent = usd(v.annualPremium) + " premiums + " + usd(v.outOfPocket) + " estimated out-of-pocket";
    parent.append(label, total, details);
  }
}
const missions = [
 { id:"emergency", emoji:"🛟", title:"Your safety net", subtitle:"Emergency funds", question:"Your monthly essentials cost $2,000. What is a three-month emergency fund target?", choices:["$2,000","$4,000","$6,000"], correct:2, why:"Three months of $2,000 essentials is $6,000. The right target depends on your circumstances; this is a starting exercise." },
 { id:"401k", emoji:"🌱", title:"The match", subtitle:"Workplace retirement", question:"Your employer matches contributions up to 4% of salary. Which action can help capture the full potential match, assuming you can afford it and meet plan rules?", choices:["Contribute 0%","Contribute at least 4%","Choose the highest-fee fund"], correct:1, why:"A contribution that meets the plan's matching threshold may capture the maximum match, subject to vesting and plan terms." },
 { id:"credit", emoji:"💳", title:"Credit card basics", subtitle:"Borrowing costs", question:"Which choice usually avoids interest on new purchases when your card has a grace period?", choices:["Pay only the minimum","Pay the statement balance in full by the due date","Spend up to the limit"], correct:1, why:"With a qualifying grace period, paying the full statement balance on time generally avoids purchase interest. Check your card's terms." },
 { id:"move", emoji:"🏠", title:"The first apartment", subtitle:"Moving costs", question:"You budgeted for the monthly rent. What other cost might you need before moving in?", choices:["A security deposit","A future annual bonus","Stock market gains"], correct:0, why:"Moving often includes deposits, application fees, transport, and setup costs—not just recurring rent." },
 { id:"benefits", emoji:"🩺", title:"Know your plan", subtitle:"Insurance terms", question:"What is a health insurance deductible?", choices:["Your paycheck tax rate","An amount you pay for covered services before certain plan cost-sharing kicks in","Your annual salary"], correct:1, why:"Deductibles affect when cost-sharing starts for some covered care, but copays, preventive care, and plan rules may differ." },
 { id:"loans", emoji:"📚", title:"Loan decisions", subtitle:"Debt strategy", question:"If you pay only the monthly interest on a loan, what generally happens to the principal?", choices:["It stays about the same","It always doubles immediately","It becomes zero next month"], correct:0, why:"Interest-only payments don't meaningfully reduce principal. Paying more than accruing interest usually helps reduce what you owe." }
];
let currentMission = null;
function renderMissions() {
  const list = document.getElementById("mission-list"); list.replaceChildren();
  for (const mission of missions) {
    const button = document.createElement("button");button.type="button";button.className="mission-card";
    const emoji=document.createElement("span");emoji.className="emoji";emoji.textContent=mission.emoji;
    const title=document.createElement("strong");title.textContent=mission.title;
    const meta=document.createElement("small");meta.textContent=mission.subtitle;
    button.append(emoji,title,meta);
    button.addEventListener("click",()=>{currentMission=mission;renderMissionDetail();document.getElementById("mission-detail").scrollIntoView({behavior:"smooth",block:"nearest"});});
    list.append(button);
  }
}
function renderMissionDetail() {
  const parent=document.getElementById("mission-detail");parent.replaceChildren();
  if (!currentMission) return;
  const heading=document.createElement("h2");heading.textContent=currentMission.emoji+" "+currentMission.title;
  const question=document.createElement("p");question.textContent=currentMission.question;
  const choices=document.createElement("div");choices.className="choices";
  currentMission.choices.forEach((answer,idx)=>{
    const btn=document.createElement("button");btn.type="button";btn.className="choice";btn.textContent=answer;
    btn.addEventListener("click",()=>{
      choices.querySelectorAll("button").forEach((b,j)=>{b.disabled=true;b.classList.add(j===currentMission.correct?"correct":(j===idx?"incorrect":""));});
      const result=document.createElement("div");result.className="answer";
      const status=document.createElement("strong");status.textContent=idx===currentMission.correct?"Nice work — that's right!":"Good try — here's what to know.";
      const explanation=document.createElement("span");explanation.textContent=currentMission.why;
      result.append(status,explanation);parent.append(result);
    },{once:true});choices.append(btn);
  });
  parent.append(heading,question,choices);
}
function route() {
  const current=(location.hash||"#paycheck").slice(1);
  const target=["paycheck","offers","benefits","missions"].includes(current)?current:"paycheck";
  for (const section of document.querySelectorAll(".page-section")) section.hidden=section.id!==target;
  for (const link of document.querySelectorAll(".navlink")) {
    const active=link.dataset.route===target;link.classList.toggle("active",active);
    if(active) link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");
  }
}
function init() {
  buildFields("budget-fields",state.budget,budgetKeys,renderBudget);
  buildFields("offer-a",state.offers[0],offerKeys,renderOffers);
  buildFields("offer-b",state.offers[1],offerKeys,renderOffers);
  buildFields("health-input",state.health,["charges"],renderHealth);
  buildFields("health-a",state.health.plans[0],healthKeys,renderHealth);
  buildFields("health-b",state.health.plans[1],healthKeys,renderHealth);
  renderBudget();renderOffers();renderHealth();renderMissions();route();
}
window.addEventListener("hashchange",route);
document.getElementById("reset").addEventListener("click",()=>{if(!confirm("Reset all saved scenarios to example values?"))return;state=deepCopy(defaults);persist();currentMission=null;init();document.getElementById("mission-detail").textContent="Pick a mission to begin.";});
document.getElementById("export").addEventListener("click",()=>{
  const blob=new Blob([JSON.stringify({version:1,...state},null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="firstpay-scenarios.json";a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
document.getElementById("import").addEventListener("change",async event=>{
  const file=event.target.files?.[0];if(!file)return;
  try {if(file.size>100000)throw new Error("File too large");
    const parsed=JSON.parse(await file.text());if(parsed.version!==1)throw new Error("Unsupported export format");
    state=safeState(parsed);persist();init();alert("Scenarios imported.");
  }catch(error){alert("Could not import scenarios: "+error.message);}
  event.target.value="";
});
init();
