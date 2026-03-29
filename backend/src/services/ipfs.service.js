import axios from 'axios';
import FormData from 'form-data';
import config from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

/**
 * Upload file to IPFS via Pinata
 */
export const uploadToIPFS = async (fileBuffer, metadata = {}) => {
  try {
    const url = `https://api.pinata.cloud/pinning/pinFileToIPFS`;

    const data = new FormData();
    data.append('file', fileBuffer, {
      filename: metadata.fileName || 'medical-record.enc',
    });

    const pinataMetadata = JSON.stringify({
      name: metadata.fileName || 'Medical Record',
      keyvalues: {
        recordType: metadata.recordType || 'unknown',
        ...metadata,
      },
    });
    data.append('pinataMetadata', pinataMetadata);

    const pinataOptions = JSON.stringify({
      cidVersion: 0,
    });
    data.append('pinataOptions', pinataOptions);

    const response = await axios.post(url, data, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        Authorization: `Bearer ${config.ipfs.jwt}`,
      },
    });

    const ipfsHash = response.data.IpfsHash;

    console.log(`✅ File uploaded to Pinata IPFS: ${ipfsHash}`);

    return {
      ipfsHash,
      size: response.data.PinSize,
      gateway: `${config.ipfs.gateway}${ipfsHash}`,
      metadata,
    };
  } catch (error) {
    console.error('Pinata upload error:', error.response?.data || error.message);
    throw new AppError('Failed to upload file to IPFS via Pinata', 500);
  }
};

/**
 * Retrieve file from IPFS via Gateway
 */
export const retrieveFromIPFS = async (ipfsHash) => {
  try {
    const url = `${config.ipfs.gateway}${ipfsHash}`;
    const response = await axios.get(url, { responseType: 'arraybuffer' });

    console.log(`✅ File retrieved from IPFS Gateway: ${ipfsHash}`);

    return Buffer.from(response.data);
  } catch (error) {
    console.error('IPFS retrieval error:', error.message);
    throw new AppError('Failed to retrieve file from IPFS Gateway', 500);
  }
};

/**
 * Pinning and Unpinning are handled by Pinata's API
 * These functions are maintained for compatibility with the record service
 */
export const pinToIPFS = async (ipfsHash) => {
  return { success: true, ipfsHash };
};

export const unpinFromIPFS = async (ipfsHash) => {
  try {
    const url = `https://api.pinata.cloud/pinning/unpin/${ipfsHash}`;
    await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${config.ipfs.jwt}`,
      },
    });
    return { success: true, ipfsHash };
  } catch (error) {
    console.error('Pinata unpinning error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
};

/**
 * Check if Pinata connection is valid
 */
export const checkIPFSConnection = async () => {
  try {
    const url = `https://api.pinata.cloud/data/testAuthentication`;
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${config.ipfs.jwt}`,
      },
    });
    return { connected: true, message: response.data.message };
  } catch (error) {
    console.error('Pinata connection check failed:', error.response?.data || error.message);
    return { connected: false, error: error.message };
  }
};
