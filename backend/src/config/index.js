import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const config = {
  // Server
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,
  apiVersion: process.env.API_VERSION || 'v1',

  // Database
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/bmrms',
    testUri: process.env.MONGODB_TEST_URI || 'mongodb://localhost:27017/bmrms_test',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // IPFS
  ipfs: {
    host: process.env.IPFS_HOST || 'localhost',
    port: parseInt(process.env.IPFS_PORT, 10) || 5001,
    protocol: process.env.IPFS_PROTOCOL || 'http',
    gateway: process.env.IPFS_GATEWAY || 'http://localhost:8080/ipfs/',
  },

  // Blockchain
  blockchain: {
    enabled: process.env.BLOCKCHAIN_ENABLED === 'true',
    network: process.env.BLOCKCHAIN_NETWORK || 'localhost',
    rpcUrl: process.env.BLOCKCHAIN_RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.BLOCKCHAIN_CHAIN_ID, 10) || 1337,
    privateKey: process.env.BLOCKCHAIN_PRIVATE_KEY,
    contracts: {
      consent: process.env.CONSENT_CONTRACT_ADDRESS,
      record: process.env.RECORD_CONTRACT_ADDRESS,
      audit: process.env.AUDIT_CONTRACT_ADDRESS,
    },
  },

  // Encryption
  encryption: {
    key: process.env.ENCRYPTION_KEY,
    algorithm: process.env.ENCRYPTION_ALGORITHM || 'aes-256-gcm',
  },

  // File Upload
  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760, // 10MB
    allowedFileTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || [
      'pdf',
      'jpg',
      'jpeg',
      'png',
      'dcm',
      'dicom',
    ],
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000, // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    filePath: process.env.LOG_FILE_PATH || 'logs/app.log',
  },

  // Offline Sync
  sync: {
    batchSize: parseInt(process.env.SYNC_BATCH_SIZE, 10) || 50,
    retryAttempts: parseInt(process.env.SYNC_RETRY_ATTEMPTS, 10) || 3,
    retryDelay: parseInt(process.env.SYNC_RETRY_DELAY, 10) || 5000,
  },
};

// Validate required environment variables
const requiredEnvVars = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'ENCRYPTION_KEY'];

if (config.env === 'production') {
  requiredEnvVars.push('MONGODB_URI');
}

const missingEnvVars = requiredEnvVars.filter((envVar) => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingEnvVars.join(', ')}`
  );
}

export default config;
