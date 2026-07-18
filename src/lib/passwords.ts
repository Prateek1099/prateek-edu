const MINIMUM_PASSWORD_LENGTH = 10;

export function validatePassword(value: string): string | null {
  if (value.length < MINIMUM_PASSWORD_LENGTH) {
    return `Password must be at least ${MINIMUM_PASSWORD_LENGTH} characters.`;
  }
  if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
    return "Password must include uppercase, lowercase, and a number.";
  }
  return null;
}
