import { create } from 'ipfs-http-client';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

let ipfsClient = null;

/**
 * Initialize IPFS client
 */
const getIPFSClient = () => {
  if (!ipfsClient) {
    try {
      ipfsClient = create({
        host: config.ipfs.host,
        port: config.ipfs.port,
        protocol: config.ipfs.protocol,
      });
      console.log('✅ IPFS client initialized');
    } catch (error) {
      console.error('❌ Failed to initialize IPFS client:', error);
      throw new AppError('IPFS service unavailable', 503);
    }
  }
  return ipfsClient;
};

/**
 * Upload file to IPFS
 */
export const uploadToIPFS = async (fileBuffer, metadata = {}) => {
  try {
    const client = getIPFSClient();

    // Add file to IPFS
    const result = await client.add(fileBuffer, {
      progress: (prog) => console.log(`IPFS upload progress: ${prog}`),
    });

    const ipfsHash = result.path;

    console.log(`✅ File uploaded to IPFS: ${ipfsHash}`);

    return {
      ipfsHash,
      size: result.size,
      gateway: `${config.ipfs.gateway}${ipfsHash}`,
      metadata,
    };
  } catch (error) {
    console.error('IPFS upload error:', error);
    throw new AppError('Failed to upload file to IPFS', 500);
  }
};

/**
 * Retrieve file from IPFS
 */
export const retrieveFromIPFS = async (ipfsHash) => {
  try {
    const client = getIPFSClient();

    // Get file from IPFS
    const chunks = [];
    for await (const chunk of client.cat(ipfsHash)) {
      chunks.push(chunk);
    }

    const fileBuffer = Buffer.concat(chunks);

    console.log(`✅ File retrieved from IPFS: ${ipfsHash}`);

    return fileBuffer;
  } catch (error) {
    console.error('IPFS retrieval error:', error);
    throw new AppError('Failed to retrieve file from IPFS', 500);
  }
};

/**
 * Pin file to IPFS (ensure it's not garbage collected)
 */
export const pinToIPFS = async (ipfsHash) => {
  try {
    const client = getIPFSClient();

    await client.pin.add(ipfsHash);

    console.log(`✅ File pinned to IPFS: ${ipfsHash}`);

    return { success: true, ipfsHash };
  } catch (error) {
    console.error('IPFS pinning error:', error);
    throw new AppError('Failed to pin file to IPFS', 500);
  }
};

/**
 * Unpin file from IPFS
 */
export const unpinFromIPFS = async (ipfsHash) => {
  try {
    const client = getIPFSClient();

    await client.pin.rm(ipfsHash);

    console.log(`✅ File unpinned from IPFS: ${ipfsHash}`);

    return { success: true, ipfsHash };
  } catch (error) {
    console.error('IPFS unpinning error:', error);
    // Don't throw error for unpinning failures
    return { success: false, error: error.message };
  }
};

/**
 * Get IPFS file stats
 */
export const getIPFSStats = async (ipfsHash) => {
  try {
    const client = getIPFSClient();

    const stats = await client.files.stat(`/ipfs/${ipfsHash}`);

    return {
      hash: ipfsHash,
      size: stats.size,
      cumulativeSize: stats.cumulativeSize,
      type: stats.type,
    };
  } catch (error) {
    console.error('IPFS stats error:', error);
    throw new AppError('Failed to get IPFS file stats', 500);
  }
};

/**
 * Check if IPFS is available
 */
export const checkIPFSConnection = async () => {
  try {
    const client = getIPFSClient();
    const { id } = await client.id();
    return { connected: true, peerId: id };
  } catch (error) {
    console.error('IPFS connection check failed:', error);
    return { connected: false, error: error.message };
  }
};
