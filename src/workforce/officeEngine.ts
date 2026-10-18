import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

// Loaded only when the merchant opens headquarters. No models, HDR maps,
// post-processing, real-time shadows, or additional network requests.
export type OfficeState = {
  selected: string;
  speaker: string | null;
  meeting: boolean;
  paused: boolean;
  activity: Record<string, string>;
  text: Record<string, string>;
  handoff: { id: string; from: string; to: string } | null;
};
export type OfficeAnchor = {
  id: string;
  x: number;
  y: number;
  visible: boolean;
  near: boolean;
};
export type OfficeFrame = {
  anchors: OfficeAnchor[];
  nearest: string | null;
  room: "executive" | "team" | "boardroom";
};
type Position = { x: number; z: number };
type Target = {
  id: string;
  position: THREE.Vector3;
  approach: Position;
  objects: THREE.Object3D[];
};
type Bounds = { x: number; z: number; w: number; d: number };
type Avatar = {
  id: string;
  body: THREE.Group;
  head: THREE.Group;
  arm: THREE.Group;
  limbs: THREE.Group[];
  path: Position[];
  goal: string;
  ring: THREE.Mesh;
  bars: THREE.Mesh[];
  home: Position;
  seat: Position;
  yaw: number;
};
const EYE = 1.68;
const HOME = { x: 0, z: 3.8, yaw: 0, pitch: -0.025 };
const PC = "@master";
const MEETING = "@meeting";
const clamp = THREE.MathUtils.clamp;

