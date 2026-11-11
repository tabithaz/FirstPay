# FirstPay

**Make your first paycheck make sense.** A privacy-first interactive financial literacy app for college students and new graduates.

## What works today
- **Paycheck & budget studio:** salary, estimated effective tax rate, retirement contributions, premiums, living costs, and monthly cushion.
- **Offer Battle:** side-by-side first-year compensation and city cost comparison, including signing bonuses and relocation expenses.
- **Benefits Lab:** two hypothetical health insurance plans with premiums, deductibles, coinsurance, and out-of-pocket maximums.
- **Money Missions:** interactive financial literacy scenarios with explanations.
- **Local save:** scenarios stay in your browser, with export/import supported.
- Responsive, keyboard-friendly, screen-reader-conscious design with no accounts, trackers, or external dependencies.

## Run
Open `index.html` in a modern browser. For the full recommended experience, run:
```bash
python3 -m http.server 8000
# visit http://localhost:8000
```

## Test
```bash
node --test tests/*.test.mjs
```
Requires Node 20+. No installation required.

## Deployment
Repository Settings → Pages → Build and deployment → Deploy from a branch → `main` / `/ (root)`. The site is then normally available at https://tabithaz.github.io/FirstPay/.

## Accuracy and scope
**Educational planning tool, not tax, financial, investment, insurance, or legal advice.**
- Effective income tax is a **user-adjustable illustrative percentage**, not an IRS withholding calculation. Actual income, filing status, taxes, annual limits, location, and deductions differ.
- Salary, bonuses, employer match, and benefits are handled as simplified scenarios. Offer comparisons are *estimates*, not compensation advice.
- Insurance simulations assume eligible in-network allowed expenses with one deductible/coinsurance structure, and ignore networks, copays, prescription tiers, plan-specific rules, and non-covered care.
- The app does not store bank credentials or connect to financial institutions.
- Only example/demo data should be used for public GitHub issues or screenshots.

## Engineering roadmap
1. Versioned tax rules with official-source fixtures and edge-case tests.
2. User-defined scenario profiles; migrations and local encrypted export.
3. React + TypeScript frontend and FastAPI backend with PostgreSQL for opt-in sync.
4. CI integration tests, accessibility audits, containerized deployment, and OpenTelemetry.
5. User research with graduating students; explainable financial calculations.

Built for real people first, with deliberate space to grow into a rigorous full-stack product.
