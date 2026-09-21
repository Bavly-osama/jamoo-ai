import * as THREE from "three";

const CYAN = 0x5be6f5;
const TEAL = 0x227e91;
const WHITE = 0xb9f9ff;

const line = (color: number, opacity: number) =>
  new THREE.LineBasicMaterial({ color, transparent: true, opacity });

const glow = (color: number, opacity: number) =>
  new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

export class JarvisScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  private views: Record<"core" | "globe" | "scanner" | "systems", THREE.Group>;
  private rings: THREE.Object3D[] = [];
  private orbit: THREE.Group;
  private particles: THREE.Points;
  private scan: THREE.Mesh;
  private sweep!: THREE.Mesh<THREE.CircleGeometry, THREE.MeshBasicMaterial>;
  private corePulse!: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  private extras: THREE.Object3D[] = [];
  private resizeObserver: ResizeObserver;
  private scanTime = { value: 0 };
  scale = 1;
  rotationSpeed = 1;
  focus: "core" | "globe" | "scanner" | "systems" = "core";
  private reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  private quality = "";
  private manualRotation = {x:0,y:0};
  private contextLost=false;
  setRotation(x:number,y:number){this.manualRotation={x,y};}
  pickGlobe(x:number,y:number){
    const r=this.container.getBoundingClientRect();
    const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(((x*innerWidth-r.left)/r.width)*2-1,1-((y*innerHeight-r.top)/r.height)*2),this.camera);
    const hit=ray.intersectObject(this.views.globe.children[0])[0];if(!hit)return null;
    const p=this.views.globe.worldToLocal(hit.point.clone()).normalize();
    return {lat:Math.asin(p.y)*180/Math.PI,lon:Math.atan2(p.z,p.x)*180/Math.PI};
  }
  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setClearColor(0x000000, 0);
    this.container.appendChild(this.renderer.domElement);
    this.renderer.domElement.setAttribute("aria-hidden", "true");
    this.renderer.domElement.addEventListener("webglcontextlost",e=>{e.preventDefault();this.contextLost=true;this.container.dataset.context="lost";});
    this.renderer.domElement.addEventListener("webglcontextrestored",()=>{this.contextLost=false;this.quality="";delete this.container.dataset.context;});
    this.camera.position.z = 9;
    const core = this.buildCore();
    const globe = this.buildGlobe();
    const scanner = this.buildScanner();
    const systems = this.buildSystems();
    globe.visible = scanner.visible = systems.visible = false;
    this.views = { core, globe, scanner, systems };
    this.scene.add(core, globe, scanner, systems);
    this.orbit = this.buildOrbit();
    this.scene.add(this.orbit);
    this.scan = this.buildScanPlane();
    this.scene.add(this.scan);
    this.particles = this.buildParticles();
    this.scene.add(this.particles);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }
  private buildCore() {
    const group = new THREE.Group();
    this.corePulse = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), glow(WHITE, 0.7));
    group.add(this.corePulse);
    group.add(new THREE.Mesh(new THREE.SphereGeometry(0.48, 20, 14), glow(CYAN, 0.22)));
    group.add(
      new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.82, 1),
        new THREE.MeshBasicMaterial({
          color: CYAN,
          wireframe: true,
          transparent: true,
          opacity: 0.42,
        }),
      ),
    );
    group.add(
      new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.OctahedronGeometry(1.12)),
        line(TEAL, 0.55),
      ),
    );
    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.08 + i * 0.16, i === 0 ? 0.02 : 0.008, 6, 96, i % 2 ? Math.PI * 1.55 : Math.PI * 2),
        new THREE.MeshBasicMaterial({
          color: i % 2 ? TEAL : CYAN,
          transparent: true,
          opacity: i % 2 ? 0.4 : 0.72,
        }),
      );
      ring.rotation.set(i === 1 ? 0.7 : 0, i === 2 ? 0.55 : i === 4 ? 0.35 : 0, 0);
      this.rings.push(ring);
      group.add(ring);
    }
    const ticks = [];
    for (let i = 0; i < 96; i++) {
      const a = (i / 96) * Math.PI * 2,
        r = i % 4 === 0 ? 2.22 : 2.1;
      ticks.push(Math.cos(a) * 2.02, Math.sin(a) * 2.02, 0, Math.cos(a) * r, Math.sin(a) * r, 0);
    }
    group.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(ticks, 3)),
        line(CYAN, 0.4),
      ),
    );
    return group;
  }
  private buildGlobe() {
    const group = new THREE.Group();
    group.add(
      new THREE.Mesh(
        new THREE.SphereGeometry(1.38, 32, 20),
        new THREE.MeshBasicMaterial({
          color: TEAL,
          wireframe: true,
          transparent: true,
          opacity: 0.35,
        }),
      ),
    );
    const random = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const land = [];
    for (let i = 0; i < 1300; i++) {
      const a = random(i) * Math.PI * 2,
        b = Math.acos(2 * random(i + 3000) - 1);
      if (Math.sin(a * 3 + Math.cos(b * 5)) * Math.cos(b * 4) > 0.05)
        land.push(1.4 * Math.sin(b) * Math.cos(a), 1.4 * Math.cos(b), 1.4 * Math.sin(b) * Math.sin(a));
    }
    group.add(
      new THREE.Points(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(land, 3)),
        new THREE.PointsMaterial({ size: 0.024, color: CYAN, transparent: true, opacity: 0.88 }),
      ),
    );
    const meridians = [];
    for (let m = 0; m < 6; m++) {
      const yaw = (m / 6) * Math.PI;
      for (let i = 0; i <= 48; i++) {
        const p = (i / 48) * Math.PI;
        meridians.push(1.42 * Math.sin(p) * Math.cos(yaw), 1.42 * Math.cos(p), 1.42 * Math.sin(p) * Math.sin(yaw));
      }
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(meridians, 3)),
        line(CYAN, 0.22),
      ),
    );
    const equator = new THREE.Mesh(new THREE.TorusGeometry(1.42, 0.008, 6, 96), glow(CYAN, 0.55));
    equator.rotation.x = Math.PI / 2;
    this.extras.push(equator);
    group.add(equator);
    return group;
  }
  private buildScanner() {
    const group = new THREE.Group();
    for (const r of [0.7, 1.2, 1.75])
      group.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.01, 6, 80), glow(CYAN, r === 1.2 ? 0.7 : 0.35)));
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.78, 64),
      new THREE.MeshBasicMaterial({
        color: TEAL,
        transparent: true,
        opacity: 0.16,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    disc.rotation.x = -Math.PI / 2;
    group.add(disc);
    this.sweep = new THREE.Mesh(new THREE.CircleGeometry(1.76, 32, 0, Math.PI * 0.38), glow(CYAN, 0.28));
    this.sweep.rotation.x = -Math.PI / 2;
    this.sweep.material.side = THREE.DoubleSide;
    group.add(this.sweep);
    const random = (n: number) => {
      const x = Math.sin(n * 91.7) * 43758.5453;
      return x - Math.floor(x);
    };
    for (let i = 0; i < 3; i++) {
      const a = random(i + 2) * Math.PI * 2,
        r = 0.45 + random(i + 9) * 1.1;
      const blip = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), glow(WHITE, 0.95));
      blip.position.set(Math.cos(a) * r, 0.04, Math.sin(a) * r);
      group.add(blip);
    }
    group.rotation.x = 0.55;
    return group;
  }
  private buildSystems() {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.7 + i * 0.28, 0.01, 6, 64),
        glow(i % 2 ? TEAL : CYAN, 0.45),
      );
      ring.position.y = (i - 1.5) * 0.42;
      ring.rotation.x = Math.PI / 2;
      this.rings.push(ring);
      group.add(ring);
    }
    const bars = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2,
        h = 0.4 + (i % 4) * 0.22;
      bars.push(Math.cos(a) * 1.15, -h, Math.sin(a) * 1.15, Math.cos(a) * 1.15, h, Math.sin(a) * 1.15);
    }
    group.add(
      new THREE.LineSegments(
        new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(bars, 3)),
        line(CYAN, 0.45),
      ),
    );
    group.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.38), glow(WHITE, 0.5)));
    return group;
  }
  private buildOrbit() {
    const group = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const node = new THREE.Group();
      node.add(new THREE.Mesh(new THREE.OctahedronGeometry(0.09), glow(CYAN, 0.8)));
      node.add(new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.008, 6, 24), glow(WHITE, 0.55)));
      node.userData.index = i;
      group.add(node);
    }
    this.extras.push(group);
    return group;
  }
  private buildScanPlane() {
    const material = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uTime: this.scanTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){
          vec2 p = vUv - 0.5;
          float r = length(p) * 2.0;
          float ring = smoothstep(0.035, 0.0, abs(r - fract(uTime * 0.12)));
          float grid = 0.05 * (step(0.94, fract(vUv.x * 16.0)) + step(0.94, fract(vUv.y * 16.0)));
          float a = (ring * 0.4 + grid) * smoothstep(1.05, 0.15, r);
          gl_FragColor = vec4(0.5, 0.92, 1.0, a);
        }`,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 6.4), material);
    this.extras.push(mesh);
    return mesh;
  }
  private buildParticles() {
    const random = (n: number) => {
      const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
      return x - Math.floor(x);
    };
    const points = [];
    for (let i = 0; i < 500; i++)
      points.push((random(i + 5000) - 0.5) * 15, (random(i + 6000) - 0.5) * 10, (random(i + 7000) - 0.5) * 5 - 3);
    return new THREE.Points(
      new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3)),
      new THREE.PointsMaterial({ color: 0x50bacc, size: 0.012, transparent: true, opacity: 0.45 }),
    );
  }
  private resize() {
    const { width, height } = this.container.getBoundingClientRect();
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.position.z = width < 600 ? 12 : 9;
    this.camera.updateProjectionMatrix();
  }
  render(t: number, quality: string, point = { x: 0.5, y: 0.5 }) {
    if(this.contextLost)return;
    if (this.quality !== quality) {
      this.quality = quality;
      this.renderer.setPixelRatio(Math.min(devicePixelRatio, quality === "HIGH" ? 1.75 : quality === "MEDIUM" ? 1.25 : 1));
      this.particles.geometry.setDrawRange(0, quality === "HIGH" ? 500 : quality === "MEDIUM" ? 200 : 60);
      const rich = quality !== "LOW";
      this.extras.forEach((object) => (object.visible = rich));
      this.orbit.visible = rich;
      this.scan.visible = quality === "HIGH";
    }
    (Object.keys(this.views) as Array<keyof typeof this.views>).forEach((key) => {
      this.views[key].visible = this.focus === key;
    });
    const object = this.views[this.focus];
    const scale = object.scale.x + (this.scale - object.scale.x) * 0.1;
    object.scale.setScalar(scale);
    const near = 1 - Math.min(1, Math.hypot(point.x - 0.5, point.y - 0.45) * 2.2);
    this.corePulse.material.opacity = 0.45 + near * 0.4;
    this.corePulse.scale.setScalar(1 + near * 0.18);
    this.scanTime.value = t * 0.001;
    if (!this.reduced) {
      this.rings.forEach((r, i) => {
        r.rotation.z = t * 0.00008 * (i % 2 ? 1 : -1) * (1 + i * 0.12) * this.rotationSpeed;
      });
      this.views.core.children[2].rotation.y = t * 0.00016;
      this.views.globe.rotation.y = this.manualRotation.y + t * 0.00006 * this.rotationSpeed;
      this.views.systems.rotation.y = t * 0.00012 * this.rotationSpeed;
      if (this.sweep) this.sweep.rotation.z = t * 0.0012;
      this.particles.rotation.z = t * 0.000008;
      this.orbit.children.forEach((node, i) => {
        const a = t * 0.00025 + (i * Math.PI) / 2;
        node.position.set(Math.cos(a) * 2.55, Math.sin(a * 2) * 0.12, Math.sin(a) * 2.55);
        (node as THREE.Group).children[1].visible = i === (this.focus === "core" ? 0 : this.focus === "globe" ? 1 : this.focus === "scanner" ? 2 : 3);
      });
    }
    object.rotation.x += (this.manualRotation.x + 0.1 * (point.y - 0.5) - object.rotation.x) * 0.15;
    if(this.focus!=="globe")object.rotation.y += (this.manualRotation.y + 0.14 * (point.x - 0.5) - object.rotation.y) * 0.15;
    this.camera.position.x += (0.35 * (point.x - 0.5) - this.camera.position.x) * 0.04;
    this.camera.position.y += (-0.22 * (point.y - 0.5) - this.camera.position.y) * 0.04;
    this.camera.lookAt(0, 0, 0);
    this.renderer.render(this.scene, this.camera);
  }
  dispose() {
    this.resizeObserver.disconnect();
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh;
      mesh.geometry?.dispose();
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((m) => m?.dispose());
    });
    this.renderer.dispose();
  }
}
