import crypto from "node:crypto";

const ITERATIONS = 120000;
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512")
    .toString("hex");

  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash || !storedHash.includes(":")) {
    return false;
  }

  const [salt, hash] = storedHash.split(":");
  const comparisonHash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, "sha512")
    .toString("hex");

  const storedBuffer = Buffer.from(hash, "hex");
  const comparisonBuffer = Buffer.from(comparisonHash, "hex");
  return storedBuffer.length === comparisonBuffer.length && crypto.timingSafeEqual(storedBuffer, comparisonBuffer);
}

export function hashSessionToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
