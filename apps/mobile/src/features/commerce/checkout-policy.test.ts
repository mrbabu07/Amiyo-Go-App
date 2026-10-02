import assert from "node:assert/strict";
import test from "node:test";
import { publicPlatformSettingsSchema } from "@amiyo/contracts";
import { checkoutPolicyError, paymentMethodEnabled } from "./checkout-policy";

function settings() {
  return publicPlatformSettingsSchema.parse({
    featureFlags: { sellerRegistration: true, reviews: true, questions: true, flashSales: true, loyalty: true, voiceSearch: true, googleLogin: true },
    paymentMethods: { cod: { enabled: true }, sslcommerz: { enabled: true }, bkashManual: { enabled: true } },
    maintenanceMode: { enabled: false, message: "Scheduled maintenance" }, version: 1
  });
}
const address = { upazila: "Savar", unionName: "Birulia" };

test("missing settings never enable payment or checkout", () => {
  assert.equal(paymentMethodEnabled(undefined, "COD"), false);
  assert.match(checkoutPolicyError(undefined, "COD", true, address)!, /settings/);
});

test("payment choices follow their admin toggles", () => {
  const config = settings();
  config.paymentMethods.cod.enabled = false;
  assert.equal(paymentMethodEnabled(config, "COD"), false);
  assert.equal(paymentMethodEnabled(config, "SSLCOMMERZ"), true);
  config.paymentMethods.bkashManual.enabled = false;
  assert.equal(paymentMethodEnabled(config, "BKASH"), false);
  assert.equal(paymentMethodEnabled(config, "NAGAD"), false);
  assert.match(checkoutPolicyError(config, "COD", true, address)!, /available payment/);
});

test("COD confirmation is mandatory only under the configured village rule", () => {
  const config = settings();
  assert.match(checkoutPolicyError(config, "COD", false, address)!, /phone/);
  assert.equal(checkoutPolicyError(config, "COD", true, address), null);
  assert.equal(checkoutPolicyError(config, "SSLCOMMERZ", false, address), null);
  config.villageOperations.requireCodPhoneConfirmation = false;
  assert.equal(checkoutPolicyError(config, "COD", false, address), null);
});

test("village geography and paused rural delivery match server requirements", () => {
  const config = settings();
  assert.match(checkoutPolicyError(config, "COD", true, { upazila: " ", unionName: " " })!, /Upazila/);
  config.villageOperations.ruralDeliveryEnabled = false;
  assert.match(checkoutPolicyError(config, "COD", true, address)!, /paused/);
  config.villageOperations.enabled = false;
  assert.equal(checkoutPolicyError(config, "COD", false, {}), null);
});

test("maintenance blocks otherwise valid checkout", () => {
  const config = settings();
  config.maintenanceMode.enabled = true;
  assert.equal(checkoutPolicyError(config, "COD", true, address), "Scheduled maintenance");
});
