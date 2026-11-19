import test from "node:test";
import assert from "node:assert/strict";
import { amount, monthlyBudget } from "../finance.mjs";

test("non-scalar inputs never enter financial calculations", () => {
  for (const value of [[], [12], {}, { valueOf: () => 12 }, new Date(0), 12n, Symbol("x")]) {
    assert.equal(amount(value, 7), 7);
  }
  assert.equal(monthlyBudget({ salary: [120000], rent: [1500] }).remaining, 0);
});

test("ordinary numeric values remain supported", () => {
  for (const [value, expected] of [[12, 12], ["12.5", 12.5], ["  -3 ", -3], ["", 7], [Infinity, 7]]) {
    assert.equal(amount(value, 7), expected);
  }
});
