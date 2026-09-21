import {afterEach,expect,it,vi} from "vitest";
import {AssistantService} from "../src/ai/AssistantService";
afterEach(()=>vi.unstubAllGlobals());
it("executes local commands with zero network requests",async()=>{
 const fetch=vi.fn();vi.stubGlobal("fetch",fetch);
 const local=vi.fn(()=>"Opened diagnostics.");const ai=new AssistantService(local);
 expect(await ai.ask("Jarvis, open diagnostics",()=>{})).toBe("Opened diagnostics.");
 expect(fetch).not.toHaveBeenCalled();
});
it("streams text, caches standalone questions and recovers from an API error",async()=>{
 const fetch=vi.fn().mockResolvedValue(new Response('{"text":"Quantum "}\n{"text":"bits."}\n{"done":true,"usage":{"input":20,"output":4}}\n'));
 vi.stubGlobal("fetch",fetch);const ai=new AssistantService(()=>"");const chunks:string[]=[];
 expect(await ai.ask("What is quantum computing?",t=>chunks.push(t))).toBe("Quantum bits.");
 expect(chunks).toEqual(["Quantum ","Quantum bits."]);
 await ai.ask("What is quantum computing?",()=>{});expect(fetch).toHaveBeenCalledTimes(1);
 fetch.mockResolvedValue(new Response('{"error":"Offline"}',{status:503}));
 await expect(ai.ask("Explain stars",()=>{})).rejects.toThrow("Offline");expect(ai.busy).toBe(false);
});
