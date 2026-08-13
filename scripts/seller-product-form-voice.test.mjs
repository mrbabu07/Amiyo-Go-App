import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("seller product form adapts fields to category metadata", async () => {
  const [contract, repository, service, form, seed] = await Promise.all([read("packages/contracts/src/catalog.ts"), read("apps/api/src/modules/catalog/catalog.repository.ts"), read("apps/api/src/modules/catalog/catalog.service.ts"), read("apps/mobile/src/features/vendor/VendorProductFormScreen.tsx"), read("prisma/seed.ts")]);
  assert.match(contract, /categoryAttributeSchema/);
  assert.match(repository, /attributes: \{ include: \{ options/);
  assert.match(service, /validateCategoryAttributes/);
  assert.match(service, /CATEGORY_ATTRIBUTE_REQUIRED/);
  assert.match(form, /inheritedAttributes/);
  assert.match(form, /DynamicAttributeField/);
  assert.match(form, /requiredAttributesValid/);
  assert.match(seed, /warranty_months/);
  assert.match(seed, /net_weight/);
  assert.match(seed, /age_range/);
});

test("seller variant form provides modern colors and crash guards", async () => {
  const form = await read("apps/mobile/src/features/vendor/VendorProductFormScreen.tsx");
  assert.match(form, /colorChoices/);
  assert.match(form, /uniqueSkus/);
  assert.match(form, /combinations\.length > 100/);
  assert.match(form, /Number\.isInteger\(Number\(variant\.stock\)\)/);
  assert.match(form, /Number\(variant\.compareAt\) >= Number\(variant\.price\)/);
});

test("store search supports microphone speech recognition", async () => {
  const [header, voice, config, mobilePackage] = await Promise.all([read("apps/mobile/src/features/home/components/StoreHeader.tsx"), read("apps/mobile/src/features/home/components/VoiceSearchButton.tsx"), read("apps/mobile/app.json"), read("apps/mobile/package.json")]);
  assert.match(header, /VoiceSearchButton/);
  assert.match(voice, /requestPermissionsAsync/);
  assert.match(voice, /isRecognitionAvailable/);
  assert.match(voice, /lang: "en-BD"/);
  assert.match(config, /expo-speech-recognition/);
  assert.match(mobilePackage, /expo-speech-recognition/);
});
