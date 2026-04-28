import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 64;

export type EncryptedValue = { encrypted: string; iv: string; authTag: string; salt: string };
export type EncryptedEnvVars = Record<string, EncryptedValue>;

/**
 * Encrypts a value using AES-256-GCM
 */
export function encrypt(text: string, encryptionKey: string): EncryptedValue {
  const salt = crypto.randomBytes(SALT_LENGTH);
  const key = crypto.scryptSync(encryptionKey, salt, 32);
  const iv = crypto.randomBytes(IV_LENGTH);
  
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    authTag: authTag.toString('hex'),
    salt: salt.toString('hex'),
  };
}

/**
 * Decrypts a value using AES-256-GCM
 */
export function decrypt(
  encryptedData: EncryptedValue,
  encryptionKey: string
): string {
  const { encrypted, iv, authTag, salt } = encryptedData;
  
  const saltBuffer = Buffer.from(salt, 'hex');
  const key = crypto.scryptSync(encryptionKey, saltBuffer, 32);
  const ivBuffer = Buffer.from(iv, 'hex');
  const authTagBuffer = Buffer.from(authTag, 'hex');
  
  const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
  decipher.setAuthTag(authTagBuffer);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}

/**
 * Encrypts an object of environment variables
 */
export function encryptEnvVars(
  envVars: Record<string, string>,
  encryptionKey: string
): EncryptedEnvVars {
  const result: EncryptedEnvVars = {};
  
  for (const [key, value] of Object.entries(envVars)) {
    result[key] = encrypt(value, encryptionKey);
  }
  
  return result;
}

/**
 * Decrypts an object of environment variables
 */
export function decryptEnvVars(
  encryptedEnvVars: EncryptedEnvVars,
  encryptionKey: string
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(encryptedEnvVars)) {
    result[key] = decrypt(value, encryptionKey);
  }
  
  return result;
}

/**
 * Generates a secure random encryption key
 */
export function generateEncryptionKey(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}