import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

/**
 * パスワードをハッシュ化する。
 * ランダム 16-byte salt を生成し scrypt で導出した結果を `salt(hex):hash(hex)` 形式で返す。
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString('hex')}:${hash.toString('hex')}`;
}

/**
 * パスワードを検証する。
 * stored から salt と hash を取り出し、plain を同じ salt で導出して定数時間比較する。
 * 形式不正の場合は false を返す。
 */
export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  try {
    const colonIndex = stored.indexOf(':');
    if (colonIndex === -1) return false;
    const saltHex = stored.slice(0, colonIndex);
    const hashHex = stored.slice(colonIndex + 1);
    if (!saltHex || !hashHex) return false;

    const salt = Buffer.from(saltHex, 'hex');
    const storedHash = Buffer.from(hashHex, 'hex');
    const derivedHash = (await scryptAsync(plain, salt, KEY_LENGTH)) as Buffer;

    if (storedHash.length !== derivedHash.length) return false;
    return timingSafeEqual(storedHash, derivedHash);
  } catch {
    return false;
  }
}
