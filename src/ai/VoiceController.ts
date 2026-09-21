interface Recognition {
 lang:string;continuous:boolean;interimResults:boolean;
 onresult:((event:{results:ArrayLike<{isFinal:boolean;0:{transcript:string}}>;resultIndex:number})=>void)|null;
 onerror:((event:{error:string})=>void)|null;onend:(()=>void)|null;
 start():void;stop():void;abort():void;
}
export type VoiceState="IDLE"|"LISTENING"|"PROCESSING"|"SPEAKING";
export class VoiceController {
 state:VoiceState="IDLE";
 supported=false;
 muted=false;
 private recognition?:Recognition;
 private utterance?:SpeechSynthesisUtterance;
 private timer?:ReturnType<typeof setTimeout>;
 constructor(private change:(state:VoiceState)=>void,private transcript:(text:string)=>void,private error:(text:string)=>void){
  const host=window as unknown as {SpeechRecognition?:new()=>Recognition;webkitSpeechRecognition?:new()=>Recognition};
  const Factory=host.SpeechRecognition??host.webkitSpeechRecognition;
  this.supported=Boolean(Factory);
  if(Factory){
   const r=this.recognition=new Factory();r.lang=navigator.language||"en-US";r.continuous=false;r.interimResults=false;
   r.onresult=e=>{for(let i=e.resultIndex;i<e.results.length;i++)if(e.results[i].isFinal){this.setState("PROCESSING");this.transcript(e.results[i][0].transcript);}};
   r.onerror=e=>{this.setState("IDLE");this.error(`Microphone: ${e.error}. Use text or press Listen to retry.`);};
   r.onend=()=>{if(this.state==="LISTENING"){this.setState("IDLE");this.error("Listening ended. Press Listen to try again, or type your request.");}};
  }
 }
 setState(state:VoiceState){this.state=state;this.change(state);}
 listen(){this.stop();if(!this.recognition){this.error("Speech recognition is unavailable in this browser. Type your request.");return;}try{this.recognition.start();this.setState("LISTENING");}catch{this.setState("IDLE");this.error("Microphone could not start. Press Listen to retry.");}}
 speak(text:string){
  if(this.muted||!("speechSynthesis"in window)){this.setState("IDLE");return;}
  window.speechSynthesis.cancel();const u=this.utterance=new SpeechSynthesisUtterance(text);u.rate=1;u.pitch=.85;
  u.onend=()=>{if(this.utterance===u)this.setState("IDLE");};u.onerror=()=>{if(this.utterance===u){this.setState("IDLE");this.error("Voice output unavailable. The response is shown as text.");}};
  this.setState("SPEAKING");window.speechSynthesis.speak(u);
  clearTimeout(this.timer);this.timer=setTimeout(()=>{if(this.utterance===u)this.stop();},Math.min(120000,8000+text.length*100));
 }
 stop(){clearTimeout(this.timer);this.recognition?.abort();this.utterance=undefined;window.speechSynthesis?.cancel();this.setState("IDLE");}
 dispose(){this.stop();if(this.recognition){this.recognition.onresult=null;this.recognition.onerror=null;this.recognition.onend=null;}}
}
