import {test,expect} from "@playwright/test";
test("speech recognition routes local commands, streams a question and speaks the answer",async({page})=>{
 await page.addInitScript(()=>{
  (window as any).__spoken=[];
  class Speech {
   onresult:any;onend:any;onerror:any;
   start(){setTimeout(()=>this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:(window as any).__utterance??"Jarvis, open earth"}}]}),60);}
   abort(){}stop(){}
  }
  Object.defineProperty(window,"SpeechRecognition",{value:Speech});
  Object.defineProperty(window,"speechSynthesis",{value:{cancel(){},speak(u:any){(window as any).__spoken.push(u.text);setTimeout(()=>u.onend?.(),50);}}});
 });
 let calls=0;
 await page.route("**/api/assistant",async route=>{calls++;await route.fulfill({contentType:"application/x-ndjson",body:'{"text":"Quantum computers use qubits to explore combinations."}\n{"done":true,"usage":{"input":30,"output":12}}\n'});});
 await page.goto("/");await page.locator("#preview").click();
 await page.locator("#command-input").fill("open assistant");await page.locator("#command-send").click();
 await page.locator("#listen").click();await expect(page.locator("#activity-title")).toHaveText("Earth Scan");expect(calls).toBe(0);
 await page.evaluate(()=>{(window as any).__utterance="Jarvis, explain quantum computing simply";});
 await page.locator("#listen").click();await expect(page.locator("#assistant-response")).toContainText("qubits");
 expect(calls).toBe(1);await expect.poll(()=>page.evaluate(()=>(window as any).__spoken.at(-1))).toContain("qubits");
 await page.locator("#close-assistant").click();await page.locator("#close-activity").click();await expect(page.locator("#activity")).toBeHidden();
});
test("unsupported speech and failed AI leave text and local commands usable",async({page})=>{
 await page.addInitScript(()=>{Object.defineProperty(window,"SpeechRecognition",{value:undefined});Object.defineProperty(window,"webkitSpeechRecognition",{value:undefined});});
 await page.route("**/api/assistant",r=>r.fulfill({status:503,contentType:"application/json",body:JSON.stringify({error:"AI unavailable. Retry."})}));
 await page.goto("/");await page.locator("#preview").click();await page.locator("#command-input").fill("open assistant");await page.locator("#command-send").click();await page.locator("#listen").click();
 await expect(page.locator("#assistant-response")).toContainText("Type your request");
 await page.locator("#command-input").fill("What is quantum computing?");await page.locator("#command-send").click();await expect(page.locator("#assistant-response")).toContainText("AI unavailable");
 await page.locator("#command-input").fill("open diagnostics");await page.locator("#command-send").click();await expect(page.locator("#activity-title")).toHaveText("Diagnostics");
});
