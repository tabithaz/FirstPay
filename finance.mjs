// FirstPay domain logic: deterministic, dependency-free calculations.
export function amount(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, amount(value)));
}
export function usd(value) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount(value));
}
export function monthlyBudget(input = {}) {
  const salary = clamp(input.salary, 0, 10000000);
  const bonus = clamp(input.bonus, 0, 10000000);
  const retirementPercent = clamp(input.retirementPercent, 0, 100);
  const effectiveTaxPercent = clamp(input.effectiveTaxPercent, 0, 100);
  const monthlyGross = (salary + bonus) / 12;
  const retirement = (salary / 12) * retirementPercent / 100;
  // A planning assumption, NOT tax withholding or a tax return calculation.
  const estimatedTax = Math.max(0, monthlyGross - retirement) * effectiveTaxPercent / 100;
  const premium = clamp(input.premium, 0, 100000);
  // Preserve a negative result when premiums exceed income so shortfalls remain visible.
  const takeHome = monthlyGross - retirement - estimatedTax - premium;
  const expenses = ["rent", "utilities", "food", "transport", "debt", "other"].reduce(
    (sum, key) => sum + clamp(input[key], 0, 100000), 0
  );
  const remaining = takeHome - expenses;
  const emergencyMonths = clamp(input.emergencyMonths ?? 3, 1, 12);
  return { monthlyGross, retirement, estimatedTax, premium, takeHome, expenses, remaining,
    savingsRate: takeHome > 0 ? remaining / takeHome : 0,
    emergencyTarget: expenses * emergencyMonths };
}
export function compareOffers(a, b) {
  function calculate(offer) {
    const salary = clamp(offer.salary, 0, 10000000);
    const signingBonus = clamp(offer.signingBonus, 0, 10000000);
    const relocationCost = clamp(offer.relocationCost, 0, 10000000);
    const budget = monthlyBudget({ ...offer, salary, bonus: signingBonus });
    const firstYearCushion = budget.remaining * 12 - relocationCost;
    const ongoing = monthlyBudget({ ...offer, salary, bonus: 0 });
    return { ...budget, firstYearCushion, ongoingMonthlyCushion: ongoing.remaining,
      monthlyFirstYearCushion: firstYearCushion / 12 };
  }
  return { a: calculate(a), b: calculate(b) };
}
export function estimateHealthPlan(plan = {}, eligibleCharges = 0) {
  const premium = clamp(plan.monthlyPremium, 0, 100000);
  const deductible = clamp(plan.deductible, 0, 1000000);
  const coinsurance = clamp(plan.coinsurancePercent, 0, 100) / 100;
  const oopMax = clamp(plan.oopMax, 0, 1000000);
  const charges = clamp(eligibleCharges, 0, 100000000);
  const beforeDeductible = Math.min(charges, deductible);
  const afterDeductible = Math.max(0, charges - deductible);
  const uncappedOutOfPocket = beforeDeductible + afterDeductible * coinsurance;
  const outOfPocket = Math.min(uncappedOutOfPocket, oopMax);
  return { annualPremium: premium * 12, outOfPocket, annualTotal: premium * 12 + outOfPocket };
}
export function loanPayoff(principal, annualRatePercent, monthlyPayment) {
  let balance = clamp(principal, 0, 100000000);
  const rate = clamp(annualRatePercent, 0, 100) / 1200;
  const payment = clamp(monthlyPayment, 0, 10000000);
  if (balance === 0) return { feasible: true, months: 0, interest: 0 };
  if (payment <= balance * rate) return { feasible: false, months: null, interest: null };
  let interest = 0;
  for (let months = 1; months <= 1200; months++) {
    const charge = balance * rate;
    interest += charge;
    balance = Math.max(0, balance + charge - payment);
    if (balance < 0.005) return { feasible: true, months, interest };
  }
  return { feasible: false, months: null, interest: null };
}
