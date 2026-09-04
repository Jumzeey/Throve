const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  '12345678',
  '123456789',
  'qwerty123',
  'letmein1',
  'welcome1',
  'throve123',
  'abcdefg1',
]);

export type PasswordRequirementId = 'length' | 'upper' | 'lower' | 'number' | 'special';

export type PasswordRequirement = {
  id: PasswordRequirementId;
  label: string;
  met: boolean;
};

export function getPasswordRequirements(password: string): PasswordRequirement[] {
  return [
    { id: 'length', label: 'At least 8 characters', met: password.length >= 8 },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

/** 0 weak → 3 strong */
export function passwordStrengthScore(password: string): 0 | 1 | 2 | 3 {
  const requirements = getPasswordRequirements(password);
  const met = requirements.filter((r) => r.met).length;
  if (!password || met <= 2) return 0;
  if (met === 3) return 1;
  if (met === 4) return 2;
  return 3;
}

export function passwordStrengthLabel(score: 0 | 1 | 2 | 3): string {
  if (score <= 0) return 'Weak';
  if (score === 1) return 'Fair';
  if (score === 2) return 'Good';
  return 'Strong';
}

export function validatePassword(password: string): string | null {
  const unmet = getPasswordRequirements(password).filter((r) => !r.met);
  if (unmet.length) {
    return `Password must include: ${unmet.map((r) => r.label.toLowerCase()).join(', ')}.`;
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    return 'Choose a stronger password that is not commonly used.';
  }
  return null;
}
