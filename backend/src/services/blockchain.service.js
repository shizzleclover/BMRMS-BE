import { ethers } from 'ethers';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { RECORD_CONTRACT_ABI, CONSENT_CONTRACT_ABI, AUDIT_CONTRACT_ABI } from '../config/abis.js';

let provider = null;
let wallet = null;

/**
 * Initialize blockchain provider and wallet
 */
const initializeBlockchain = () => {
  if (!config.blockchain.enabled) return;

  if (!provider) {
    try {
      provider = new ethers.JsonRpcProvider(config.blockchain.rpcUrl);

      if (config.blockchain.privateKey) {
        wallet = new ethers.Wallet(config.blockchain.privateKey, provider);
        console.log('✅ Blockchain wallet initialized');
      } else {
        console.warn('⚠️  No private key configured for blockchain transactions');
      }

      console.log('✅ Blockchain provider initialized');
    } catch (error) {
      console.error('❌ Failed to initialize blockchain:', error);
    }
  }
};

/**
 * Get contract instance
 */
const getContract = (contractAddress, abi) => {
  initializeBlockchain();

  if (!wallet) {
    throw new AppError('Blockchain wallet not configured', 500);
  }

  return new ethers.Contract(contractAddress, abi, wallet);
};

/**
 * Store medical record hash on blockchain
 */
export const storeRecordHash = async (recordId, patientId, ipfsHash, recordHash) => {
  try {
    if (!config.blockchain.enabled) {
      const mockTxHash = ethers.id(`${recordId}-${Date.now()}`);
      console.log(`📝 Record hash stored on blockchain (mock): ${mockTxHash}`);
      return {
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        recordHash,
        ipfsHash,
        timestamp: Date.now(),
      };
    }

    const contract = getContract(config.blockchain.contracts.record, RECORD_CONTRACT_ABI);
    const tx = await contract.storeRecord(recordId, ipfsHash, recordHash);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      recordHash,
      ipfsHash,
    };
  } catch (error) {
    console.error('Blockchain record storage error:', error);
    throw new AppError('Failed to store record on blockchain', 500);
  }
};

/**
 * Verify record hash on blockchain
 */
export const verifyRecordHash = async (recordId, recordHash) => {
  try {
    if (!config.blockchain.enabled) {
      console.log(`✅ Record hash verified on blockchain (mock): ${recordId}`);
      return {
        verified: true,
        recordId,
        recordHash,
        timestamp: Date.now(),
      };
    }

    const contract = getContract(config.blockchain.contracts.record, RECORD_CONTRACT_ABI);
    const storedHash = await contract.getRecordHash(recordId);

    return {
      verified: storedHash === recordHash,
      recordId,
      storedHash,
      providedHash: recordHash,
    };
  } catch (error) {
    console.error('Blockchain verification error:', error);
    throw new AppError('Failed to verify record on blockchain', 500);
  }
};

/**
 * Grant consent on blockchain
 */
export const grantConsentOnChain = async (consentId, patientId, doctorId, accessLevel) => {
  try {
    if (!config.blockchain.enabled) {
      const mockTxHash = ethers.id(`consent-${consentId}-${Date.now()}`);
      console.log(`✅ Consent granted on blockchain (mock): ${mockTxHash}`);
      return {
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        consentId,
        timestamp: Date.now(),
      };
    }

    const contract = getContract(config.blockchain.contracts.consent, CONSENT_CONTRACT_ABI);
    const tx = await contract.grantConsent(consentId, patientId, doctorId, accessLevel);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      consentId,
    };
  } catch (error) {
    console.error('Blockchain consent grant error:', error);
    throw new AppError('Failed to grant consent on blockchain', 500);
  }
};

/**
 * Revoke consent on blockchain
 */
export const revokeConsentOnChain = async (consentId) => {
  try {
    if (!config.blockchain.enabled) {
      const mockTxHash = ethers.id(`revoke-${consentId}-${Date.now()}`);
      console.log(`✅ Consent revoked on blockchain (mock): ${mockTxHash}`);
      return {
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        consentId,
        timestamp: Date.now(),
      };
    }

    const contract = getContract(config.blockchain.contracts.consent, CONSENT_CONTRACT_ABI);
    const tx = await contract.revokeConsent(consentId);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      consentId,
    };
  } catch (error) {
    console.error('Blockchain consent revoke error:', error);
    throw new AppError('Failed to revoke consent on blockchain', 500);
  }
};

/**
 * Check consent on blockchain
 */
export const checkConsentOnChain = async (consentId) => {
  try {
    if (!config.blockchain.enabled) {
      console.log(`✅ Consent checked on blockchain (mock)`);
      return {
        hasConsent: true,
        accessLevel: 'read',
        timestamp: Date.now(),
      };
    }

    const contract = getContract(config.blockchain.contracts.consent, CONSENT_CONTRACT_ABI);
    const [isActive, accessLevel] = await contract.checkConsent(consentId);

    return {
      hasConsent: isActive,
      accessLevel: accessLevel,
    };
  } catch (error) {
    console.error('Blockchain consent check error:', error);
    throw new AppError('Failed to check consent on blockchain', 500);
  }
};

/**
 * Log audit event on blockchain
 */
export const logAuditOnChain = async (action, userId, resourceId, resourceType) => {
  try {
    if (!config.blockchain.enabled) {
      const mockTxHash = ethers.id(`audit-${userId}-${Date.now()}`);
      console.log(`✅ Audit logged on blockchain (mock): ${mockTxHash}`);
      return {
        transactionHash: mockTxHash,
        blockNumber: Math.floor(Math.random() * 1000000),
        timestamp: Date.now(),
      };
    }

    // Only log critical events to save gas
    const criticalEvents = ['record_created', 'consent_granted', 'consent_revoked'];
    if (!criticalEvents.includes(action)) {
      return { skipped: true, reason: 'Not a critical event' };
    }

    const contract = getContract(config.blockchain.contracts.audit, AUDIT_CONTRACT_ABI);
    const tx = await contract.logEvent(action, userId, resourceId, resourceType);
    const receipt = await tx.wait();

    return {
      transactionHash: receipt.hash,
      blockNumber: receipt.blockNumber,
    };
  } catch (error) {
    console.error('Blockchain audit logging error:', error);
    // Don't throw error for audit logging failures to prevent disrupting main flows
    return { success: false, error: error.message };
  }
};

/**
 * Check blockchain connection
 */
export const checkBlockchainConnection = async () => {
  try {
    if (!config.blockchain.enabled) {
      return { connected: true, network: 'mock', mock: true };
    }

    initializeBlockchain();

    if (!provider) {
      return { connected: false, error: 'Provider not initialized' };
    }

    const network = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();

    return {
      connected: true,
      network: network.name,
      chainId: Number(network.chainId),
      blockNumber,
    };
  } catch (error) {
    console.error('Blockchain connection check failed:', error);
    return { connected: false, error: error.message };
  }
};
