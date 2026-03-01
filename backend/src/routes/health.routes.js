import express from 'express';

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'BMRMS API is running',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Database health check
router.get('/db', async (req, res) => {
  try {
    const { getConnectionStatus } = await import('../config/database.js');
    const dbStatus = getConnectionStatus();

    res.json({
      success: true,
      database: {
        connected: dbStatus.isConnected,
        readyState: dbStatus.readyState,
        host: dbStatus.host,
        name: dbStatus.name,
      },
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
    });
  }
});

// IPFS health check
router.get('/ipfs', async (req, res) => {
  try {
    const { checkIPFSConnection } = await import('../services/ipfs.service.js');
    const ipfsStatus = await checkIPFSConnection();

    res.json({
      success: ipfsStatus.connected,
      ipfs: ipfsStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'IPFS connection failed',
      error: error.message,
    });
  }
});

// Blockchain health check
router.get('/blockchain', async (req, res) => {
  try {
    const { checkBlockchainConnection } = await import('../services/blockchain.service.js');
    const blockchainStatus = await checkBlockchainConnection();

    res.json({
      success: blockchainStatus.connected,
      blockchain: blockchainStatus,
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Blockchain connection failed',
      error: error.message,
    });
  }
});

export default router;
