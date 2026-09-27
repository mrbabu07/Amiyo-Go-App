import assert from "node:assert/strict";
import test from "node:test";
import { captureWebDocumentQr, printWebDocument } from "./web-document";

function replaceDocument(value: unknown) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, "document");
  Object.defineProperty(globalThis, "document", { configurable: true, value });
  return () => {
    if (previous) Object.defineProperty(globalThis, "document", previous);
    else Reflect.deleteProperty(globalThis, "document");
  };
}

test("web export rejects a missing QR instead of printing an incomplete document", async () => {
  const restore = replaceDocument({ getElementById: () => null });
  try { await assert.rejects(captureWebDocumentQr("missing"), /still loading/); }
  finally { restore(); }
});

test("web printing waits for QR decoding and isolates the page in a sandboxed frame", async () => {
  const calls: string[] = [];
  const attributes: Record<string, string> = {};
  let afterPrint = () => {};
  const frame = {
    title: "", srcdoc: "", isConnected: true, style: { cssText: "" }, onload: async () => {},
    setAttribute: (name: string, value: string) => { attributes[name] = value; },
    remove: () => { frame.isConnected = false; calls.push("removed"); },
    contentDocument: { title: "", images: [{ decode: async () => { calls.push("decoded"); } }] },
    contentWindow: {
      focus: () => {},
      addEventListener: (event: string, callback: () => void) => { assert.equal(event, "afterprint"); afterPrint = callback; },
      print: () => { calls.push("printed"); afterPrint(); }
    }
  };
  const restore = replaceDocument({ createElement: (tag: string) => { assert.equal(tag, "iframe"); return frame; }, body: { appendChild: () => { void frame.onload(); } } });
  try {
    await printWebDocument("<html><body>Package</body></html>", "Packing slips");
    assert.deepEqual(calls, ["decoded", "printed", "removed"]);
    assert.equal(attributes.sandbox, "allow-same-origin allow-modals");
    assert.equal(frame.contentDocument.title, "Packing slips");
    assert.match(frame.srcdoc, /Package/);
  } finally { restore(); }
});

test("a broken QR image rejects printing and removes the temporary frame", async () => {
  let removed = false;
  let printed = false;
  const frame = {
    style: {}, onload: async () => {}, isConnected: true, setAttribute: () => {},
    remove: () => { removed = true; },
    contentDocument: { images: [{ decode: async () => { throw new Error("broken image"); } }] },
    contentWindow: { print: () => { printed = true; } }
  };
  const restore = replaceDocument({ createElement: () => frame, body: { appendChild: () => { void frame.onload(); } } });
  try {
    await assert.rejects(printWebDocument("<html></html>", "Label"), /broken image/);
    assert.equal(removed, true);
    assert.equal(printed, false);
  } finally { restore(); }
});
