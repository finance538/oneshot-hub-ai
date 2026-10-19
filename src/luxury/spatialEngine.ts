import * as THREE from "three";
import { gsap } from "gsap";

/** Public decorative scene; no business state, textures or network requests. */
export function createSpatialEngine(
  host: HTMLElement,
  energy: () => number,
  failed: () => void,
) {
  const renderer = new THREE.WebGLRenderer({
    alpha: true,
    antialias: true,
    powerPreference: "low-power",
  });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(
    Math.min(
      devicePixelRatio,
      matchMedia("(pointer: coarse)").matches ? 1.25 : 1.75,
    ),
  );
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 0, 11.5);
  const sculpture = new THREE.Group();
  sculpture.rotation.set(0.4, -0.3, -0.2);
  scene.add(sculpture);
  scene.add(new THREE.AmbientLight(0xe9dcca, 2.2));
  const key = new THREE.DirectionalLight(0xffe8c5, 5);
  key.position.set(-3, 5, 5);
  scene.add(key);
  const edge = new THREE.PointLight(0x7aab99, 45);
  edge.position.set(4, -2, 3);
  scene.add(edge);
  const gold = new THREE.MeshStandardMaterial({
    color: 0xbca98a,
    metalness: 0.86,
    roughness: 0.28,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x51615b,
    metalness: 0.28,
    roughness: 0.12,
    transparent: true,
    opacity: 0.5,
    clearcoat: 1,
    side: THREE.DoubleSide,
  });
  const wire = new THREE.LineBasicMaterial({
    color: 0x8b806e,
    transparent: true,
    opacity: 0.32,
  });
  const core = new THREE.Group();
  sculpture.add(core);
  [1.16, 1.33, 2.35, 2.85].forEach((radius, i) => {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, i < 2 ? 0.025 : 0.008, 8, 120),
      gold,
    );
    if (i === 3) ring.rotation.set(0.7, 0.2, 0);
    sculpture.add(ring);
  });
  // Six beveled glass shutter blades form the aperture at the heart of the hub.
  for (let i = 0; i < 6; i++) {
    const shape = new THREE.Shape();
    shape.moveTo(0.42, 0.3);
    shape.lineTo(1.16, 0.05);
    shape.lineTo(0.95, 0.94);
    shape.lineTo(0.12, 0.84);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.16,
      bevelEnabled: true,
      bevelThickness: 0.035,
      bevelSize: 0.035,
      bevelSegments: 2,
      steps: 1,
    });
    const blade = new THREE.Mesh(geometry, glass);
    blade.rotation.z = (i * Math.PI) / 3;
    const lines = new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      wire,
    );
    blade.add(lines);
    core.add(blade);
  }
  const satellites: THREE.Group[] = [];
  for (let i = 0; i < 5; i++) {
    const angle = (i / 5) * Math.PI * 2 + 0.25;
    const satellite = new THREE.Group();
    satellite.position.set(Math.cos(angle) * 2.35, Math.sin(angle) * 2.35, 0);
    satellite.rotation.set(0.25, 0.2, angle + 0.3);
    const geometry = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    satellite.add(new THREE.Mesh(geometry, glass));
    satellite.add(
      new THREE.LineSegments(new THREE.EdgesGeometry(geometry), wire),
    );
    sculpture.add(satellite);
    satellites.push(satellite);
  }
  const dots = new Float32Array(90 * 3);
  for (let i = 0; i < 90; i++) {
    const a = i * 2.399963,
      r = 2.9 + (i % 7) * 0.11;
    dots[i * 3] = Math.cos(a) * r;
    dots[i * 3 + 1] = Math.sin(a) * r;
    dots[i * 3 + 2] = -0.8;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute("position", new THREE.BufferAttribute(dots, 3));
  const dustMaterial = new THREE.PointsMaterial({
    color: 0xd3c4a9,
    size: 0.018,
    transparent: true,
    opacity: 0.5,
  });
  sculpture.add(new THREE.Points(dustGeometry, dustMaterial));
  let frame = 0,
    visible = true,
    enabled = true,
    destroyed = false,
    elapsed = 0,
    last = 0;
  const preference = matchMedia("(prefers-reduced-motion: reduce)");
  const render = () => renderer.render(scene, camera);
  const tick = (time: number) => {
    if (destroyed) return;
    elapsed += Math.min((time - (last || time)) / 1000, 0.05);
    last = time;
    core.rotation.z = Math.sin(elapsed * 0.14) * 0.09;
    const pulse = Math.max(0, Math.min(1, energy()));
    core.scale.setScalar(1 + pulse * 0.035);
    satellites.forEach((node, i) => {
      node.position.z = Math.sin(elapsed * 0.55 + i) * 0.14;
      node.rotation.y = elapsed * 0.12 + i;
    });
    render();
    frame = requestAnimationFrame(tick);
  };
  const sync = () => {
    cancelAnimationFrame(frame);
    if (preference.matches || document.hidden || !visible)
      gsap.killTweensOf(sculpture.rotation);
    last = 0;
    if (
      visible &&
      !document.hidden &&
      enabled &&
      !preference.matches &&
      !destroyed
    )
      frame = requestAnimationFrame(tick);
    else if (!destroyed) render();
  };
  const resize = new ResizeObserver(() => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    render();
  });
  resize.observe(host);
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    sync();
  });
  observer.observe(host);
  const pointer = (event: PointerEvent) => {
    if (!enabled || preference.matches) return;
    const r = host.getBoundingClientRect();
    gsap.to(sculpture.rotation, {
      x: 0.4 + ((event.clientY - r.top) / r.height - 0.5) * 0.28,
      y: -0.3 + ((event.clientX - r.left) / r.width - 0.5) * 0.4,
      duration: 1,
      overwrite: true,
      ease: "power2.out",
    });
  };
  const reset = () => {
    if (!enabled || preference.matches || destroyed) return;
    gsap.to(sculpture.rotation, {
      x: 0.4,
      y: -0.3,
      duration: 1,
      overwrite: true,
    });
  };
  const lost = (event: Event) => {
    event.preventDefault();
    cancelAnimationFrame(frame);
    failed();
  };
  host.parentElement?.addEventListener("pointermove", pointer);
  host.parentElement?.addEventListener("pointerleave", reset);
  renderer.domElement.addEventListener("webglcontextlost", lost);
  document.addEventListener("visibilitychange", sync);
  preference.addEventListener("change", sync);
  sync();
  return {
    motion(value: boolean) {
      enabled = value;
      gsap.killTweensOf(sculpture.rotation);
      sync();
    },
    dispose() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      resize.disconnect();
      gsap.killTweensOf(sculpture.rotation);
      host.parentElement?.removeEventListener("pointermove", pointer);
      host.parentElement?.removeEventListener("pointerleave", reset);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      document.removeEventListener("visibilitychange", sync);
      preference.removeEventListener("change", sync);
      scene.traverse((object) => {
        if (
          object instanceof THREE.Mesh ||
          object instanceof THREE.LineSegments ||
          object instanceof THREE.Points
        )
          object.geometry.dispose();
      });
      [gold, glass, wire, dustMaterial].forEach((material) =>
        material.dispose(),
      );
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
