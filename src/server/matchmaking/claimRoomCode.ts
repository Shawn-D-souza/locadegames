/**
 * Tries fresh random codes until the region server accepts one it does not already have.
 * The server checks and stores the code in one step, so two rooms never share a code.
 * Returns null only if every attempt collided.
 */
export async function claimRoomCode(
  generate: () => string,
  tryCreate: (code: string) => Promise<boolean>,
  maxAttempts: number,
): Promise<string | null> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const code = generate();
    if (await tryCreate(code)) return code;
  }
  return null;
}
