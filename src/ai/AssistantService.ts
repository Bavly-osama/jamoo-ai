import {classifyCommand,type LocalCommand} from "./LocalCommands";
export class AssistantService {
 busy=false;
 requests=0;inputTokens=0;outputTokens=0;
 private context:{role:"user"|"model";text:string}[]=[];
 private cache=new Map<string,{text:string;time:number}>();
 private abort?:AbortController;
 constructor(private local:(command:LocalCommand)=>string){}
 cancel(){this.abort?.abort();}
 async ask(text:string,onText:(text:string)=>void){
  const local=classifyCommand(text);if(local){const answer=this.local(local);onText(answer);return answer;}
  if(this.busy)throw new Error("Jarvis is still answering. Stop the response to ask again.");
  text=text.trim().slice(0,500);
  const key=text.toLowerCase();const cache=this.cache.get(key);
  if(cache&&Date.now()-cache.time<300000){onText(cache.text);return cache.text;}
  if(this.requests>=20||this.inputTokens+this.outputTokens>=16000)throw new Error("Session AI budget reached. Local commands remain available.");
  this.busy=true;this.abort=new AbortController();const timer=setTimeout(()=>this.abort?.abort(),20000);
  try{
   this.requests++;
   const response=await fetch("/api/assistant",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text,context:this.context}),signal:this.abort.signal});
   if(!response.ok){const data=await response.json();throw new Error(data.error??"Assistant unavailable. Try again.");}
   if(!response.body)throw new Error("Empty assistant response.");
   const reader=response.body.getReader();const decoder=new TextDecoder();let pending="",answer="",done=false;
   const line=(value:string)=>{if(!value.trim())return;const data=JSON.parse(value);if(data.error)throw new Error(data.error);if(data.text){answer+=String(data.text);onText(answer);}if(data.done){done=true;this.inputTokens+=data.usage?.input??0;this.outputTokens+=data.usage?.output??0;}};
   try{while(true){const chunk=await reader.read();pending+=decoder.decode(chunk.value,{stream:!chunk.done});const lines=pending.split("\n");pending=lines.pop()??"";lines.forEach(line);if(chunk.done)break;}line(pending);}finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   if(!done||!answer)throw new Error("Response interrupted. Please retry.");
   this.context=[...this.context,{role:"user" as const,text:text.slice(0,300)},{role:"model" as const,text:answer.slice(0,500)}].slice(-4);
   // Only self-contained questions are cached; follow-ups depend on context.
   if(/^(what is|what are|explain|define|who is)\b/i.test(text)&&! /\b(this|that|it|those|these)\b/i.test(text)){
    if(this.cache.size>=30)this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key,{text:answer,time:Date.now()});
   }
   return answer;
  }finally{clearTimeout(timer);this.busy=false;this.abort=undefined;}
 }
}
