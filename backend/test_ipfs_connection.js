import { create } from 'ipfs-http-client';
import Buffer from 'buffer';

const projectId = '35e71074f2c4415aa028f9db91075766';
const projectSecret = 'm0em3TWzn3t51JXSdKMHTFYecqSMap+wjRCF82hw5tfsNwMkKEOhRA';

const auth = 'Basic ' + Buffer.Buffer.from(projectId + ':' + projectSecret).toString('base64');

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

    const { id } = await client.id();
    console.log('✅ Connected to Infura IPFS!');
    console.log('Peer ID:', id);

    // Test upload
    const content = Buffer.Buffer.from('Hello BMRMS from Antigravity');
    const result = await client.add(content);
    console.log('✅ Upload test successful!');
    console.log('Hash:', result.path);

  } catch (error) {
    console.error('❌ IPFS Connection/Upload failed:', error.message);
    if (error.response) {
      console.error('Response Status:', error.response.status);
    }
  }
}

testIPFS();
