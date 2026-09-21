import { test, expect } from "@playwright/test";
// Node's fetch exercises the same HTTP endpoints without Playwright's native
// APIRequestContext, which crashes before the test body on this Windows host.
const request={
 get:(path:string)=>fetch("http://localhost:5173"+path),
 post:(path:string,options:{headers?:Record<string,string>;data:unknown})=>fetch("http://localhost:5173"+path,{method:"POST",headers:{"Content-Type":"application/json",...options.headers},body:JSON.stringify(options.data)})
};
test("API rejects images, unknown actions, and foreign origins", async ({
}) => {
  const headers = { Origin: "http://localhost:5173" };
  expect(
    (
      await request.post("/api/gesture/resolve", {
        headers,
        data: { image: "data:image/png;base64,AA" },
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await request.post("/api/gesture/resolve", {
        headers: { Origin: "https://untrusted.example" },
        data: { kind: "command", text: "reset" },
      })
    ).status,
  ).toBe(403);
  const res = await request.post("/api/gesture/resolve", {
    headers,
    data: {
      kind: "gesture",
      gestureCandidates: ["swipe"],
      confidence: 0.99,
      ambiguousMs: 2000,
      dx: 0.4,
      dy: 0,
      velocity: 1,
      pinch: 0.8,
      duration: 400,
      context: "carousel",
    },
  });
  expect(res.status).toBe(200);
  expect((await res.json()).usage).toEqual({ input: 0, output: 0 });
});
test("unconfigured AI returns useful failure without breaking local interaction", async ({
}) => {
  const health = await (await request.get("/api/health")).json();
  test.skip(health.aiEnabled, "No paid API call in automated tests");
  const response = await request.post("/api/gesture/resolve", {
    headers: { Origin: "http://localhost:5173" },
    data: { kind: "command", text: "Open diagnostics" },
  });
  expect(response.status).toBe(503);
});
test("assistant rejects foreign origins, image uploads and oversized history",async()=>{
 expect((await request.post("/api/assistant",{headers:{Origin:"https://untrusted.example"},data:{text:"hi"}})).status).toBe(403);
 expect((await request.post("/api/assistant",{headers:{Origin:"http://localhost:5173"},data:{text:"hi",image:"data:image/png"}})).status).toBe(400);
 expect((await request.post("/api/assistant",{headers:{Origin:"http://localhost:5173"},data:{text:"hi",context:Array(5).fill({role:"user",text:"hello"})}})).status).toBe(400);
});
