import assert from "node:assert/strict";
import test from "node:test";
import { detectMime } from "./media.processor.js";

test("media processor detects approved file signatures", () => { assert.equal(detectMime(Buffer.from([0xff, 0xd8, 0xff, 0x00])), "image/jpeg"); assert.equal(detectMime(Buffer.from("%PDF-1.7")), "application/pdf"); assert.equal(detectMime(Buffer.from("not-media")), null); });
