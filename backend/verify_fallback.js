import dotenv from 'dotenv';
import * as bcService from './src/services/blockchain.service.js';

dotenv.config();

async function verify() {
  console.log('--- Verifying Resilient Fallback ---');
  
  try {
    console.log('1. Attempting storeRecordHash (should fallback if RPC/funds fail)...');
    const result = await bcService.storeRecordHash('test-id', 'patient-id', 'ipfs-hash', '0x1234');
    console.log('Result:', result);
    if (result.fallback) {
      console.log('✅ Successfully triggered fallback!');
    } else {
      console.log('🚀 Real transaction succeeded?! (Unexpected given 0 balance)');
    }

    console.log('\n2. Attempting grantConsentOnChain...');
    const consentResult = await bcService.grantConsentOnChain('consent-id', 'p-id', 'd-id', 'read');
    console.log('Consent Result:', consentResult);

    console.log('\n3. Attempting checkConsentOnChain...');
    const checkResult = await bcService.checkConsentOnChain('consent-id');
    console.log('Check Result:', checkResult);

  } catch (error) {
    console.error('❌ Verification failed – error was thrown instead of falling back:', error.message);
  }
}

verify();
