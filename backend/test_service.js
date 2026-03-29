import * as ipfsService from './src/services/ipfs.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function testService() {
  try {
    console.log('--- Testing Pinata Service Connectivity (Health Check) ---');
    const health = await ipfsService.checkIPFSConnection();
    if (health.connected) {
      console.log('✅ Service Connected:', health.message);
    } else {
      console.log('❌ Service Connection Failed:', health.error);
      return;
    }

    console.log('\n--- Testing File Upload via Service ---');
    const buffer = Buffer.from('BMRMS IPFS Service Test Content');
    const upload = await ipfsService.uploadToIPFS(buffer, {
      fileName: 'service-test.txt',
      recordType: 'testing',
    });
    console.log('✅ Upload Successful!');
    console.log('Hash:', upload.ipfsHash);
    console.log('Gateway URL:', upload.gateway);

    console.log('\n--- Testing File Retrieval via Service ---');
    const retrieved = await ipfsService.retrieveFromIPFS(upload.ipfsHash);
    console.log('✅ Retrieval Successful!');
    console.log('Content:', retrieved.toString());

  } catch (error) {
    console.error('❌ Service test failed:', error.message);
  }
}

testService();
