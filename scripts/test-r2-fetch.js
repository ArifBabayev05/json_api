// Using global fetch (Node 18+)
require("dotenv").config();

async function test() {
  const url = process.env.R2_PUBLIC_URL + "/scraped_data.json";
  console.log(`Checking ${url}...`);
  try {
    const res = await fetch(url, { method: 'HEAD' });
    if (res.ok) {
      console.log("✅ R2 Public URL is working!");
      console.log("Status:", res.status);
      console.log("Content-Length:", res.headers.get("content-length"));
    } else {
      console.log("❌ R2 Public URL returned error:", res.status);
    }
  } catch (e) {
    console.error("❌ Error fetching from R2:", e.message);
  }
}

test();
