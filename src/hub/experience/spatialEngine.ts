import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { bladeOutlines, bladeColours, goldBlades, hub } from "./markShape";

/**
 * The mark, cut rather than downloaded: each blade outline is extruded with a
 * small bevel so its edges catch the light, and the hub is three plain discs.
 * Champagne and titanium are read as metal, which is what gives the aperture
 * its depth as the visitor turns it.
 */
function buildMark(layer: number) {
  const group = new THREE.Group();
  const parts: THREE.Mesh[] = [];
  const depth = 0.08;
  const bevel = 0.012;
  const cut = (shape: THREE.Shape, thickness: number) => {
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 2,
      curveSegments: 72,
      steps: 1,
    });
    geometry.translate(0, 0, -thickness / 2);
    return geometry;
  };
  const add = (
    geometry: THREE.BufferGeometry,
    colour: number,
    metalness: number,
    roughness: number,
    z = 0,
  ) => {
    const mesh = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: colour,
        metalness,
        roughness,
        envMapIntensity: 1.15,
        transparent: true,
        opacity: 0,
      }),
    );
    mesh.position.z = z;
    mesh.layers.set(layer);
    mesh.frustumCulled = false;
    group.add(mesh);
    parts.push(mesh);
  };
  bladeOutlines.forEach((outline, i) => {
    const shape = new THREE.Shape();
    outline.forEach(([x, y], n) =>
      n ? shape.lineTo(x, y) : shape.moveTo(x, y),
    );
    shape.closePath();
    add(
      cut(shape, depth),
      bladeColours[i],
      goldBlades[i] ? 0.88 : 0.82,
      goldBlades[i] ? 0.3 : 0.24,
    );
  });
  const disc = new THREE.Shape();
  disc.absarc(0, 0, hub.disc, 0, Math.PI * 2, false);
  add(cut(disc, depth * 1.45), hub.charcoal, 0.55, 0.42);
  const ring = new THREE.Shape();
  ring.absarc(0, 0, hub.ringOuter, 0, Math.PI * 2, false);
  const hole = new THREE.Path();
  hole.absarc(0, 0, hub.ringInner, 0, Math.PI * 2, true);
  ring.holes.push(hole);
  add(cut(ring, depth * 0.5), hub.champagne, 0.9, 0.26, depth * 0.78);
  const dot = new THREE.Shape();
  dot.absarc(0, 0, hub.dot, 0, Math.PI * 2, false);
  add(cut(dot, depth * 0.5), hub.champagne, 0.9, 0.26, depth * 0.78);
  return { group, parts };
}

/**
 * The hero scene: the OneShot mark in three dimensions, turned by the visitor,
 * inside a decorative orbit. Navigation remains native DOM links above the canvas.
 */
