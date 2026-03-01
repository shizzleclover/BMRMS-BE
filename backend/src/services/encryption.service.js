import CryptoJS from 'crypto-js';
import crypto from 'crypto';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Encrypt data using AES-256-GCM
 */
export const encryptData = (data) => {
  try {
    if (!config.encryption.key) {
      throw new AppError('Encryption key not configured', 500);
    }

    // Convert data to string if it's an object
    const dataString = typeof data === 'string' ? data : JSON.stringify(data);

    // Encrypt using CryptoJS
    const encrypted = CryptoJS.AES.encrypt(dataString, config.encryption.key).toString();

    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new AppError('Failed to encrypt data', 500);
  }
};

/**
 * Decrypt data
 */
export const decryptData = (encryptedData) => {
  try {
    if (!config.encryption.key) {
      throw new AppError('Encryption key not configured', 500);
    }

    // Decrypt using CryptoJS
    const decrypted = CryptoJS.AES.decrypt(encryptedData, config.encryption.key);
    const decryptedString = decrypted.toString(CryptoJS.enc.Utf8);

    if (!decryptedString) {
      throw new Error('Decryption failed');
    }

    // Try to parse as JSON, otherwise return as string
    try {
      return JSON.parse(decryptedString);
    } catch {
      return decryptedString;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new AppError('Failed to decrypt data', 500);
  }
};

/**
 * Encrypt file buffer
 */
export const encryptFile = (fileBuffer) => {
  try {
    if (!config.encryption.key) {
      throw new AppError('Encryption key not configured', 500);
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(config.encryption.key, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);

    const encrypted = Buffer.concat([cipher.update(fileBuffer), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Combine iv, authTag, and encrypted data
    return Buffer.concat([iv, authTag, encrypted]);
  } catch (error) {
    console.error('File encryption error:', error);
    throw new AppError('Failed to encrypt file', 500);
  }
};

/**
 * Decrypt file buffer
 */
export const decryptFile = (encryptedBuffer) => {
  try {
    if (!config.encryption.key) {
      throw new AppError('Encryption key not configured', 500);
    }

    const algorithm = 'aes-256-gcm';
    const key = crypto.scryptSync(config.encryption.key, 'salt', 32);

    // Extract iv, authTag, and encrypted data
    const iv = encryptedBuffer.slice(0, 16);
    const authTag = encryptedBuffer.slice(16, 32);
    const encrypted = encryptedBuffer.slice(32);

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    return decrypted;
  } catch (error) {
    console.error('File decryption error:', error);
    throw new AppError('Failed to decrypt file', 500);
  }
};

/**
 * Generate hash for data integrity verification
 */
export const generateHash = (data) => {
  const dataString = typeof data === 'string' ? data : JSON.stringify(data);
  return crypto.createHash('sha256').update(dataString).digest('hex');
};

/**
 * Verify hash
 */
export const verifyHash = (data, hash) => {
  const computedHash = generateHash(data);
  return computedHash === hash;
};
