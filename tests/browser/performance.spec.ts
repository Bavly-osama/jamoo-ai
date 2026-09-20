import { test, expect } from "@playwright/test";
test("short render soak has bounded DOM and no AI traffic", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let requests = 0;
  page.on("request", (r) => {
    if (r.url().includes("/api/gesture/resolve")) requests++;
  });
  await page.goto("/");
  await page.locator("#preview").click();
  await page.locator("#diagnostics").click();
  await page.waitForTimeout(3000);
  const baseline = await page.evaluate(() => ({
    nodes: document.querySelectorAll("*").length,
    heap:
      (performance as Performance & { memory?: { usedJSHeapSize: number } })
        .memory?.usedJSHeapSize ?? null,
  }));
  const samples: string[] = [];
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(1000);
    samples.push(await page.locator("#debug-data").innerText());
  }
  const end = await page.evaluate(() => ({
    nodes: document.querySelectorAll("*").length,
    heap:
      (performance as Performance & { memory?: { usedJSHeapSize: number } })
        .memory?.usedJSHeapSize ?? null,
  }));
  await testInfo.attach("performance-samples.json", {
    body: JSON.stringify(
      { baseline, end, samples, aiRequests: requests },
      null,
      2,
    ),
    contentType: "application/json",
  });
  console.log(
    "SOAK",
    JSON.stringify({ baseline, end, samples, aiRequests: requests }),
  );
  expect(end.nodes).toBe(baseline.nodes);
  expect(errors).toEqual([]);
  expect(requests).toBe(0);
});
