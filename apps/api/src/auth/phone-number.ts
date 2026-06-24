const NIGERIAN_MOBILE_PATTERN = /^234[789][01]\d{8}$/;

export function normalizeNigerianPhoneNumber(value: string): string {
  const digits = value.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const normalized = digits.startsWith("0") ? `234${digits.slice(1)}` : digits;

  if (!NIGERIAN_MOBILE_PATTERN.test(normalized)) {
    throw new Error("Phone number must be a valid Nigerian mobile number");
  }

  return normalized;
}
