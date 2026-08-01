import assert from "node:assert/strict";
import test from "node:test";
import { ApiProblem } from "../../middleware/api-problem.js";
import { readBearerToken } from "./identity.middleware.js";

test("reads a case-insensitive bearer token", () => {
  assert.equal(readBearerToken("bearer token-value"), "token-value");
});

test("rejects missing and malformed authorization", () => {
  for (const value of [undefined, "Basic abc", "Bearer "]) {
    assert.throws(() => readBearerToken(value), (error) => error instanceof ApiProblem && error.code === "AUTHENTICATION_REQUIRED");
  }
});
