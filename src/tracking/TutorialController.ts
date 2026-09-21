export interface TutorialSample {visible:boolean;x:number;y:number;pinch:number;state:string;click:boolean;hold:boolean;zoom:number;hands:number;onTarget?:boolean}
export const tutorialPrompts=[
 "Raise your hand. Keep an open palm in the camera zone.",
 "Move your hand to the glowing target.",
 "Move left, then right. Light both direction targets.",
 "Pinch to select the glowing button. Bring thumb and index together.",
 "Pinch and hold the object for half a second.",
 "Keep holding and drag the object sideways.",
 "Release. Push the cards left, then right with an open hand.",
 "Pinch with two hands. Move them apart, then together.",
 "Say: Jarvis, hello. Or explicitly choose text controls.",
];
export class TutorialController {
 stage=0;
 private since:number|null=null;
 private left=false;
 private anchor:number|null=null;
 private spread=false;
 voiceVerified=false;
 skipped:string[]=[];
 update(s:TutorialSample,t:number) {
  if(!s.visible){this.since=null;return;}
  switch(this.stage){
   case 0: if(s.pinch>.65){this.since??=t;if(t-this.since>=300)this.advance();}else this.since=null;break;
   case 1: if(s.onTarget)this.advance();break;
   case 2: if(s.x<.35)this.left=true;if(this.left&&s.x>.65)this.advance();break;
   case 3: if(s.click&&s.onTarget)this.advance();break;
   case 4: if(s.hold){this.since??=t;if(t-this.since>=550)this.advance();}else this.since=null;break;
   case 5: if(s.hold){this.anchor??=s.x;if(Math.abs(s.x-this.anchor)>.12)this.advance();}else this.anchor=null;break;
   case 6: if(s.pinch>.65){if(s.x<.35)this.left=true;if(this.left&&s.x>.65)this.advance();}break;
   case 7: if(s.hands===2){if(s.zoom>1.2)this.spread=true;if(this.spread&&s.zoom<.9)this.advance();}break;
  }
 }
 speech(text:string){if(this.stage===8&&/jarvis[,\s]+hello/i.test(text)){this.voiceVerified=true;this.advance();}}
 skipOptional(){if(this.stage===7||this.stage===8){this.skipped.push(this.stage===7?"two-hand zoom":"voice input");this.advance();}}
 private advance(){this.stage++;this.since=null;this.left=false;this.anchor=null;}
 get done(){return this.stage>=9;}
}
