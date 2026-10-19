import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

/** A decorative scene. Navigation remains native DOM links above the canvas. */
export function createSpatialScene(
  host: HTMLElement,
  energy: { current: number },
  calm: boolean,
  onLost: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      matchMedia("(pointer: coarse)").matches ? 1.35 : 1.8,
    ),
  );
  renderer.setClearColor(0x101211, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(37, 1, 0.1, 80);
  camera.position.set(0, 0, 10.5);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  room.dispose();
  pmrem.dispose();
  const sculpture = new THREE.Group();
  scene.add(sculpture);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xc5b69b,
    metalness: 0.92,
    roughness: 0.24,
  });
  const titanium = new THREE.MeshStandardMaterial({
    color: 0x858982,
    metalness: 0.94,
    roughness: 0.3,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: calm ? 0x799c88 : 0xc8c8b4,
    metalness: 0.08,
    roughness: 0.16,
    transmission: 0.91,
    thickness: 1.6,
    ior: 1.45,
    transparent: true,
    opacity: 0.9,
    clearcoat: 1,
    envMapIntensity: 1.4,
  });
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.22, 0), glass);
  core.rotation.set(0.3, 0.6, 0.1);
  sculpture.add(core);
  const inner = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.68, 0),
    titanium,
  );
  sculpture.add(inner);
  const wire = new THREE.LineSegments(
    new THREE.EdgesGeometry(core.geometry),
    new THREE.LineBasicMaterial({
      color: 0xcfc2a3,
      transparent: true,
      opacity: 0.45,
    }),
  );
  core.add(wire);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(
        1.64 + i * 0.36,
        i === 0 ? 0.035 : 0.012,
        10,
        150,
      ),
      i === 1 ? titanium : gold,
    );
    ring.rotation.set(0.7 + i * 0.5, 0.4 + i * 0.65, i * 0.6);
    sculpture.add(ring);
    rings.push(ring);
  }
  const satellites: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), glass);
    const angle = (i / 5) * Math.PI * 2;
    tile.position.set(
      Math.cos(angle) * 2.5,
      Math.sin(angle) * 2.1,
      Math.sin(angle * 2) * 0.4,
    );
    tile.rotation.set(i * 0.4, 0.8, 0.2);
    sculpture.add(tile);
    satellites.push(tile);
  }
  const light = new THREE.PointLight(0xdfccaa, 35, 20);
  light.position.set(3, 4, 5);
  scene.add(light, new THREE.AmbientLight(0x99ac9b, 1.4));
  const back = new THREE.PointLight(0x719b84, 18, 15);
  back.position.set(-3, -1, 2);
  scene.add(back);
  let frame = 0,
    visible = true,
    disposed = false,
    lost = false,
    last = 0,
    elapsed = 0,
    slowFrames = 0;
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let pointerX = 0,
    pointerY = 0;
  const move = (e: PointerEvent) => {
    const rect = host.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.4;
    pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.3;
  };
  const reset = () => {
    pointerX = 0;
    pointerY = 0;
  };
  const draw = (now: number) => {
    frame = 0;
    if (disposed || lost || !visible || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, 0.05) : 0;
    if (last && now - last > 28) slowFrames++;
    if (slowFrames > 70 && renderer.getPixelRatio() > 1) {
      renderer.setPixelRatio(1);
      resize();
      slowFrames = 0;
    }
    last = now;
    if (!motion.matches) {
      elapsed += dt * (calm ? 0.3 : 1);
      sculpture.rotation.y +=
        (pointerX - sculpture.rotation.y) * Math.min(1, dt * 3);
      sculpture.rotation.x +=
        (pointerY - sculpture.rotation.x) * Math.min(1, dt * 3);
      core.rotation.y += dt * 0.1;
      inner.rotation.y -= dt * 0.12;
      rings[0].rotation.z = elapsed * 0.06;
      satellites.forEach((tile, i) => {
        tile.rotation.y += dt * 0.12;
        tile.position.z = Math.sin(elapsed * 0.3 + i) * 0.3;
      });
      sculpture.position.y = Math.sin(elapsed * 0.4) * 0.07;
      const scale = 1 + Math.min(energy.current, 0.5) * 0.12;
      core.scale.setScalar(scale);
    }
    renderer.render(scene, camera);
    if (!motion.matches) frame = requestAnimationFrame(draw);
  };
  const start = () => {
    if (!frame && !disposed && !lost) {
      last = 0;
      frame = requestAnimationFrame(draw);
    }
  };
  const resize = () => {
    const w = host.clientWidth,
      h = host.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    start();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible) start();
    else {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  });
  intersection.observe(host);
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else start();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    onLost();
  };
  const surface = host.closest(".lux-spatial") || host;
  surface.addEventListener("pointermove", move as EventListener);
  surface.addEventListener("pointerleave", reset);
  renderer.domElement.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibility);
  motion.addEventListener("change", start);
  resize();
  return () => {
    disposed = true;
    cancelAnimationFrame(frame);
    observer.disconnect();
    intersection.disconnect();
    document.removeEventListener("visibilitychange", visibility);
    motion.removeEventListener("change", start);
    surface.removeEventListener("pointermove", move as EventListener);
    surface.removeEventListener("pointerleave", reset);
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
        object.geometry.dispose();
    });
    gold.dispose();
    titanium.dispose();
    glass.dispose();
    (wire.material as THREE.Material).dispose();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