export function createSpatialScene(
  host: HTMLElement,
  energy: { current: number },
  calm: boolean,
  onLost: () => void,
  grab?: HTMLElement | null,
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
  // The mark sits at the centre of the orbit and is what the visitor turns.
  const markLayer = 1;
  const markPivot = new THREE.Group();
  markPivot.position.z = 3.3;
  scene.add(markPivot);
  const rings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.16 + i * 0.4, i === 0 ? 0.035 : 0.012, 10, 150),
      i === 1 ? titanium : gold,
    );
    ring.rotation.set(0.7 + i * 0.5, 0.4 + i * 0.65, i * 0.6);
    sculpture.add(ring);
    rings.push(ring);
  }
  const satellites: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const tile = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.3), glass);
    const angle = (i / 5) * Math.PI * 2;
    tile.position.set(
      Math.cos(angle) * 2.9,
      Math.sin(angle) * 2.45,
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
  // The decorative orbit is lit warm; the mark needs neutral light to keep its
  // own colours, so it sits on its own layer with its own rig and a second pass.
  const markKey = new THREE.DirectionalLight(0xffffff, 0.82);
  markKey.position.set(2.6, 3.4, 5.2);
  const markFill = new THREE.DirectionalLight(0xcfbc97, 0.3);
  markFill.position.set(-3.6, -1.2, 3.4);
  const markAmbient = new THREE.AmbientLight(0xffffff, 0.1);
  for (const lamp of [markKey, markFill, markAmbient]) {
    lamp.layers.set(markLayer);
    scene.add(lamp);
  }
  camera.layers.enable(markLayer);
  renderer.autoClear = false;
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
  // Resting pose: a slight turn, so the mark reads as an object and not a picture.
  const restSpin = -0.26,
    restTilt = 0.07;
  let spin = restSpin,
    tilt = restTilt,
    spinSpeed = 0,
    tiltSpeed = 0,
    entrance = 0,
    markSize = 1,
    loaded = false,
    dragging = false,
    activePointer = -1,
    lastX = 0,
    lastY = 0,
    lastAt = 0,
    idle = 0;
  const markMaterials: THREE.Material[] = [];
  const markGeometries: THREE.BufferGeometry[] = [];
  const move = (e: PointerEvent) => {
    if (dragging) return;
    const rect = host.getBoundingClientRect();
    pointerX = ((e.clientX - rect.left) / rect.width - 0.5) * 0.4;
    pointerY = ((e.clientY - rect.top) / rect.height - 0.5) * 0.3;
  };
  const reset = () => {
    if (dragging) return;
    pointerX = 0;
    pointerY = 0;
  };
  const mark = buildMark(markLayer);
  // The outlines are unit-radius, so one number sets how large the mark reads.
  mark.group.scale.setScalar(1.02);
  markPivot.add(mark.group);
  for (const part of mark.parts) {
    markMaterials.push(part.material as THREE.Material);
    markGeometries.push(part.geometry);
  }
  loaded = true;
  const turn = (dx: number, dy: number) => {
    spin += dx;
    tilt = Math.max(-0.58, Math.min(0.58, tilt + dy));
    idle = 0;
  };
  const down = (e: PointerEvent) => {
    if (!loaded || activePointer !== -1) return;
    dragging = true;
    activePointer = e.pointerId;
    lastX = e.clientX;
    lastY = e.clientY;
    lastAt = performance.now();
    spinSpeed = 0;
    tiltSpeed = 0;
    grab?.classList.add("is-turning");
    grab?.setPointerCapture?.(e.pointerId);
    start();
  };
  const drag = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== activePointer) return;
    const now = performance.now();
    const dx = (e.clientX - lastX) * 0.0085;
    const dy = (e.clientY - lastY) * 0.0055;
    const dt = Math.max((now - lastAt) / 1000, 0.008);
    turn(dx, dy);
    spinSpeed = dx / dt;
    tiltSpeed = dy / dt;
    lastX = e.clientX;
    lastY = e.clientY;
    lastAt = now;
    start();
  };
  const up = (e: PointerEvent) => {
    if (e.pointerId !== activePointer) return;
    dragging = false;
    activePointer = -1;
    grab?.classList.remove("is-turning");
    if (performance.now() - lastAt > 90) {
      spinSpeed = 0;
      tiltSpeed = 0;
    }
    spinSpeed = Math.max(-6, Math.min(6, spinSpeed));
    tiltSpeed = Math.max(-3, Math.min(3, tiltSpeed));
    start();
  };
  const keys: Record<string, [number, number]> = {
    ArrowLeft: [-0.24, 0],
    ArrowRight: [0.24, 0],
    ArrowUp: [0, -0.12],
    ArrowDown: [0, 0.12],
  };
  const press = (e: KeyboardEvent) => {
    const step = keys[e.key];
    if (step) {
      e.preventDefault();
      turn(step[0], step[1]);
      start();
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      spin = restSpin;
      tilt = restTilt;
      spinSpeed = 0;
      tiltSpeed = 0;
      start();
    }
  };
  const recentre = () => {
    spin = restSpin;
    tilt = restTilt;
    spinSpeed = 0;
    tiltSpeed = 0;
    start();
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
    const still = motion.matches;
    if (!still) {
      elapsed += dt * (calm ? 0.3 : 1);
      sculpture.rotation.y +=
        (pointerX - sculpture.rotation.y) * Math.min(1, dt * 3);
      sculpture.rotation.x +=
        (pointerY - sculpture.rotation.x) * Math.min(1, dt * 3);
      rings[0].rotation.z = elapsed * 0.06;
      satellites.forEach((tile, i) => {
        tile.rotation.y += dt * 0.12;
        tile.position.z = Math.sin(elapsed * 0.3 + i) * 0.3;
      });
      sculpture.position.y = Math.sin(elapsed * 0.4) * 0.07;
      markPivot.position.y = Math.sin(elapsed * 0.4) * 0.05;
    }
    if (loaded) {
      if (entrance < 1) {
        entrance = Math.min(1, entrance + dt * 1.8);
        const eased = 1 - Math.pow(1 - entrance, 3);
        for (const material of markMaterials) {
          material.opacity = eased;
          if (entrance >= 1) material.transparent = false;
        }
      }
      if (!dragging) {
        spin += spinSpeed * dt;
        tilt = Math.max(-0.58, Math.min(0.58, tilt + tiltSpeed * dt));
        const decay = Math.pow(0.0023, dt);
        spinSpeed *= decay;
        tiltSpeed *= decay;
        if (Math.abs(spinSpeed) < 0.02) spinSpeed = 0;
        if (Math.abs(tiltSpeed) < 0.02) tiltSpeed = 0;
        idle += dt;
        // Once it is left alone the mark drifts back and keeps a slow turn.
        if (!spinSpeed && !tiltSpeed) {
          tilt += (restTilt - tilt) * Math.min(1, dt * 1.1);
          if (!still && idle > 1.6)
            spin += dt * (calm ? 0.16 : 0.3) * Math.min(1, (idle - 1.6) / 1.2);
        }
      }
      markPivot.rotation.y = spin;
      markPivot.rotation.x = tilt;
      const eased = 1 - Math.pow(1 - entrance, 3);
      const pulse = still ? 1 : 1 + Math.min(energy.current, 0.5) * 0.08;
      markPivot.scale.setScalar((0.82 + eased * 0.18) * pulse * markSize);
    }
    renderer.clear();
    camera.layers.set(0);
    renderer.render(scene, camera);
    camera.layers.set(markLayer);
    renderer.render(scene, camera);
    const busy =
      dragging ||
      entrance < 1 ||
      Math.abs(spinSpeed) > 0 ||
      Math.abs(tiltSpeed) > 0 ||
      (loaded && Math.abs(tilt - restTilt) > 0.001);
    if (!still || busy) frame = requestAnimationFrame(draw);
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
    // On a phone the destination cards crowd the stage, so the mark gives way.
    markSize = w < 520 ? 0.88 : 1;
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
  grab?.addEventListener("pointerdown", down as EventListener);
  grab?.addEventListener("pointermove", drag as EventListener);
  grab?.addEventListener("pointerup", up as EventListener);
  grab?.addEventListener("pointercancel", up as EventListener);
  grab?.addEventListener("keydown", press as EventListener);
  grab?.addEventListener("dblclick", recentre);
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
    grab?.removeEventListener("pointerdown", down as EventListener);
    grab?.removeEventListener("pointermove", drag as EventListener);
    grab?.removeEventListener("pointerup", up as EventListener);
    grab?.removeEventListener("pointercancel", up as EventListener);
    grab?.removeEventListener("keydown", press as EventListener);
    grab?.removeEventListener("dblclick", recentre);
    grab?.classList.remove("is-turning");
    renderer.domElement.removeEventListener("webglcontextlost", contextLost);
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.LineSegments)
        object.geometry.dispose();
    });
    markMaterials.forEach((material) => material.dispose());
    markGeometries.forEach((geometry) => geometry.dispose());
    markPivot.clear();
    gold.dispose();
    titanium.dispose();
    glass.dispose();
    environment.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    renderer.domElement.remove();
  };
}
