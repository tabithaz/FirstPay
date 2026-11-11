import test from "node:test";
import assert from "node:assert/strict";
import { amount, monthlyBudget, compareOffers, estimateHealthPlan, loanPayoff } from "../finance.mjs";

test("non-numeric input never enters calculations", () => {
  assert.equal(amount("oops"), 0);
  assert.equal(monthlyBudget({ salary: "oops", rent: -100 }).remaining, 0);
});
test("paycheck and monthly budget stay internally consistent", () => {
  const p = monthlyBudget({ salary: 120000, effectiveTaxPercent: 25, retirementPercent: 10, premium: 200, rent: 2500, food: 400 });
  assert.equal(p.monthlyGross, 10000);
  assert.equal(p.retirement, 1000);
  assert.equal(p.estimatedTax, 2250);
  assert.equal(p.takeHome, 6550);
  assert.equal(p.remaining, 3650);
  assert.equal(p.emergencyTarget, 8700);
});
test("a signing bonus is first year only and relocation cost is one time", () => {
  const base = { salary: 90000, effectiveTaxPercent: 20, retirementPercent: 0, rent: 1500 };
  const r = compareOffers({ ...base, signingBonus: 12000, relocationCost: 5000 }, base);
  assert.ok(r.a.firstYearCushion > r.b.firstYearCushion);
  assert.equal(r.a.ongoingMonthlyCushion, r.b.ongoingMonthlyCushion);
  assert.equal(Math.round(r.a.firstYearCushion - r.b.firstYearCushion), 4600);
});
test("health plan premiums and out of pocket exposure are separate", () => {
  const plan = { monthlyPremium: 200, deductible: 1500, coinsurancePercent: 20, oopMax: 4000 };
  assert.equal(estimateHealthPlan(plan, 0).annualTotal, 2400);
  assert.equal(estimateHealthPlan(plan, 2500).annualTotal, 4100);
  assert.equal(estimateHealthPlan(plan, 100000).annualTotal, 6400);
});
test("loan payoff handles zero interest and impossible payments", () => {
  assert.deepEqual(loanPayoff(1200, 0, 100), { feasible: true, months: 12, interest: 0 });
  assert.equal(loanPayoff(10000, 12, 50).feasible, false);
  assert.equal(loanPayoff(0, 0, 0).months, 0);
});
test("extreme percentages are clamped", () => {
  const p = monthlyBudget({ salary: 1200, effectiveTaxPercent: 999, retirementPercent: -100 });
  assert.equal(p.estimatedTax, 75);
  assert.equal(p.retirement, 0);
});