export function createOffice(
  canvas: HTMLCanvasElement,
  employeeIds: string[],
  initial: OfficeState,
  callbacks: {
    frame: (frame: OfficeFrame) => void;
    action: (id: string) => void;
    proximity: (id: string) => void;
    lock: (locked: boolean) => void;
    error: () => void;
  },
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    alpha: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#272a2b");
  scene.fog = new THREE.Fog("#272a2b", 17, 40);
  const camera = new THREE.PerspectiveCamera(66, 1, 0.06, 65);
  camera.rotation.order = "YXZ";
  camera.position.set(HOME.x, EYE, HOME.z);
  camera.rotation.set(HOME.pitch, HOME.yaw, 0);
  scene.add(new THREE.HemisphereLight("#f4e3cf", "#444b53", 2.3));
  const keyLight = new THREE.DirectionalLight("#ffe0b8", 2.8);
  keyLight.position.set(3, 6, 4);
  scene.add(keyLight);
  const fill = new THREE.DirectionalLight("#c2d5db", 1.3);
  fill.position.set(-8, 4, -7);
  scene.add(fill);

  const materials = new Set<THREE.Material>();
  const geometries = new Set<THREE.BufferGeometry>();
  const textures = new Set<THREE.Texture>();
  const mat = (color: string, glow = false) => {
    const material = glow
      ? new THREE.MeshBasicMaterial({ color })
      : new THREE.MeshLambertMaterial({ color });
    materials.add(material);
    return material;
  };
  const charcoal = mat("#25282b");
  const trim = mat("#11171c");
  const wall = mat("#35383b");
  const floor = mat("#4a4c4c");
  const wood = mat("#685344");
  const leather = mat("#30363a");
  const brass = mat("#a67b50");
  const paper = mat("#c6c0b2");
  const orange = mat("#c78549", true);
  const light = mat("#ffcd92", true);
  const leaf = mat("#3d6651");
  const steel = mat("#84918e");
  const screen = mat("#182827");
  const glass = new THREE.MeshBasicMaterial({
    color: "#9cb6bd",
    transparent: true,
    opacity: 0.09,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  materials.add(glass);
  const geometry = <T extends THREE.BufferGeometry>(value: T): T => {
    geometries.add(value);
    return value;
  };
  const cube = geometry(new THREE.BoxGeometry(1, 1, 1));
  const sphere = geometry(new THREE.SphereGeometry(1, 14, 10));
  const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 12));
  const ringGeo = geometry(new THREE.TorusGeometry(0.37, 0.012, 5, 40));
  const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  function mesh(
    geo: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    parent: THREE.Object3D = scene,
    rotation = 0,
  ) {
    const object = new THREE.Mesh(geo, material);
    object.position.set(x, y, z);
    object.scale.set(sx, sy, sz);
    object.rotation.y = rotation;
    // Merge static opaque architecture by material, keeping animated rigs separate.
    if (parent === scene && material !== glass) {
      object.updateMatrix();
      const transformed = geo.clone().applyMatrix4(object.matrix);
      const items = batches.get(material) || [];
      items.push(transformed);
      batches.set(material, items);
    } else parent.add(object);
    return object;
  }
  function box(
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    parent: THREE.Object3D = scene,
    rotation = 0,
  ) {
    return mesh(cube, material, x, y, z, w, h, d, parent, rotation);
  }
  const obstacles: Bounds[] = [];
  const partitions: Bounds[] = [];
  function solid(
    x: number,
    z: number,
    w: number,
    d: number,
    partition = false,
  ) {
    const bounds = { x, z, w, d };
    obstacles.push(bounds);
    if (partition) partitions.push(bounds);
  }
  const staff = employeeIds.filter((id) => id !== "ceo");
  // Extra catalog workstations extend the staff wing without overlapping desks.
  const back = Math.min(-9, 0.3 - Math.ceil(staff.length / 2) * 3.2);
  const depth = 7 - back;
  const mid = (7 + back) / 2;
  box(floor, 0, -0.12, mid, 23, 0.24, depth);
  box(charcoal, 0, 3.65, mid, 23, 0.18, depth);
  box(wall, 0, 1.8, back, 23, 3.6, 0.2);
  box(wall, 0, 1.8, 7, 23, 3.6, 0.2);
  box(wall, -11.4, 1.8, mid, 0.2, 3.6, depth);
  box(wall, 11.4, 1.8, mid, 0.2, 3.6, depth);
  // Large stone tiles and quiet ceiling beams, all in the static batches.
  for (let x = -10.5; x <= 10.5; x += 1.5)
    box(charcoal, x, 0.004, mid, 0.012, 0.005, depth);
  for (let z = Math.ceil(back); z <= 6; z += 1.5)
    box(charcoal, 0, 0.004, z, 22.8, 0.005, 0.012);
  for (const x of [-4.15, 4.15]) {
    box(trim, x, 3.38, mid, 0.24, 0.32, depth);
    box(light, x + (x < 0 ? 0.16 : -0.16), 3.4, mid, 0.045, 0.045, depth - 0.3);
  }
  for (const z of [-8.5, 5.8]) {
    box(trim, 0, 3.38, z, 8.3, 0.32, 0.24);
    box(light, 0, 3.39, z + 0.13, 8.1, 0.04, 0.04);
  }
  for (const x of [-8, -2.8, 2.8, 8]) {
    for (const z of [-6, -1, 4])
      mesh(cylinder, light, x, 3.53, z, 0.075, 0.03, 0.075);
  }
  // CEO feature wall: framed charcoal panel, bronze ribs and an inset brand plaque.
  box(trim, 0, 1.65, -8.72, 4.7, 3.15, 0.16);
  for (const x of [-2.38, 2.38])
    box(orange, x, 1.65, -8.58, 0.035, 3.18, 0.025);
  for (const y of [0.08, 3.23]) box(orange, 0, y, -8.58, 4.8, 0.035, 0.025);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 9; i++)
      box(wood, side * (2.62 + i * 0.17), 1.7, -8.67, 0.065, 3.3, 0.13);
  }
  function plaque(
    text: string,
    sub: string,
    x: number,
    y: number,
    z: number,
    width: number,
    yaw = 0,
  ) {
    const source = document.createElement("canvas");
    source.width = 768;
    source.height = 256;
    const ctx = source.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#1d2427";
    ctx.fillRect(0, 0, 768, 256);
    ctx.textAlign = "center";
    ctx.fillStyle = "#e0a266";
    ctx.font = "600 88px Outfit, sans-serif";
    ctx.fillText(text, 384, 118);
    ctx.fillStyle = "#afada5";
    ctx.font = "24px Outfit, sans-serif";
    ctx.fillText(sub, 384, 185);
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    textures.add(texture);
    const material = new THREE.MeshBasicMaterial({ map: texture });
    materials.add(material);
    mesh(
      geometry(new THREE.PlaneGeometry(width, width / 3)),
      material,
      x,
      y,
      z,
      1,
      1,
      1,
      scene,
      yaw,
    );
  }
  plaque("oneShot", "AI WORKFORCE / EXECUTIVE OFFICE", 0, 2.12, -8.56, 2.8);
  // Side wings remain visible through full-height glass. Door openings are real.
  for (const x of [-4.5, 4.5]) {
    for (const [from, to] of [
      [back, 0.1],
      [2.5, 7],
    ]) {
      box(glass, x, 1.7, (from + to) / 2, 0.035, 3.3, to - from);
      solid(x, (from + to) / 2, 0.12, to - from, true);
      for (let z = from; z < to; z += 1.6)
        box(trim, x, 1.75, z, 0.09, 3.5, 0.07);
      box(trim, x, 1.75, to, 0.09, 3.5, 0.07);
      for (const y of [0.05, 3.4])
        box(trim, x, y, (from + to) / 2, 0.13, 0.1, to - from);
      box(steel, x, 1.1, (from + to) / 2, 0.04, 0.015, to - from);
    }
    box(orange, x, 3.15, 1.3, 0.14, 0.04, 2.4);
  }
  // Inset orange routes lead to the three interaction areas and glass doorways.
  function route(x: number, z: number, w: number, d: number) {
    box(orange, x, 0.012, z, w, 0.012, d);
  }
  route(-3.35, -2.9, 0.035, 9.5);
  route(3.35, -2.9, 0.035, 9.5);
  route(0, 1.84, 6.73, 0.035);
  route(-5.65, 1.3, 4.6, 0.045);
  route(5.65, 1.3, 4.6, 0.045);
  for (const z of [-1.4, 0, 3]) {
    box(orange, -0.12, 0.016, z, 0.035, 0.012, 0.34, scene, -0.7);
    box(orange, 0.12, 0.016, z, 0.035, 0.012, 0.34, scene, 0.7);
  }
  function chair(x: number, z: number, yaw = 0) {
    solid(x, z, 0.68, 0.68);
    // Bake the chair transform into the static batch once.
    const pieces: [
      THREE.Material,
      number,
      number,
      number,
      number,
      number,
      number,
    ][] = [
      [leather, 0, 0.5, 0, 0.6, 0.14, 0.58],
      [leather, 0, 0.94, -0.25, 0.61, 0.85, 0.13],
      [trim, -0.34, 0.71, 0, 0.065, 0.09, 0.5],
      [trim, 0.34, 0.71, 0, 0.065, 0.09, 0.5],
      [steel, 0, 0.25, 0, 0.08, 0.5, 0.08],
      [trim, 0, 0.07, 0, 0.7, 0.06, 0.08],
      [trim, 0, 0.07, 0, 0.08, 0.06, 0.7],
    ];
    for (const [m, px, py, pz, w, h, d] of pieces) {
      const p = new THREE.Vector3(px, py, pz).applyAxisAngle(
        new THREE.Vector3(0, 1, 0),
        yaw,
      );
      box(m, x + p.x, p.y, z + p.z, w, h, d, scene, yaw);
    }
  }
  const monitors = new Map<
    string,
    { context: CanvasRenderingContext2D; texture: THREE.CanvasTexture }
  >();
  let monitorTick = -1;
  function monitor(x: number, z: number, id: string, large = false) {
    const group = new THREE.Group();
    scene.add(group);
    group.position.set(x, 0.88, z);
    const width = large ? 1.18 : 0.83;
    box(trim, 0, 0.47, 0, width, 0.64, 0.07, group);
    box(steel, 0, 0.11, 0, 0.035, 0.22, 0.045, group);
    box(trim, 0, 0.025, 0.07, 0.36, 0.035, 0.23, group);
    const source = document.createElement("canvas");
    source.width = 512;
    source.height = 320;
    const context = source.getContext("2d");
    if (context) {
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      textures.add(texture);
      const display = new THREE.MeshBasicMaterial({ map: texture });
      materials.add(display);
      monitors.set(id, { context, texture });
      mesh(
        geometry(new THREE.PlaneGeometry(width - 0.06, 0.56)),
        display,
        0,
        0.47,
        0.045,
        1,
        1,
        1,
        group,
      );
    }
    box(charcoal, 0, 0.02, 0.43, 0.55, 0.035, 0.19, group);
    return group;
  }
  function desk(x: number, z: number, executive = false) {
    const w = executive ? 4.3 : 2.25;
    box(wood, x, 0.84, z, w, 0.12, 1.25);
    box(trim, x, 0.76, z, w + 0.025, 0.035, 1.27);
    for (const dx of [-w / 2 + 0.35, w / 2 - 0.35]) {
      box(charcoal, x + dx, 0.38, z, 0.63, 0.75, 1.06);
      box(brass, x + dx, 0.04, z + 0.54, 0.63, 0.05, 0.025);
      for (const y of [0.32, 0.56])
        box(trim, x + dx, y, z + 0.535, 0.51, 0.016, 0.02);
    }
    box(charcoal, x, 0.39, z - 0.35, w - 0.6, 0.6, 0.08);
    box(orange, x, 0.785, z + 0.635, w, 0.018, 0.01);
    box(leather, x, 0.91, z + 0.08, executive ? 1.6 : 0.6, 0.015, 0.64);
    box(paper, x - w * 0.32, 0.94, z + 0.19, 0.35, 0.055, 0.25);
    solid(x, z, w, 1.25);
  }
  desk(0, -4.75, true);
  chair(0, -6.05);
  const master = monitor(1.1, -4.6, PC, true);
  monitor(-0.28, -4.85, "@overview");
  const targets: Target[] = [
    {
      id: PC,
      position: new THREE.Vector3(1.1, 1.8, -4.6),
      approach: { x: 1.2, z: -2.8 },
      objects: [master],
    },
  ];
  // Boardroom: the merchant takes the near end; employees face the table.
  box(wood, 7.7, 0.76, -2.0, 2.45, 0.14, 4.2);
  box(trim, 7.7, 0.32, -2.0, 1.5, 0.64, 2.8);
  box(orange, 7.7, 0.84, -2.0, 0.018, 0.008, 3.9);
  solid(7.7, -2.0, 2.45, 4.2);
  plaque("BOARDROOM", "ONESHOT / TEAM SESSION", 7.7, 2.5, back + 0.14, 3.1);
  const meetingObject = new THREE.Group();
  scene.add(meetingObject);
  box(screen, 7.7, 0.86, -0.2, 0.62, 0.06, 0.38, meetingObject);
  targets.push({
    id: MEETING,
    position: new THREE.Vector3(7.7, 1.35, 0),
    approach: { x: 7.7, z: 1.4 },
    objects: [meetingObject],
  });
  const avatars: Avatar[] = [];
  const suitColors = ["#343c46", "#4c5b58", "#656478", "#445767"];
  employeeIds.forEach((id, i) => {
    const staffIndex = staff.indexOf(id);
    const home =
      id === "ceo"
        ? { x: -2.7, z: -5.25 }
        : {
            x: staffIndex % 2 ? -9.4 : -6.4,
            z: 2.1 - Math.floor(staffIndex / 2) * 3.2,
          };
    if (id !== "ceo") {
      desk(home.x, home.z + 1.05);
      chair(home.x, home.z - 0.25);
      monitor(home.x + 0.28, home.z + 1.05, id);
    }
    const seat =
      i === 0
        ? { x: 7.7, z: -4.95 }
        : { x: i % 2 ? 5.95 : 9.45, z: -3.6 + Math.floor((i - 1) / 2) * 0.95 };
    const yaw = i === 0 ? 0 : i % 2 ? Math.PI / 2 : -Math.PI / 2;
    chair(seat.x, seat.z, yaw);
    box(
      leather,
      seat.x < 7 ? 6.8 : seat.x > 8 ? 8.6 : 7.7,
      0.85,
      i === 0 ? -3.6 : seat.z,
      0.38,
      0.03,
      0.5,
    );
    const body = new THREE.Group();
    scene.add(body);
    body.position.set(home.x, 0, home.z);
    const skin = mat(i % 2 ? "#b18a70" : "#c4a18a");
    const suit = mat(suitColors[i % suitColors.length]);
    mesh(cylinder, suit, 0, 1.05, 0, 0.27, 0.65, 0.17, body);
    box(paper, 0, 1.23, 0.16, 0.14, 0.28, 0.03, body);
    box(brass, 0, 1.18, 0.184, 0.037, 0.28, 0.018, body);
    const limbs: THREE.Group[] = [];
    for (const x of [-0.115, 0.115]) {
      const leg = new THREE.Group();
      leg.position.set(x, 0.76, 0);
      body.add(leg);
      limbs.push(leg);
      box(suit, 0, -0.34, 0, 0.18, 0.68, 0.2, leg);
      box(trim, 0, -0.69, 0.055, 0.19, 0.12, 0.32, leg);
    }
    for (const side of [-1, 1]) {
      const lapel = box(suit, side * 0.09, 1.29, 0.175, 0.08, 0.22, 0.03, body);
      lapel.rotation.z = side * 0.28;
    }
    box(paper, -0.16, 1.2, 0.18, 0.07, 0.035, 0.018, body);
    for (const y of [1.02, 1.1])
      mesh(sphere, brass, 0.02, y, 0.175, 0.014, 0.014, 0.01, body);
    const head = new THREE.Group();
    head.position.y = 1.59;
    body.add(head);
    mesh(sphere, skin, 0, 0, 0, 0.17, 0.225, 0.16, head);
    mesh(sphere, trim, 0, 0.13, -0.025, 0.173, 0.115, 0.151, head);
    for (const x of [-0.061, 0.061])
      mesh(sphere, trim, x, 0.025, 0.146, 0.015, 0.014, 0.009, head);
    box(skin, 0, -0.028, 0.164, 0.035, 0.06, 0.045, head);
    box(trim, 0, -0.085, 0.146, 0.055, 0.008, 0.01, head);
    if (i % 3 === 0) {
      for (const x of [-0.065, 0.065])
        box(brass, x, 0.025, 0.16, 0.09, 0.045, 0.012, head);
      box(brass, 0, 0.025, 0.17, 0.04, 0.008, 0.01, head);
    }
    let arm = new THREE.Group();
    for (const side of [-1, 1]) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.29, 1.3, 0);
      body.add(pivot);
      mesh(cylinder, suit, 0, -0.2, 0, 0.075, 0.44, 0.075, pivot);
      mesh(sphere, skin, 0, -0.46, 0, 0.065, 0.09, 0.06, pivot);
      if (side === 1) arm = pivot;
    }
    const ring = new THREE.Mesh(ringGeo, mat("#acd2b6", true));
    ring.position.y = 1.61;
    ring.visible = false;
    body.add(ring);
    const bars = Array.from({ length: 5 }, (_, n) => {
      const bar = box(
        light,
        (n - 2) * 0.065,
        2.07,
        0,
        0.025,
        0.12,
        0.025,
        body,
      );
      bar.visible = false;
      return bar;
    });
    avatars.push({
      id,
      body,
      head,
      arm,
      ring,
      bars,
      home,
      seat,
      yaw,
      limbs,
      path: [],
      goal: "home",
    });
    targets.push({
      id,
      position: new THREE.Vector3(home.x, 2.15, home.z),
      approach: { x: home.x, z: home.z + (id === "ceo" ? 2.4 : 2.3) },
      objects: [body],
    });
  });
  // Architectural details: shelving, books, planters and soft contact patches.
  for (const x of [-10.9, 10.9]) {
    solid(x, -6, 0.65, 3.6);
    box(trim, x, 1.45, -6.0, 0.45, 2.9, 3.6);
    for (let y = 0.4; y < 2.8; y += 0.6) {
      box(wood, x + (x < 0 ? 0.1 : -0.1), y, -6, 0.65, 0.045, 3.6);
      for (let j = 0; j < 6; j++)
        box(
          j % 2 ? paper : charcoal,
          x,
          y + 0.22,
          -7.4 + j * 0.43,
          0.34,
          0.38,
          0.24,
        );
    }
  }
  for (const [x, z] of [
    [-3.8, -7.7],
    [3.8, -7.7],
    [-9.9, 5.4],
    [10.2, 5.3],
  ]) {
    mesh(cylinder, charcoal, x, 0.28, z, 0.27, 0.56, 0.27);
    mesh(cylinder, wood, x, 0.78, z, 0.025, 1.1, 0.025);
    for (let i = 0; i < 7; i++) {
      const a = i * 2.4;
      mesh(
        sphere,
        leaf,
        x + Math.cos(a) * 0.23,
        0.8 + i * 0.09,
        z + Math.sin(a) * 0.23,
        0.22,
        0.08,
        0.12,
        scene,
        a,
      );
    }
    solid(x, z, 0.55, 0.55);
  }
  for (const target of targets) {
    const ring = new THREE.Mesh(
      geometry(new THREE.RingGeometry(0.29, 0.32, 32)),
      orange,
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(target.approach.x, 0.02, target.approach.z);
    scene.add(ring);
    target.objects.forEach((object) => {
      object.userData.target = target.id;
    });
  }
  const shadowMaterial = new THREE.MeshBasicMaterial({
    color: "#0e1518",
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
  });
  materials.add(shadowMaterial);
  for (const [x, z, w, d] of [
    [0, -4.75, 4.9, 1.9],
    [7.7, -2, 3.2, 4.9],
  ]) {
    const contact = new THREE.Mesh(
      geometry(new THREE.PlaneGeometry(w, d)),
      shadowMaterial,
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(x, 0.009, z);
    scene.add(contact);
  }
  for (const [material, parts] of batches) {
    const merged = mergeGeometries(parts, false);
    if (merged) scene.add(new THREE.Mesh(geometry(merged), material));
    parts.forEach((part) => part.dispose());
  }
  batches.clear();

  let state = initial,
    disposed = false,
    frameId = 0,
    lastTime = 0;
  let width = 1,
    height = 1,
    visible = true,
    dirty = true;
  let nearest: string | null = null,
    lastProximity: string | null = null;
  let savedPose: { position: THREE.Vector3; rotation: THREE.Euler } | null =
    null;
  const keys = new Set<string>();
  let joystick = { x: 0, y: 0 },
    gyro: { yaw: number; pitch: number } | null = null;
  let tour = 0,
    nextTour = 0,
    lastHandoff = "";
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const coarse = window.matchMedia("(pointer: coarse)");
  const raycaster = new THREE.Raycaster();
  const projected = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const offset = new THREE.Vector3();
  let drag: { id: number; x: number; y: number; distance: number } | null =
    null;
  const eventCleanup: (() => void)[] = [];
  function listen(target: EventTarget, name: string, handler: EventListener) {
    target.addEventListener(name, handler);
    eventCleanup.push(() => target.removeEventListener(name, handler));
  }
  function exitLock() {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  }
  function clearInput() {
    keys.clear();
    joystick = { x: 0, y: 0 };
    drag = null;
  }
  function obstructed(point: Position) {
    if (
      point.x < -11 ||
      point.x > 11 ||
      point.z < back + 0.45 ||
      point.z > 6.55
    )
      return true;
    return obstacles.some(
      ({ x, z, w, d }) =>
        Math.abs(point.x - x) < w / 2 + 0.25 &&
        Math.abs(point.z - z) < d / 2 + 0.25,
    );
  }
  function planWalk(start: Position, goal: Position): Position[] {
    const step = 0.4,
      key = (p: Position) =>
        `${Math.round(p.x / step)},${Math.round(p.z / step)}`;
    const snap = (p: Position) => ({
      x: Math.round(p.x / step) * step,
      z: Math.round(p.z / step) * step,
    });
    const origin = snap(start),
      target = snap(goal),
      open = [origin],
      previous = new Map<string, Position>(),
      scores = new Map([[key(origin), 0]]);
    const closed = new Set<string>();
    for (let n = 0; open.length && n < 5000; n++) {
      open.sort(
        (a, b) =>
          scores.get(key(a))! +
          Math.hypot(a.x - target.x, a.z - target.z) -
          (scores.get(key(b))! + Math.hypot(b.x - target.x, b.z - target.z)),
      );
      const point = open.shift()!,
        hash = key(point);
      if (closed.has(hash)) continue;
      closed.add(hash);
      if (Math.hypot(point.x - target.x, point.z - target.z) < step * 1.2) {
        const route: Position[] = [point];
        let cursor = point;
        while (previous.has(key(cursor))) {
          cursor = previous.get(key(cursor))!;
          route.unshift(cursor);
        }
        return route.slice(1);
      }
      for (const [dx, dz] of [
        [step, 0],
        [-step, 0],
        [0, step],
        [0, -step],
      ]) {
        const next = { x: point.x + dx, z: point.z + dz },
          nextKey = key(next),
          cost = scores.get(hash)! + step;
        if (
          obstructed(next) ||
          closed.has(nextKey) ||
          cost >= (scores.get(nextKey) ?? Infinity)
        )
          continue;
        scores.set(nextKey, cost);
        previous.set(nextKey, point);
        open.push(next);
      }
    }
    return [];
  }
  function walkTo(avatar: Avatar, goal: Position, name: string) {
    if (avatar.goal === name) return;
    avatar.goal = name;
    avatar.path = planWalk(
      { x: avatar.body.position.x, z: avatar.body.position.z },
      goal,
    );
  }
  function drawMonitors(time: number) {
    const tick = Math.floor(time / 650);
    if (monitorTick === tick && !dirty) return;
    monitorTick = tick;
    for (const [id, { context: ctx, texture }] of monitors) {
      const employee = id.startsWith("@") ? state.selected : id;
      const status = state.activity[employee] || "idle",
        busy = ["drafting", "generating", "running", "browsing"].includes(
          status,
        );
      ctx.fillStyle = "#152124";
      ctx.fillRect(0, 0, 512, 320);
      ctx.fillStyle = "#293639";
      ctx.fillRect(0, 0, 512, 48);
      ctx.fillStyle = "#d9a36d";
      ctx.font = "18px Outfit, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`ONESHOT / ${employee.toUpperCase()}`, 20, 31);
      ctx.fillStyle = busy ? "#d3a16c" : "#abd0b3";
      ctx.fillRect(20, 67, 7, 7);
      ctx.font = "16px Outfit, sans-serif";
      ctx.fillText(status, 38, 80);
      const content = state.text[employee] || "لا توجد مهمة نشطة · متاح";
      ctx.textAlign = "right";
      ctx.direction = "rtl";
      ctx.font = "18px IBM Plex Sans Arabic, sans-serif";
      ctx.fillStyle = "#e0e2da";
      const words = content.slice(0, 500).split(/\s+/);
      let line = "",
        y = 124;
      for (const word of words) {
        if (ctx.measureText(`${line} ${word}`).width > 458) {
          ctx.fillText(line, 488, y);
          y += 30;
          line = word;
          if (y > 270) break;
        } else line += ` ${word}`;
      }
      if (y <= 270) ctx.fillText(line, 488, y);
      if (busy) {
        ctx.fillStyle = "#c28b55";
        ctx.fillRect(22 + (tick % 6) * 65, 299, 55, 3);
      }
      ctx.direction = "ltr";
      texture.needsUpdate = true;
    }
  }
  function throughGlass(target: THREE.Vector3) {
    return partitions.some(({ x, z, d }) => {
      const dx = target.x - camera.position.x;
      if (Math.abs(dx) < 0.0001) return false;
      const t = (x - camera.position.x) / dx;
      if (t <= 0 || t >= 1) return false;
      const crossing = camera.position.z + (target.z - camera.position.z) * t;
      return Math.abs(crossing - z) < d / 2;
    });
  }
  function distance(target: Target) {
    return Math.hypot(
      camera.position.x - target.position.x,
      camera.position.z - target.position.z,
    );
  }
  function canUse(target: Target) {
    return distance(target) < 3.05 && !throughGlass(target.position);
  }
  function look(dx: number, dy: number) {
    if (state.paused) return;
    camera.rotation.y -= dx * 0.0028;
    camera.rotation.x = clamp(camera.rotation.x - dy * 0.0028, -0.95, 0.95);
    dirty = true;
    schedule();
  }
  function face(point: THREE.Vector3) {
    const dx = point.x - camera.position.x,
      dz = point.z - camera.position.z;
    camera.rotation.y = Math.atan2(-dx, -dz);
    camera.rotation.x = -0.035;
  }
  function navigate(id: string) {
    if (state.paused) return;
    if (state.meeting) {
      const target = targets.find((item) => item.id === id);
      if (target) {
        face(target.position);
        dirty = true;
        schedule();
      }
      return;
    }
    const target = targets.find((item) => item.id === id);
    if (!target) return;
    clearInput();
    exitLock();
    camera.position.set(target.approach.x, EYE, target.approach.z);
    face(target.position);
    dirty = true;
    schedule();
  }
  function activate(id: string) {
    const target = targets.find((item) => item.id === id);
    if (!target || state.paused) return;
    if (!canUse(target) && !state.meeting) {
      navigate(id);
      return;
    }
    clearInput();
    exitLock();
    callbacks.action(id);
  }
  function pick(clientX: number, clientY: number) {
    const bounds = canvas.getBoundingClientRect();
    const locked = document.pointerLockElement === canvas;
    raycaster.setFromCamera(
      new THREE.Vector2(
        locked ? 0 : ((clientX - bounds.left) / bounds.width) * 2 - 1,
        locked ? 0 : -((clientY - bounds.top) / bounds.height) * 2 + 1,
      ),
      camera,
    );
    const hit = raycaster.intersectObjects(
      targets.flatMap((target) => target.objects),
      true,
    )[0];
    let object: THREE.Object3D | null = hit?.object || null;
    while (object && !object.userData.target) object = object.parent;
    if (object?.userData.target) activate(String(object.userData.target));
  }
  const movementCodes = new Set([
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "KeyI",
    "KeyJ",
    "KeyK",
    "KeyL",
  ]);
  listen(canvas, "keydown", ((event: KeyboardEvent) => {
    if (state.paused || event.ctrlKey || event.altKey || event.metaKey) return;
    if (movementCodes.has(event.code)) {
      event.preventDefault();
      keys.add(event.code);
      dirty = true;
      schedule();
    }
    if (event.code === "KeyE" && !event.repeat && nearest) {
      event.preventDefault();
      activate(nearest);
    }
  }) as EventListener);
  listen(window, "keyup", ((event: KeyboardEvent) =>
    keys.delete(event.code)) as EventListener);
  listen(canvas, "blur", (() => {
    clearInput();
    exitLock();
  }) as EventListener);
  listen(window, "blur", (() => {
    clearInput();
    exitLock();
  }) as EventListener);
  listen(canvas, "pointerdown", ((event: PointerEvent) => {
    if (state.paused || event.button !== 0 || drag) return;
    canvas.focus({ preventScroll: true });
    if (document.pointerLockElement === canvas) {
      pick(event.clientX, event.clientY);
      return;
    }
    canvas.setPointerCapture(event.pointerId);
    drag = {
      id: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      distance: 0,
    };
  }) as EventListener);
  listen(canvas, "pointermove", ((event: PointerEvent) => {
    if (
      !drag ||
      drag.id !== event.pointerId ||
      document.pointerLockElement === canvas
    )
      return;
    const dx = event.clientX - drag.x,
      dy = event.clientY - drag.y;
    drag.distance += Math.abs(dx) + Math.abs(dy);
    drag.x = event.clientX;
    drag.y = event.clientY;
    look(dx, dy);
  }) as EventListener);
  listen(canvas, "pointerup", ((event: PointerEvent) => {
    if (!drag || drag.id !== event.pointerId) return;
    const click = drag.distance < 6;
    drag = null;
    if (canvas.hasPointerCapture(event.pointerId))
      canvas.releasePointerCapture(event.pointerId);
    if (click) pick(event.clientX, event.clientY);
  }) as EventListener);
  listen(canvas, "pointercancel", (() => {
    drag = null;
  }) as EventListener);
  listen(canvas, "lostpointercapture", (() => {
    drag = null;
  }) as EventListener);
  listen(document, "mousemove", ((event: MouseEvent) => {
    if (document.pointerLockElement === canvas)
      look(event.movementX, event.movementY);
  }) as EventListener);
  listen(document, "pointerlockchange", (() => {
    clearInput();
    callbacks.lock(document.pointerLockElement === canvas);
  }) as EventListener);
  listen(canvas, "webglcontextlost", ((event: Event) => {
    event.preventDefault();
    clearInput();
    exitLock();
    cancelAnimationFrame(frameId);
    frameId = 0;
    callbacks.error();
  }) as EventListener);

  function update(next: OfficeState) {
    const entering = next.meeting && !savedPose;
    const leaving = !next.meeting && savedPose;
    if (entering) {
      savedPose = {
        position: camera.position.clone(),
        rotation: camera.rotation.clone(),
      };
      camera.position.set(7.7, 1.23, 1.4);
      camera.rotation.set(-0.025, 0, 0);
      clearInput();
      exitLock();
    } else if (leaving && savedPose) {
      camera.position.copy(savedPose.position);
      camera.rotation.copy(savedPose.rotation);
      savedPose = null;
      clearInput();
    }
    state = next;
    if (next.paused) {
      clearInput();
      exitLock();
    }
    for (const avatar of avatars) {
      if (entering || leaving) {
        const pos = next.meeting ? avatar.seat : avatar.home;
        avatar.body.position.set(pos.x, next.meeting ? -0.4 : 0, pos.z);
        avatar.body.rotation.y = next.meeting ? avatar.yaw : 0;
        avatar.path = [];
        avatar.goal = "home";
      }
    }
    if (
      next.handoff &&
      next.handoff.id !== lastHandoff &&
      !next.meeting &&
      !reduced.matches
    ) {
      lastHandoff = next.handoff.id;
      const from = avatars.find((a) => a.id === next.handoff!.from),
        to = avatars.find((a) => a.id === next.handoff!.to);
      if (from && to && from !== to)
        walkTo(
          from,
          { x: to.home.x + 0.65, z: to.home.z - 0.2 },
          `handoff:${next.handoff.id}`,
        );
    }
    if (!next.handoff)
      for (const avatar of avatars)
        if (avatar.goal.startsWith("handoff:"))
          walkTo(avatar, avatar.home, "home");
    dirty = true;
    schedule();
  }
  function renderFrame(time: number) {
    frameId = 0;
    if (disposed || document.hidden || !visible) return;
    const interval = coarse.matches || reduced.matches ? 1000 / 30 : 1000 / 60;
    if (time - lastTime < interval - 1) {
      schedule();
      return;
    }
    const dt = Math.min((time - lastTime) / 1000 || 0, 0.05);
    lastTime = time;
    if (!state.paused && gyro) {
      camera.rotation.y +=
        Math.atan2(
          Math.sin(gyro.yaw - camera.rotation.y),
          Math.cos(gyro.yaw - camera.rotation.y),
        ) * Math.min(1, dt * 8);
      camera.rotation.x = THREE.MathUtils.damp(
        camera.rotation.x,
        gyro.pitch,
        8,
        dt,
      );
      dirty = true;
    }
    if (!state.paused && (keys.size || joystick.x || joystick.y)) {
      const axis = (a: string, b: string) =>
        Number(keys.has(a)) - Number(keys.has(b));
      look(axis("KeyL", "KeyJ") * dt * 540, axis("KeyK", "KeyI") * dt * 400);
      if (!state.meeting) {
        const forward =
          axis("KeyW", "KeyS") + axis("ArrowUp", "ArrowDown") - joystick.y;
        const right =
          axis("KeyD", "KeyA") + axis("ArrowRight", "ArrowLeft") + joystick.x;
        const length = Math.max(1, Math.hypot(forward, right));
        const yaw = camera.rotation.y,
          speed = (2.7 * dt) / length;
        const dx = (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed;
        const dz = (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed;
        if (!obstructed({ x: camera.position.x + dx, z: camera.position.z }))
          camera.position.x += dx;
        if (!obstructed({ x: camera.position.x, z: camera.position.z + dz }))
          camera.position.z += dz;
      }
      dirty = true;
    }
    const moving = !state.paused && !reduced.matches;
    if (moving || dirty) {
      if (moving && !state.meeting && time > nextTour) {
        nextTour = time + 22000;
        const ceo = avatars.find((a) => a.id === "ceo"),
          coworkers = avatars.filter((a) => a.id !== "ceo");
        const destination = coworkers[tour++ % Math.max(1, coworkers.length)];
        if (ceo && destination && !ceo.goal.startsWith("handoff:"))
          walkTo(
            ceo,
            { x: destination.home.x + 0.65, z: destination.home.z - 0.2 },
            `tour:${tour}`,
          );
      }
      drawMonitors(time);
      for (let i = 0; i < avatars.length; i++) {
        const avatar = avatars[i];
        const waypoint = moving && !state.meeting ? avatar.path[0] : undefined;
        if (waypoint) {
          const dx = waypoint.x - avatar.body.position.x,
            dz = waypoint.z - avatar.body.position.z,
            distance = Math.hypot(dx, dz),
            stride = Math.min(distance, dt * 1.35);
          if (distance < 0.06) avatar.path.shift();
          else {
            avatar.body.position.x += (dx / distance) * stride;
            avatar.body.position.z += (dz / distance) * stride;
            avatar.body.rotation.y = Math.atan2(dx, dz);
          }
        }
        avatar.limbs.forEach(
          (limb, j) =>
            (limb.rotation.x = waypoint
              ? Math.sin(time * 0.009 + j * Math.PI) * 0.32
              : 0),
        );
        const target = targets.find((item) => item.id === avatar.id)!;
        target.position.set(
          avatar.body.position.x,
          avatar.body.position.y + 2.15,
          avatar.body.position.z,
        );
        if (avatar.goal !== "home" && !state.meeting) {
          const choices = [
            { x: avatar.body.position.x + 0.8, z: avatar.body.position.z },
            { x: avatar.body.position.x, z: avatar.body.position.z - 1 },
          ];
          const approach = choices.find((point) => !obstructed(point));
          if (approach) target.approach = approach;
        }
        const speaking = state.speaker === avatar.id;
        avatar.ring.visible = speaking;
        avatar.ring.rotation.y = camera.rotation.y - avatar.body.rotation.y;
        avatar.ring.scale.setScalar(
          speaking && moving ? 1 + Math.sin(time * 0.006) * 0.07 : 1,
        );
        avatar.head.rotation.y = moving
          ? Math.sin(time * 0.0005 + i) * 0.07
          : 0;
        avatar.arm.rotation.x =
          speaking && moving
            ? -0.35 + Math.sin(time * 0.004) * 0.17
            : waypoint
              ? Math.sin(time * 0.009) * 0.25
              : 0;
        avatar.body.scale.y =
          moving && !speaking ? 1 + Math.sin(time * 0.0015 + i) * 0.002 : 1;
        avatar.bars.forEach((bar, j) => {
          bar.visible = speaking;
          bar.scale.y =
            speaking && moving
              ? 0.07 + Math.abs(Math.sin(time * 0.009 + j * 1.7)) * 0.14
              : 0.12;
        });
      }
      camera.updateMatrixWorld();
      camera.getWorldDirection(direction);
      const candidates = targets
        .filter(canUse)
        .sort((a, b) => distance(a) - distance(b));
      nearest = candidates[0]?.id || null;
      const closeEmployee = candidates.find(
        (target) => !target.id.startsWith("@"),
      );
      const nearId = closeEmployee?.id || null;
      if (
        !state.paused &&
        !state.meeting &&
        nearId &&
        nearId !== lastProximity &&
        (keys.size > 0 || joystick.x !== 0 || joystick.y !== 0)
      )
        callbacks.proximity(nearId);
      lastProximity = nearId;
      callbacks.frame({
        nearest,
        room:
          camera.position.x < -4.5
            ? "team"
            : camera.position.x > 4.5
              ? "boardroom"
              : "executive",
        anchors: targets.map((target) => {
          projected.copy(target.position).project(camera);
          const inFront =
            direction.dot(offset.copy(target.position).sub(camera.position)) >
            0;
          return {
            id: target.id,
            x: (projected.x * 0.5 + 0.5) * width,
            y: (-projected.y * 0.5 + 0.5) * height,
            visible:
              inFront &&
              projected.z < 1 &&
              Math.abs(projected.x) < 0.9 &&
              Math.abs(projected.y) < 0.83,
            near: canUse(target),
          };
        }),
      });
      renderer.render(scene, camera);
      dirty = false;
    }
    if (
      !state.paused &&
      (!reduced.matches || keys.size || joystick.x || joystick.y || gyro)
    )
      schedule();
  }
  function schedule() {
    if (!frameId && !disposed && visible && !document.hidden)
      frameId = requestAnimationFrame(renderFrame);
  }
  function resize() {
    const bounds = canvas.getBoundingClientRect();
    width = Math.max(1, bounds.width);
    height = Math.max(1, bounds.height);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // Portrait devices retain enough horizontal field of view to see the desk.
    camera.fov = width < height ? 82 : 72;
    camera.updateProjectionMatrix();
    dirty = true;
    schedule();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) {
      clearInput();
      exitLock();
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      lastTime = performance.now();
      dirty = true;
      schedule();
    }
  });
  intersection.observe(canvas);
  listen(document, "visibilitychange", (() => {
    clearInput();
    if (document.hidden) {
      exitLock();
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else {
      lastTime = performance.now();
      dirty = true;
      schedule();
    }
  }) as EventListener);
  listen(reduced, "change", (() => {
    dirty = true;
    schedule();
  }) as EventListener);
  update(initial);
  resize();
  return {
    update,
    navigate,
    activate,
    joystick(x: number, y: number) {
      joystick = { x: clamp(x, -1, 1), y: clamp(y, -1, 1) };
      dirty = true;
      schedule();
    },
    orientation(yaw: number | null, pitch = 0) {
      gyro = yaw === null ? null : { yaw, pitch: clamp(pitch, -0.8, 0.8) };
      dirty = true;
      schedule();
    },
    pose() {
      return { yaw: camera.rotation.y, pitch: camera.rotation.x };
    },
    input(code: string, down: boolean) {
      if (state.paused) return;
      if (down) keys.add(code);
      else keys.delete(code);
      dirty = true;
      schedule();
    },
    look(dx: number, dy: number) {
      look(dx, dy);
      schedule();
    },
    async lockPointer() {
      if (state.paused) return false;
      try {
        if (!canvas.requestPointerLock) return false;
        canvas.focus({ preventScroll: true });
        await canvas.requestPointerLock();
        return true;
      } catch {
        return false;
      }
    },
    reset() {
      clearInput();
      exitLock();
      if (state.meeting) {
        camera.position.set(7.7, 1.23, 1.4);
        camera.rotation.set(-0.025, 0, 0);
      } else {
        camera.position.set(HOME.x, EYE, HOME.z);
        camera.rotation.set(HOME.pitch, HOME.yaw, 0);
      }
      dirty = true;
      schedule();
    },
    dispose() {
      disposed = true;
      clearInput();
      exitLock();
      cancelAnimationFrame(frameId);
      observer.disconnect();
      intersection.disconnect();
      eventCleanup.forEach((cleanup) => cleanup());
      geometries.forEach((item) => item.dispose());
      materials.forEach((item) => item.dispose());
      textures.forEach((item) => item.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
export type OfficeEngine = ReturnType<typeof createOffice>;
