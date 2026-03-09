// /lib/validation/nigeria.ts

export function normalizeNigerianPhone(input: string): string {
  const value = input.replace(/\s+/g, "").replace(/[-()]/g, "");

  if (/^0\d{10}$/.test(value)) {
    return `+234${value.slice(1)}`;
  }

  if (/^234\d{10}$/.test(value)) {
    return `+${value}`;
  }

  if (/^\+234\d{10}$/.test(value)) {
    return value;
  }

  throw new Error(
    "Enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678)."
  );
}

export function isValidNigerianPhone(input: string): boolean {
  try {
    normalizeNigerianPhone(input);
    return true;
  } catch {
    return false;
  }
}

export function normalizeNin(input: string): string {
  const value = input.replace(/\D/g, "");

  if (!/^\d{11}$/.test(value)) {
    throw new Error("NIN must be exactly 11 digits.");
  }

  return value;
}

export function isValidNin(input: string): boolean {
  return /^\d{11}$/.test(input.replace(/\D/g, ""));
}