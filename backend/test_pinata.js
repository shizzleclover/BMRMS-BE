import axios from 'axios';

const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiYjRkMzA3YS01MTQ5LTRkZDgtYjM2Ny1hZDYxNzczOWY0ODMiLCJlbWFpbCI6Im11cmV3YXRhamFsYUBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiODIyODk0YzEzYWFmNWUxNTM4OGEiLCJzY29wZWRLZXlTZWNyZXQiOiI4Yjg1OGMyOGUxNjNiNGQ5MTJhMzE5NDBlNjE4NGE2MGU5M2FkY2U3MGE3NWMxM2M0OTRmNDM3ZWNhNjU2ZjUzIiwiZXhwIjoxODA2MzYxMTA1fQ.HaFSG4_fR7iUWJLwF-6PUsS3llIBsV0vx5Uzld8EYx4';

async function testPinata() {
  try {
    console.log('--- Testing Pinata Connection ---');
    const response = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
    console.log('✅ Pinata connection successful!');
    console.log('Message:', response.data.message);

    // Test upload
    console.log('\n--- Testing Pinata Upload ---');
    const FormData = (await import('form-data')).default;
    const data = new FormData();
    data.append('file', Buffer.from('Hello BMRMS from Pinata test'), {
      filename: 'test.txt',
    });

    const uploadResponse = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', data, {
      maxBodyLength: 'Infinity',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
        Authorization: `Bearer ${jwt}`,
      },
    });

    console.log('✅ Upload successful!');
    console.log('IPFS Hash:', uploadResponse.data.IpfsHash);

  } catch (error) {
    console.error('❌ Pinata test failed:', error.response?.data || error.message);
  }
}

testPinata();
