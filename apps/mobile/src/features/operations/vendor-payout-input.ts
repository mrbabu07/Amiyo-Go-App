export function payoutAmountMinor(amount: string, availableMinor: string): string | null {
  const normalized = amount.trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized) || !/^-?\d+$/.test(availableMinor)) return null;
  const [whole, fractional = ""] = normalized.split(".");
  const minor = BigInt(whole) * 100n + BigInt(fractional.padEnd(2, "0"));
  return minor > 0n && minor <= BigInt(availableMinor) ? String(minor) : null;
}

export function payoutMinorToMajorInput(amountMinor: string): string {
  if (!/^\d+$/.test(amountMinor)) return "";
  const padded = amountMinor.padStart(3, "0");
  const whole = padded.slice(0, -2).replace(/^0+(?=\d)/, "");
  const fractional = padded.slice(-2).replace(/0+$/, "");
  return fractional ? `${whole}.${fractional}` : whole;
}

export function selectPayoutBank(accounts: readonly { id: string; isDefault: boolean }[], selectedId: string): string {
  if (selectedId) return accounts.some((account) => account.id === selectedId) ? selectedId : "";
  return accounts.find((account) => account.isDefault)?.id ?? accounts[0]?.id ?? "";
}
