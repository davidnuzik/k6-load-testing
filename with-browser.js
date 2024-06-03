import { browser } from 'k6/experimental/browser';
import { check } from 'k6';

/** NOTE: K6 experimental browser is significantly limited in number of VUs compared to non-browser K6 load tests.
 * I've observed that most environments with 4 or more CPU threads can handle ~10 VUs with minimal impact to timings;
 * however, 20 or more can start to significantly impact timings due to compute required to run the headless browser.
 * Larger VUs requires many more CPU cores. I have tested up to a 192 core system on AWS with about 160 VUs at most.
*/ 
export const options = {
  scenarios: {
    ui: {
      executor: 'shared-iterations',
      vus: 10,
      iterations: 200,
      options: {
        browser: {
          type: 'chromium',
        },
      },
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'], // http errors should be less than 1%
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

export default async function (data) {
  const context = browser.newContext();
  const page = context.newPage();
  const siteUrl = data.siteUrl;

  try {
    // Waiting until networkidle is optional but is recommended to avoid issues during checks
    await page.goto(siteUrl, { waitUntil: 'networkidle' });

    if (siteUrl.includes("hello-bandwidth")) {
      // Bandwidth (asset-heavy page) checks
      check(page, {
        // These checks, while optional, doubly ensure the page has loaded some key elements
        TopHeader: (p) => p.locator('h1').textContent() == 'Hello, Bandwidth',
        CloudsImageVisible: (p) => p.locator('//img[contains(@src, "Clouds_over_the_Atlantic_Ocean_CC_Attribution_Share_Alike_3.0_Unported-attrib-required-Tiago-Fioreze-1024x685.jpg")]').isVisible(),
        SpaceImageVisible: (p) => p.locator('//img[contains(@src, "9291847289_79404655c4_o_NASA-Storm-Clouds-Over-the-Atlantic-Ocean-Near-Brazil-1024x681.jpg")]').isVisible(),
        YouTubeVideoVisible: (p) => p.locator('//iframe[contains(@src, "uU43V3gnL9U")]').isVisible(),
        TwitterPostVisible: (p) => p.locator('//iframe[contains(@data-tweet-id, "1791130772465676598")]').isVisible(),
        DesignedWithText: (p) => p.locator('//p[contains(text(), "Designed with")]').textContent().includes('Designed with WordPress'),
      });
  } else {
      // Default "Home" page checks
      check(page, {
        TopHeader: (p) => p.locator('h1').textContent() == 'A commitment to innovation and sustainability',
        LowerHeader: (p) => p.locator('//h2[contains(text(), "subscribers")]').textContent() == 'Join 900+ subscribers',
        BuildingImageVisible: (p) => p.locator('//img[contains(@src, "assets/images/building-exterior.webp")]').isVisible(),
        TouristImageVisible: (p) => p.locator('//img[contains(@src, "assets/images/tourist-and-building.webp")]').isVisible(),
        BuildingWindowsImageVisible: (p) => p.locator('//img[contains(@src, "assets/images/windows.webp")]').isVisible(),
        DesignedWithText: (p) => p.locator('//p[contains(text(), "Designed with")]').textContent().includes('Designed with WordPress'),
      })
  }
  } finally {
    page.close();
  }
}