const host = process.env.FIREBASE_AUTH_EMULATOR_HOST;
if (!host) throw new Error("FIREBASE_AUTH_EMULATOR_HOST was not injected by Firebase CLI");
const response = await fetch(`http://${host}/emulator/v1/projects/amiyo-app/config`, { signal: AbortSignal.timeout(5_000) });
if (!response.ok) throw new Error(`Firebase Auth Emulator probe failed (${response.status})`);
console.log(JSON.stringify({ service: "firebase-auth-emulator", status: "ok", host }));
