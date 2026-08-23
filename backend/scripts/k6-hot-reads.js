// §16.1 hot-reads load profile — k6 syntax (NOT executed in this repo; see
// scripts/LOAD-BUDGETS.md). Drives the three hottest public reads through
// their production paths: product list, product detail (read-through cache,
// catalog:product:{slug}) and the versioned homepage payload.
//
// Usage:
//   k6 run -e BASE_URL=http://localhost:5000 -e PRODUCT_SLUG=naruto-rasengan-hoodie scripts/k6-hot-reads.js

import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';
const PRODUCT_SLUG = __ENV.PRODUCT_SLUG || 'naruto-rasengan-hoodie';

export const options = {
  vus: 50,
  duration: '30s',
  thresholds: {
    // Cached hot reads (10m detail TTL, 24h homepage TTL): budget p95 < 50ms.
    'http_req_duration{endpoint:detail}': ['p(95)<50'],
    'http_req_duration{endpoint:home}': ['p(95)<50'],
    // Uncached DB-backed listing (§18 pagination + filters): budget p95 < 250ms.
    'http_req_duration{endpoint:list}': ['p(95)<250'],
    'http_req_failed': ['rate<0.01'],
  },
};

export default function () {
  const list = http.get(`${BASE_URL}/api/v1/products?limit=12`, { tags: { endpoint: 'list' } });
  check(list, {
    'list 200': (r) => r.status === 200,
    'list paginated envelope': (r) => r.json('meta.limit') === 12,
  });

  const detail = http.get(`${BASE_URL}/api/v1/products/${PRODUCT_SLUG}`, { tags: { endpoint: 'detail' } });
  check(detail, {
    'detail 200 or 404': (r) => [200, 404].includes(r.status),
  });

  const home = http.get(`${BASE_URL}/api/v1/content/homepage`, { tags: { endpoint: 'home' } });
  check(home, {
    'homepage 200': (r) => r.status === 200,
    'homepage is an array of sections': (r) => Array.isArray(r.json()),
  });

  sleep(0.2);
}
