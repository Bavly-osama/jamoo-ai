import type { GestureEvent } from "../tracking/GestureEngine";
export class InteractionManager {
  selected = "core";
  pad = 28;
  private grabbed: HTMLElement | null = null;
  private offset = { x: 0, y: 0 };
  private position = { x: 0, y: 0 };
  private goal = { x: 0, y: 0 };
  private velocity = { x: 0, y: 0 };
  hit(x: number, y: number, pad = this.pad) {
    const modal = document.querySelector(".welcome:not([hidden])") ?? document.querySelector("#activity:not([hidden])");
    const elements = [
      ...document.querySelectorAll<HTMLElement>("[data-target]"),
    ].reverse();
    const find=(exact:boolean)=>elements.find((el) => {
        if (
          el.closest("[hidden]") ||
          el.hasAttribute("disabled") ||
          (modal && !modal.contains(el) && !el.closest("#assistant-panel:not([hidden])"))
        )
          return false;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.bottom < 0 || r.top > innerHeight) return false;
        const soft = exact ? 0 :
          el.dataset.target === "tutorial"
            ? Math.max(pad, 56)
            : el.dataset.target === "core"
              ? Math.max(pad, 72)
              : el.dataset.target === "hologram-scale"
                ? Math.max(pad, 40)
                : pad;
        return (
          x >= r.left - soft &&
          x <= r.right + soft &&
          y >= r.top - soft &&
          y <= r.bottom + soft
        );
      });
    // Expanded targets assist imprecise hands but must never steal an exact hit.
    return (find(true)??find(false))?.dataset.target??null;
  }
  handle(event: GestureEvent) {
    if (event.type === "click" && event.target) {
      const el = [
        ...document.querySelectorAll<HTMLElement>("[data-target]"),
      ].find(
        (el) => el.dataset.target === event.target && !el.closest("[hidden]"),
      );
      if (!el) return;
      this.selected = event.target;
      if(el instanceof HTMLInputElement && el.type==="range" && event.point){
        const r=el.getBoundingClientRect(),min=Number(el.min)||0,max=Number(el.max)||100;
        el.value=String(min+Math.max(0,Math.min(1,(event.point.x*innerWidth-r.left)/r.width))*(max-min));
        el.dispatchEvent(new Event("input",{bubbles:true}));
      }
      el.click();
      if (el.dataset.draggable === "true" && event.point) {
        this.grabbed = el;
        this.position = {
          x: Number(el.dataset.x ?? 0),
          y: Number(el.dataset.y ?? 0),
        };
        this.goal = { ...this.position };
        this.offset = {
          x: event.point.x * innerWidth - this.position.x,
          y: event.point.y * innerHeight - this.position.y,
        };
        el.classList.add("grabbed");
      }
    }
    if (event.type === "drag" && this.grabbed && event.point)
      this.goal = {
        x: Math.max(
          -innerWidth * 0.3,
          Math.min(
            innerWidth * 0.3,
            event.point.x * innerWidth - this.offset.x,
          ),
        ),
        y: Math.max(
          -innerHeight * 0.2,
          Math.min(
            innerHeight * 0.2,
            event.point.y * innerHeight - this.offset.y,
          ),
        ),
      };
    if (event.type === "drop") this.release();
  }
  tick(dt: number) {
    if (!this.grabbed) return;
    dt = Math.min(dt, 0.033);
    for (const axis of ["x", "y"] as const) {
      this.velocity[axis] += (this.goal[axis] - this.position[axis]) * 220 * dt;
      this.velocity[axis] *= Math.exp(-26 * dt);
      this.position[axis] += this.velocity[axis] * dt;
    }
    this.grabbed.style.translate = `${this.position.x}px ${this.position.y}px`;
    this.grabbed.dataset.x = String(this.position.x);
    this.grabbed.dataset.y = String(this.position.y);
  }
  release() {
    this.grabbed?.classList.remove("grabbed");
    this.grabbed = null;
    this.velocity = { x: 0, y: 0 };
  }
  reset() {
    this.release();
    document.querySelectorAll<HTMLElement>("[data-draggable]").forEach((el) => {
      el.style.translate = "";
      el.dataset.x = "0";
      el.dataset.y = "0";
    });
  }
}
