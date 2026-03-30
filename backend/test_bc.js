import dotenv from 'dotenv';
import { ethers } from 'ethers';

dotenv.config();

async function testConnection() {
  const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
  const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
  const recordContractAddress = process.env.RECORD_CONTRACT_ADDRESS;

  console.log('Testing Blockchain Connection...');
  console.log('RPC URL:', rpcUrl);
  console.log('Private Key (last 4):', privateKey ? privateKey.slice(-4) : 'MISSING');
  console.log('Record Contract:', recordContractAddress);

  if (!rpcUrl || !privateKey) {
    console.error('Missing RPC URL or Private Key in .env');
    return;
  }

  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const network = await provider.getNetwork();
    console.log('✅ Connected to network:', network.name, '(Chain ID:', network.chainId.toString(), ')');

    const wallet = new ethers.Wallet(privateKey, provider);
    console.log('✅ Wallet address:', wallet.address);

    const balance = await provider.getBalance(wallet.address);
    console.log('✅ Wallet balance:', ethers.formatEther(balance), 'ETH');

    if (balance === 0n) {
      console.warn('⚠️  Wallet has NO funds! Transactions will fail.');
    }

    const code = await provider.getCode(recordContractAddress);
    if (code === '0x') {
      console.error('❌ No contract found at address:', recordContractAddress);
    } else {
      console.log('✅ Contract found at address:', recordContractAddress);
    }

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
