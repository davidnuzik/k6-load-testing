import http from 'k6/http';
import { check } from 'k6';
 
export const options = {
  scenarios: {
    load_test: {
      executor: 'shared-iterations',
      vus: 30,
      iterations: 200,
      maxDuration: '5m',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
    http_req_duration: ['p(95)<1000'], // 95% of requests should be below 1000ms
  },
};

// Check that SITE_URL was passed before running
export function setup() {
  // http://first.local/
  // http://first.local/hello-bandwidth/
  let siteUrl = __ENV.SITE_URL;
  if (siteUrl == undefined) {
    throw new Error("Missing SITE_URL variable. ABORTING...");
  }
  return { siteUrl };
}

export default function (data) {
  const siteUrl = data.siteUrl;
  const response = http.get(siteUrl);

  if (siteUrl.includes("hello-bandwidth")) {
    // Bandwidth (asset-heavy page) checks
    check(response, {
      'Status is 200': (r) => r.status === 200,
      'Top header is present': (r) => r.body.includes('Hello, Bandwidth'),
    });
  } else {
    // Default "Home" page checks
    check(response, {
      'Status is 200': (r) => r.status === 200,
      'Top header is present': (r) => r.body.includes('A commitment to innovation and sustainability'),
      'Lower header is present': (r) => r.body.includes('Join 900+ subscribers'),
      'BuildingImage is present': (r) => r.body.includes('assets/images/building-exterior.webp'),
    });
  }

}