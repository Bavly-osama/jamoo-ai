export type LocalCommand = {action:"open";module:string}|{action:"close"|"next"|"previous"|"reset"|"summary"|"hello"}|{action:"zoom";factor:number};
export function classifyCommand(input:string):LocalCommand|null {
 const text=input.toLowerCase().replace(/^\s*jarvis[\s,:]*/,"").replace(/[.!?]+$/,"").trim();
 if(/^(close|go back|back|close (panel|module|assistant))$/.test(text))return {action:"close"};
 if(/^(next|next card|next module)$/.test(text))return {action:"next"};
 if(/^(previous|previous card|previous module)$/.test(text))return {action:"previous"};
 if(/^(reset|reset scene|reset workspace)$/.test(text))return {action:"reset"};
 if(/^(hello|hi|hello jarvis)$/.test(text))return {action:"hello"};
 if(/^(summarize this screen|explain this system|what is on (my|the) screen)$/.test(text))return {action:"summary"};
 if(/^zoom( in| out)?$/.test(text))return {action:"zoom",factor:text.endsWith("out")?.85:1.15};
 const match=text.match(/^(?:open|show|inspect) (?:the )?(.+)$/);
 if(match){
  const aliases:Record<string,string>={earth:"earth",globe:"earth","earth scan":"earth",atlas:"earth",diagnostics:"diagnostics","system diagnostics":"diagnostics",status:"status","system status":"status",core:"energy","energy core":"energy","arc reactor":"energy",files:"files",missions:"mission","mission control":"mission",assistant:"assistant","ai assistant":"assistant",jarvis:"assistant",camera:"camera",network:"network",armor:"armor","armor system":"armor"};
  const module=aliases[match[1]];if(module)return {action:"open",module};
 }
 return null;
}
