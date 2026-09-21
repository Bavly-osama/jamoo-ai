/** Position is measured in card widths, with physical right always positive. */
export class CarouselController {
 position=0;
 velocity=0;
 private last?: {x:number;t:number};
 constructor(public count:number) {}
 select(index:number) {this.position=-Math.max(0,Math.min(this.count-1,index));this.velocity=0;this.last=undefined;}
 move(x:number,t:number,sensitivity=4) {
  if(this.last) {
   const dt=Math.max(.016,Math.min(.1,(t-this.last.t)/1000));
   let dx=(x-this.last.x)*sensitivity;
   if(Math.abs(dx)<.003) return;
   dx=Math.max(-.4,Math.min(.4,dx));
   if(this.position>0&&dx>0 || this.position<1-this.count&&dx<0) dx*=.2;
   this.position+=dx;
   this.velocity=Math.max(-5,Math.min(5,.55*this.velocity+.45*dx/dt));
  }
  this.last={x,t};
 }
 release() {this.last=undefined;}
 stop() {this.release();this.velocity=0;}
 tick(dt:number) {
  if(this.last)return;
  dt=Math.max(0,Math.min(.033,dt));
  const edge=Math.max(1-this.count,Math.min(0,this.position));
  this.velocity+=(edge-this.position)*90*dt;
  this.velocity*=Math.exp(-7*dt);
  this.position+=this.velocity*dt;
  if(Math.abs(this.velocity)<.002 && Math.abs(edge-this.position)<.002){this.position=edge;this.velocity=0;}
 }
 get index(){return Math.max(0,Math.min(this.count-1,Math.round(-this.position)));}
}
