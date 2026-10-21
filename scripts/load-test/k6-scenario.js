import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// ==============================================================================
// CUSTOM METRICS ĐO LƯỜNG CHUYÊN SÂU
// ==============================================================================
export const errorRate = new Rate('errors');
export const count200 = new Counter('http_200_ok');
export const count403 = new Counter('http_403_forbidden_cf');
export const count429 = new Counter('http_429_rate_limited');
export const count5xx = new Counter('http_5xx_server_error');

export const homeDuration = new Trend('duration_home_page');
export const apiMusicDuration = new Trend('duration_api_music');
export const apiHealthDuration = new Trend('duration_api_health');
export const projectsDuration = new Trend('duration_projects_page');

// ==============================================================================
// CẤU HÌNH KỊCH BẢN KIỂM THỬ (SCENARIOS)
// ==============================================================================
const TARGET_URL = __ENV.TARGET_URL || 'http://localhost:3000';
const TEST_TYPE = __ENV.TEST_TYPE || 'load'; // smoke | load | stress | spike

// Phát hiện target có phải đi qua Cloudflare Edge không
const isCloudflare = TARGET_URL.includes('tomatodev.me') || TARGET_URL.startsWith('https://');

let scenariosConfig = {};

if (TEST_TYPE === 'smoke') {
  scenariosConfig = {
    smoke_test: {
      executor: 'constant-vus',
      vus: 5,
      duration: '30s',
    },
  };
} else if (TEST_TYPE === 'stress') {
  scenariosConfig = {
    stress_test: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '1m', target: 800 },
        { duration: '30s', target: 0 },
      ],
    },
  };
} else if (TEST_TYPE === 'spike') {
  scenariosConfig = {
    spike_test: {
      executor: 'ramping-vus',
      startVUs: 10,
      stages: [
        { duration: '10s', target: 10 },
        { duration: '10s', target: 600 },
        { duration: '1m', target: 600 },
        { duration: '15s', target: 10 },
        { duration: '20s', target: 10 },
      ],
    },
  };
} else {
  scenariosConfig = {
    standard_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '20s', target: 25 },
        { duration: '40s', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '20s', target: 200 },
        { duration: '40s', target: 200 },
        { duration: '20s', target: 0 },
      ],
    },
  };
}

export const options = {
  scenarios: scenariosConfig,
  thresholds: {
    http_req_duration: ['p(95)<800', 'p(99)<1500'],
    errors: ['rate<0.01'],
  },
};

function getRandomClientIp(vuId) {
  const octet2 = (vuId % 250) + 1;
  const octet3 = Math.floor(Math.random() * 254) + 1;
  const octet4 = Math.floor(Math.random() * 254) + 1;
  return `140.${octet2}.${octet3}.${octet4}`;
}

function recordStatus(res) {
  if (res.status === 200 || res.status === 304) {
    count200.add(1);
    errorRate.add(0);
    return true;
  }
  
  if (res.status === 403) count403.add(1);
  else if (res.status === 429) count429.add(1);
  else if (res.status >= 500) count5xx.add(1);

  errorRate.add(1);
  return false;
}

export default function () {
  const clientIp = getRandomClientIp(__VU);
  
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9,vi;q=0.8',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
  };

  // LƯU Ý BẢO MẬT:
  // Nếu target là Cloudflare (domain public), TUYỆT ĐỐI KHÔNG gửi header CF-Connecting-IP
  // vì Cloudflare Edge coi đó là hành vi IP spoofing và chặn 403 (error code: 1000).
  // Chỉ gửi header này khi test local nội bộ để bypass rate limit của Nginx và Next.js.
  if (!isCloudflare) {
    headers['CF-Connecting-IP'] = clientIp;
    headers['X-Forwarded-For'] = clientIp;
    headers['X-Real-IP'] = clientIp;
  }

  const rand = Math.random();

  if (rand < 0.60) {
    // 1. Home Page
    const res = http.get(`${TARGET_URL}/`, { headers });
    homeDuration.add(res.timings.duration);
    check(res, {
      'Home status 200': (r) => r.status === 200,
    });
    recordStatus(res);
  } else if (rand < 0.85) {
    // 2. Music API
    const res = http.get(`${TARGET_URL}/api/music`, {
      headers: {
        ...headers,
        Accept: 'application/json',
      },
    });
    apiMusicDuration.add(res.timings.duration);
    check(res, {
      'API Music status 200': (r) => r.status === 200,
    });
    recordStatus(res);
  } else if (rand < 0.95) {
    // 3. Projects Page
    const res = http.get(`${TARGET_URL}/projects`, { headers });
    projectsDuration.add(res.timings.duration);
    check(res, {
      'Projects status 200': (r) => r.status === 200,
    });
    recordStatus(res);
  } else {
    // 4. Health Check API
    const res = http.get(`${TARGET_URL}/api/health`, {
      headers: {
        ...headers,
        Accept: 'application/json',
      },
    });
    apiHealthDuration.add(res.timings.duration);
    check(res, {
      'Health status 200': (r) => r.status === 200,
    });
    recordStatus(res);
  }

  sleep(0.5 + Math.random());
}
