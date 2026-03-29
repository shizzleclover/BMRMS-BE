import { create } from 'ipfs-http-client';

const projectId = '35e71074f2c4415aa028f9db91075766';
const projectSecret = 'm0em3TWzn3t51JXSdKMHTFYecqSMap+wjRCF82hw5tfsNwMkKEOhRA';

const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64');

async function testIPFS() {
  try {
    const client = create({
      host: 'ipfs.infura.io',
      port: 5001,
      protocol: 'https',
      headers: {
        authorization: auth,
      },
    });

    console.log('--- Testing Infura IPFS ID ---');
    const id = await client.id();
    console.log('✅ Connection successful. Peer ID:', id.id);

  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
    }
  }
}

testIPFS();
