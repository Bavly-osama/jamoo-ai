import {it,expect,vi,afterEach} from "vitest";
import {InteractionManager} from "../src/interaction/InteractionManager";
afterEach(()=>vi.unstubAllGlobals());
it("an exact button hit beats the neighboring projection's expanded hit area",()=>{
 const element=(target:string,left:number,top:number,width:number,height:number)=>({dataset:{target},closest:()=>null,hasAttribute:()=>false,getBoundingClientRect:()=>({left,top,right:left+width,bottom:top+height,width,height})});
 const close=element("close-activity",1000,140,150,33),projection=element("projection",100,180,1100,350);
 vi.stubGlobal("document",{querySelector:()=>null,querySelectorAll:()=>[close,projection]});vi.stubGlobal("innerHeight",720);
 expect(new InteractionManager().hit(1080,157)).toBe("close-activity");
});
