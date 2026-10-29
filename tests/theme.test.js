import test from "node:test";
import assert from "node:assert/strict";
import { resolveTheme } from "../src/theme.js";

test("an explicit device theme wins over the operating system", () => {
  assert.equal(resolveTheme("light", true), "light");
  assert.equal(resolveTheme("dark", false), "dark");
});

test("missing and invalid preferences follow the operating system", () => {
  for (const value of [null, undefined, "system", "invalid", "DARK"]) {
    assert.equal(resolveTheme(value, true), "dark");
    assert.equal(resolveTheme(value, false), "light");
  }
});
