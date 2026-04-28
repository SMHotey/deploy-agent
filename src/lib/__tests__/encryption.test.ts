import { decrypt, encrypt } from '../encryption';

describe('encryption', () => {
  const testKey = '12345678901234567890123456789012'; // 32 bytes

  it('should encrypt and decrypt correctly', () => {
    const plaintext = 'my-secret-token-12345';
    const encrypted = encrypt(plaintext, testKey);
    
    expect(encrypted).toHaveProperty('encrypted');
    expect(encrypted).toHaveProperty('iv');
    expect(encrypted).toHaveProperty('authTag');
    expect(encrypted.encrypted).not.toBe(plaintext);
    
    const decrypted = decrypt(encrypted, testKey);
    expect(decrypted).toBe(plaintext);
  });

  it('should produce different IVs for same input', () => {
    const plaintext = 'test-data';
    const enc1 = encrypt(plaintext, testKey);
    const enc2 = encrypt(plaintext, testKey);
    
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.encrypted).not.toBe(enc2.encrypted);
  });

  it('should fail to decrypt with wrong key', () => {
    const plaintext = 'secret';
    const encrypted = encrypt(plaintext, testKey);
    const wrongKey = 'abcdefghijklmnopqrstuvwxyz123456';
    
    expect(() => decrypt(encrypted, wrongKey)).toThrow();
  });

  it('should fail to decrypt with tampered auth tag', () => {
    const plaintext = 'secret';
    const encrypted = encrypt(plaintext, testKey);
    const tampered = { ...encrypted, authTag: '000000000000000000000000' };
    
    expect(() => decrypt(tampered, testKey)).toThrow();
  });
});
