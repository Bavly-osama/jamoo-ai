import {test,expect} from "@playwright/test";
test("modules, local assistant, streaming answer, drag and mobile fallback",async({page})=>{
 const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
 let calls=0;await page.route("**/api/assistant",async route=>{calls++;await route.fulfill({contentType:"application/x-ndjson",body:'{"text":"Quantum bits can represent combinations of possibilities."}\n{"done":true,"usage":{"input":20,"output":10}}\n'});});
 await page.goto("/");await page.locator("#preview").click();
 await expect(page.locator(".card-slide")).toHaveCount(10);
 await page.locator("#command-input").fill("Jarvis, open files");await page.locator("#command-send").click();
 await expect(page.locator("#activity-title")).toHaveText("Files");
 const file=page.locator('[data-target="file-0"]');await file.click({trial:true});const box=await file.boundingBox();
 await page.mouse.move(box!.x+20,box!.y+20);await page.mouse.down();await page.mouse.move(box!.x+100,box!.y+60,{steps:15});await page.mouse.up();
 await expect(file).toHaveAttribute("data-x",/.+/);
 await page.locator("#close-activity").click();
 for(const name of ["earth","energy core","mission control","system status","diagnostics","network","camera","armor"]){
  await page.locator("#command-input").fill("open "+name);await page.locator("#command-send").click();await expect(page.locator("#activity")).toBeVisible();await page.locator("#close-activity").click();
 }
 expect(calls).toBe(0);
 await page.locator("#command-input").fill("Explain quantum computing simply");await page.locator("#command-send").click();
 await expect(page.locator("#assistant-response")).toContainText("Quantum bits");expect(calls).toBe(1);
 await page.keyboard.press("Escape");
 for(const size of [{width:390,height:844},{width:844,height:390}]){await page.setViewportSize(size);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);}
 expect(errors).toEqual([]);
});
