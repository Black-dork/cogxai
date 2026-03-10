/**
 * Client-side encryption for memory content.
 *
 * Per-user key derivation from EVM private keys:
 *   privateKey (32 bytes hex)
 *     → HKDF-SHA256(key, salt="cogxai-cortex-v1", info="memory-encryption")
 *     → 32-byte symmetric key
 *     → nacl.secretbox (XSalsa20-Poly1305)
 *
 * Only the `content` field is encrypted. Summary, tags, concepts, embeddings,
 * and all metadata stay plaintext for search and scoring.
 */

import nacl from 'tweetnacl';
import { ethers } from 'ethers';
import { hkdf } from 'crypto';
import { promisify } from 'util';
import { createChildLogger } from './logger';

const log = createChildLogger('encryption');

const hkdfAsync = promisify(hkdf);

const HKDF_SALT = 'cogxai-cortex-v1';
const HKDF_INFO = 'memory-encryption';
const NONCE_LENGTH = nacl.secretbox.nonceLength; // 24 bytes

let encryptionKey: Uint8Array | null = null;
let encryptionPubkey: string | null = null;

/**
 * Derive a symmetric encryption key from an EVM private key.
 * Accepts hex string (with/without 0x) or raw 32-byte Uint8Array.
 * Stores the derived key and wallet address for the session.
 */
export async function configureEncryption(privateKey: string | Uint8Array): Promise<void> {
  let keyBytes: Uint8Array;
  let walletAddress: string;

  if (typeof privateKey === 'string') {
    const hex = privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`;
    const wallet = new ethers.Wallet(hex);
    walletAddress = wallet.address;
    keyBytes = ethers.getBytes(hex);
  } else if (privateKey instanceof Uint8Array && privateKey.length === 32) {
    const hex = ethers.hexlify(privateKey);
    const wallet = new ethers.Wallet(hex);
    walletAddress = wallet.address;
    keyBytes = privateKey;
  } else {
    throw new Error('Encryption requires a 32-byte private key (hex string or Uint8Array)');
  }

  // Derive 32-byte symmetric key via HKDF-SHA256
  const derived = await hkdfAsync('sha256', keyBytes, HKDF_SALT, HKDF_INFO, 32);
  encryptionKey = new Uint8Array(derived as ArrayBuffer);

  // Store wallet address as the public identifier for encrypted memories
  encryptionPubkey = walletAddress.toLowerCase();

  log.info({ address: encryptionPubkey.slice(0, 10) + '...' }, 'Encryption configured');
}

/**
 * Check if encryption is active for this session.
 */
export function isEncryptionEnabled(): boolean {
  return encryptionKey !== null;
}

/**
 * Get the wallet address of the active encryption key.
 */
export function getEncryptionPubkey(): string | null {
  return encryptionPubkey;
}

/**
 * Encrypt plaintext content.
 * Returns base64(nonce[24] || ciphertext).
 */
export function encryptContent(plaintext: string): string {
  if (!encryptionKey) {
    throw new Error('Encryption not configured. Call configureEncryption() first.');
  }

  const nonce = nacl.randomBytes(NONCE_LENGTH);
  const messageBytes = new TextEncoder().encode(plaintext);
  const ciphertext = nacl.secretbox(messageBytes, nonce, encryptionKey);

  const combined = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  combined.set(nonce, 0);
  combined.set(ciphertext, NONCE_LENGTH);

  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypt encrypted content.
 * Input: base64(nonce[24] || ciphertext).
 * Returns plaintext or null if decryption fails.
 */
export function decryptContent(encrypted: string): string | null {
  if (!encryptionKey) {
    return null;
  }

  try {
    const combined = Buffer.from(encrypted, 'base64');
    if (combined.length < NONCE_LENGTH + 1) {
      return null;
    }

    const nonce = combined.subarray(0, NONCE_LENGTH);
    const ciphertext = combined.subarray(NONCE_LENGTH);
    const plaintext = nacl.secretbox.open(ciphertext, nonce, encryptionKey);

    if (!plaintext) {
      return null;
    }

    return new TextDecoder().decode(plaintext);
  } catch {
    return null;
  }
}

/**
 * In-place decrypt memory content for a batch of memories.
 * Skips memories that are:
 *   - Not encrypted (encrypted !== true)
 *   - Encrypted by a different key (different wallet address)
 *   - Undecryptable (wrong key, corrupted — leaves content as-is)
 */
export function decryptMemoryBatch<T extends { content: string; encrypted?: boolean; encryption_pubkey?: string | null }>(
  memories: T[]
): T[] {
  if (!encryptionKey || !encryptionPubkey) return memories;

  for (const mem of memories) {
    if (!mem.encrypted) continue;

    if (mem.encryption_pubkey && mem.encryption_pubkey !== encryptionPubkey) {
      log.debug({ memPubkey: mem.encryption_pubkey?.slice(0, 12) }, 'Skipping memory encrypted by different key');
      continue;
    }

    const decrypted = decryptContent(mem.content);
    if (decrypted !== null) {
      mem.content = decrypted;
    } else {
      log.warn('Failed to decrypt memory content — wrong key or corrupted data');
    }
  }

  return memories;
}
