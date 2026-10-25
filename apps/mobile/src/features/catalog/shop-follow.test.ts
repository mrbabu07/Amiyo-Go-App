import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const screen = readFileSync(new URL("./ShopScreen.tsx", import.meta.url), "utf8");
const api = readFileSync(new URL("./catalog.api.ts", import.meta.url), "utf8");
const library = readFileSync(new URL("./FollowedShopsScreen.tsx", import.meta.url), "utf8");

test("shop follow is persistent, account scoped and independent from seller chat", () => {
  assert.match(screen, /\["catalog", "shop-follow", identifier, user\?\.uid\]/);
  assert.match(screen, /setShopFollowing\(user, identifier, !follow\.data\?\.following\)/);
  assert.match(screen, /activeUid\.current !== uid/);
  assert.match(screen, /\["catalog", "followed-shops", uid\]/);
  assert.match(screen, /Follow shop/);
  assert.match(screen, /followerCount/);
  assert.match(api, /method: following \? "PUT" : "DELETE"/);
  assert.match(library, /\["catalog", "followed-shops", user\?\.uid\]/);
  assert.match(library, /Browse shops/);
});
