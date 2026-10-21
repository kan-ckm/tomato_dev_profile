#!/usr/bin/env node

/**
 * ==============================================================================
 * AUTOCANNON BENCHMARK NHANH CHO TOMATODEVS PROFILE
 * ==============================================================================
 */

import { spawn } from 'child_process';

const TARGET_URL = process.env.TARGET_URL || 'http://localhost:3000';
const CONNECTIONS = parseInt(process.env.CONNECTIONS || '50', 10);
const DURATION = parseInt(process.env.DURATION || '15', 10);
const ENDPOINT = process.env.ENDPOINT || '/';

const isCloudflare = TARGET_URL.includes('tomatodev.me') || TARGET_URL.startsWith('https://');

console.log('='.repeat(70));
console.log('🚀 TOMATODEVS QUICK LOAD TEST (AUTOCANNON)');
console.log('='.repeat(70));
console.log(`🎯 Target URL  : ${TARGET_URL}${ENDPOINT}`);
console.log(`👥 Concurrent  : ${CONNECTIONS} connections`);
console.log(`⏱️  Duration    : ${DURATION} seconds`);
console.log(`🛡️  Target Type : ${isCloudflare ? 'Cloudflare Edge (Real Domain)' : 'Local Host (Mock IP Bypass)'}`);
console.log('='.repeat(70));
console.log('Đang chạy kiểm thử... Vui lòng chờ...\n');

const mockIp = `140.${Math.floor(Math.random() * 200) + 1}.${Math.floor(Math.random() * 250) + 1}.${Math.floor(Math.random() * 250) + 1}`;

const headers = [
  '-H', 'User-Agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  '-H', 'Accept-Encoding=gzip, deflate, br',
];

if (!isCloudflare) {
  headers.push('-H', `CF-Connecting-IP=${mockIp}`);
  headers.push('-H', `X-Forwarded-For=${mockIp}`);
}

const args = [
  'autocannon',
  '-c', CONNECTIONS.toString(),
  '-d', DURATION.toString(),
  '-p', '1',
  '--latency',
  '--renderStatusCodes',
  ...headers,
  `${TARGET_URL}${ENDPOINT}`,
];

const child = spawn('npx', args, {
  stdio: 'inherit',
  env: process.env,
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n✅ Hoàn tất kiểm thử tải.');
  } else {
    console.error(`\n❌ Quá trình kiểm thử kết thúc với mã lỗi: ${code}`);
  }
});
