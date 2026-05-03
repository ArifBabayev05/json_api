/**
 * Local test for the Vercel API handler
 */
const handler = require("../api/index.js");

function mockReq(url) {
  return { method: "GET", url, headers: { host: "localhost" } };
}

function mockRes() {
  let _status = 200, _body = null;
  return {
    setHeader() {},
    status(s) { _status = s; return this; },
    json(b) { _body = b; },
    end() {},
    get statusCode() { return _status; },
    get body() { return _body; },
  };
}

async function test(name, url, check) {
  const req = mockReq(url);
  const res = mockRes();
  handler(req, res);
  const ok = check(res);
  console.log(ok ? `  ✓ ${name}` : `  ✗ ${name}`);
  if (!ok) {
    console.log("    Got:", JSON.stringify(res.body).slice(0, 200));
    process.exitCode = 1;
  }
}

(async () => {
  console.log("\n=== Scorpus API Tests ===\n");

  await test("Stats endpoint", "/api/stats", r =>
    r.body && r.body.total_records === 117474
  );

  await test("Languages endpoint", "/api/languages", r =>
    r.body && r.body.languages.length === 3
  );

  await test("EN brands", "/api/brands?lang=en", r =>
    r.body && r.body.total > 300
  );

  await test("EN + BMW filter", "/api?lang=en&brand=BMW&limit=1", r =>
    r.body && r.body.total > 2000 && r.body.results[0]?.general?.brand === "BMW"
  );

  await test("RU + Opel filter", "/api?lang=ru&brand=Opel&limit=1", r =>
    r.body && r.body.total > 500 && r.body.results[0]?.general?.brand === "Opel"
  );

  await test("TR + power filter", "/api?lang=tr&min_power_hp=300&limit=1", r =>
    r.body && r.body.total > 4000
  );

  await test("Pagination", "/api?lang=en&brand=BMW&page=2&limit=5", r =>
    r.body && r.body.page === 2 && r.body.results.length === 5
  );

  await test("Invalid lang returns error", "/api?lang=xx", r =>
    r.statusCode === 400 && r.body?.error
  );

  await test("Default lang is EN", "/api?brand=BMW&limit=1", r =>
    r.body && r.body.lang === "en" && r.body.total > 0
  );

  await test("Sort by power desc", "/api?lang=en&brand=BMW&sort_by=power_hp&sort_dir=desc&limit=1", r => {
    const hp = r.body?.results?.[0]?.engine?.power_hp;
    return hp && hp > 500;
  });

  console.log("\n=== Tests Complete ===\n");
})();
