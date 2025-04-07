import * as crypto from 'crypto';

const AES_SECRET = process.env.AES_SECRET_KEY || 'my-super-secret-key-32char'; // Phải đúng 32 ký tự

const IV_LENGTH = 16;

function getAesKey(): Buffer {
  return Buffer.from(AES_SECRET.padEnd(32, '0').slice(0, 32));
}
export function encryptAES(payload: object): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = getAesKey();

  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const json = JSON.stringify(payload);

  let encrypted = cipher.update(json);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

export function decryptAES(encryptedText: string): any {
  const [ivHex, encryptedHex] = encryptedText.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encryptedTextBuffer = Buffer.from(encryptedHex, 'hex');
  const key = getAesKey();

  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encryptedTextBuffer);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return JSON.parse(decrypted.toString());
}
