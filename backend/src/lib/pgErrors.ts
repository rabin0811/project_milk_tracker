export function pgErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

export function isUniqueViolation(error: unknown): boolean {
  return pgErrorCode(error) === '23505';
}

export function constraintName(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'constraint' in error) {
    const constraint = (error as { constraint?: unknown }).constraint;
    return typeof constraint === 'string' ? constraint : null;
  }
  return null;
}
