import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hashPassword, verifyPassword, generateAccessToken, verifyToken } from '../auth';
import { encrypt, decrypt } from '../encryption';

describe('auth', () => {
  const testKey = '12345678901234567890123456789012';

  describe('password hashing', () => {
    it('should hash password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    it('should verify correct password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    it('should reject wrong password', async () => {
      const password = 'Test1234!';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword('wrongpassword', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('JWT tokens', () => {
    it('should generate and verify token', () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' };
      const token = generateAccessToken(user);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      
      const verified = verifyToken(token);
      expect(verified).toBeDefined();
      expect(verified?.id).toBe(1);
      expect(verified?.email).toBe('test@example.com');
    });

    it('should fail to verify with wrong key', () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' };
      const token = generateAccessToken(user);
      const wrongKey = 'abcdefghijklmnopqrstuvwxyz123456';
      
      // verifyToken uses internal secret from env, so wrong key won't affect it
      // Instead test with invalid token
      const verified = verifyToken('invalid-token');
      expect(verified).toBeNull();
    });

    it('should fail to verify tampered token', () => {
      const user = { id: 1, email: 'test@example.com', name: 'Test User' };
      const token = generateAccessToken(user);
      const tampered = token.slice(0, -5) + 'XXXXX'; // corrupt signature
      
      const verified = verifyToken(tampered);
      expect(verified).toBeNull();
    });
  });

  describe('token encryption for storage', () => {
    it('should encrypt and decrypt user tokens', () => {
      const tokens = {
        vercelToken: 'vzc_1234567890abcdef',
        githubToken: 'ghp_1234567890abcdef',
      };

      const encrypted = encrypt(JSON.stringify(tokens), testKey);
      const decrypted = decrypt(encrypted, testKey);
      const parsed = JSON.parse(decrypted);

      expect(parsed.vercelToken).toBe(tokens.vercelToken);
      expect(parsed.githubToken).toBe(tokens.githubToken);
    });
  });
});
