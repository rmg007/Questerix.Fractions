#!/usr/bin/env node

const https = require('https');

const token = process.env.CLOUDFLARE_API_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const projectName = 'questerix-fractions';

if (!token || !accountId) {
  console.error('Error: Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID environment variables');
  process.exit(1);
}
const options = {
  hostname: 'api.cloudflare.com',
  path: `/client/v4/accounts/${accountId}/pages/projects`,
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
};

const payload = JSON.stringify({
  name: projectName,
  production_branch: 'main',
});

console.log(`Creating Cloudflare Pages project: ${projectName}...`);

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      if (result.success) {
        console.log('✓ Pages project created successfully!');
        console.log('Project details:', JSON.stringify(result.result, null, 2));
        process.exit(0);
      } else {
        console.error('✗ API returned errors:', result.errors);
        process.exit(1);
      }
    } catch (e) {
      console.error('Failed to parse response:', e.message);
      console.error('Raw response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('Request failed:', error.message);
  process.exit(1);
});

req.write(payload);
req.end();
