export function redactSensitiveString(
  input: unknown,
  options?: Readonly<{ maxLength?: number }>
): Readonly<{ value: string; redactionCount: number; sensitiveMaterialRemoved: boolean }>;
export function sanitizeProcessOutput(
  input: unknown,
  options?: Readonly<{ maxLength?: number }>
): Readonly<{ tail: string; redactionCount: number; sensitiveMaterialRemoved: boolean }>;
export function redactEvidence<T>(value: T): T & {
  readonly evidencePrivacy?: Readonly<{
    redactionVersion: string;
    redactionCount: number;
    sensitiveMaterialRemoved: boolean;
  }>;
};
