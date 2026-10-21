export function releaseIdentity(environment: Record<string, string | undefined> = process.env) {
  const candidate = environment.RELEASE_SHA || environment.RENDER_GIT_COMMIT || environment.GITHUB_SHA;
  return candidate && /^[a-f0-9]{7,64}$/i.test(candidate) ? candidate.toLowerCase() : "unknown";
}
