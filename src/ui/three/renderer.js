// Three.js renderer, stage 1 of the renderer swap (PROJECT_NOTES.md, "Three.js renderer, stage 1").
// It draws what src/ui.js hands it each frame through the seam in drawField: the camera the canvas
// renderer fitted, the ground, pitch, creases, stumps and rope, the ball where BallView says, fielders
// where Fielding.frame says, and the batter and bowler from the procedural rigs (BatterRig.pose and
// FielderRig.pose) mapped onto capsules, spheres and boxes. No assets, no animation clips, and no engine
// access beyond the crease and wicket constants in Cricket.Rules; it never advances match RNG.
//
// Coordinates. The engine's world is x across the pitch, z along it towards the bowler and h up, and
// Cricket.View projects with a horizontal "right" vector that puts +x on the right of the picture when
// looking towards +z: a left-handed picture. three.js is right-handed, so scene x = -engine x and the
// camera is mirrored the same way. The projection reproduces View.project exactly: focal length .98 h,
// principal point (.52 w, .43 h), so a point lands on the same pixel in both renderers.
import {
 WebGLRenderer, Scene, PerspectiveCamera, Group, Mesh, Vector3, Color,
 CapsuleGeometry, SphereGeometry, BoxGeometry, PlaneGeometry, CircleGeometry, CylinderGeometry, BufferGeometry,
 MeshLambertMaterial, MeshBasicMaterial, LineBasicMaterial, LineLoop, LineSegments,
 HemisphereLight, DirectionalLight, DataTexture, RepeatWrapping, SRGBColorSpace, NearestFilter, LinearMipmapLinearFilter,
 RGBAFormat, UnsignedByteType, DoubleSide
} from 'three';

const Y = new Vector3(0, 1, 0);
const T = Array.from({ length: 16 }, () => new Vector3());

export function createRenderer({ canvas, Cricket }) {
 const host = canvas?.parentElement;
 if (!host || typeof document === 'undefined') return null;
 const gl = document.createElement('canvas');
 gl.className = 'three-field';
 gl.setAttribute('aria-hidden', 'true');
 gl.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
 let renderer;
 try { renderer = new WebGLRenderer({ canvas: gl, antialias: true, alpha: false, powerPreference: 'high-performance' }); } catch { return null; }
 // The WebGL canvas sits under the 2D field canvas, which drawField clears each frame and keeps for the
 // aim line, gesture trail, bowling guide, catch targets and labels. Pointer input stays on the 2D canvas.
 host.insertBefore(gl, canvas);
 gl.addEventListener('webglcontextlost', e => { e.preventDefault(); });

 const scene = new Scene();
 scene.background = new Color('#9ec0d3');
 const camera = new PerspectiveCamera(54, 1, .25, 900);
 scene.add(new HemisphereLight('#dde9f1', '#405a2f', 1.0));
 // The canvas renderer lights from engine (-.65, .95, -.45): mirrored in x for the scene.
 const sun = new DirectionalLight('#fff3dc', 1.7);
 sun.position.set(.65, .95, -.45).multiplyScalar(100);
 scene.add(sun);
 const statics = new Group();
 scene.add(statics);

 // Geometry and material caches. Limb lengths are rig constants, so the capsule cache stays small.
 const geometries = new Map(), materials = new Map();
 const unitSphere = new SphereGeometry(1, 12, 8), unitBox = new BoxGeometry(1, 1, 1), unitCylinder = new CylinderGeometry(1, 1, 1, 8), unitDisc = new CircleGeometry(1, 18);
 function capGeometry(theta) { const key = 'cap:' + theta.toFixed(2); if (!geometries.has(key)) geometries.set(key, new SphereGeometry(1, 12, 8, 0, Math.PI * 2, 0, theta)); return geometries.get(key); }
 function capsuleGeometry(r, length) { const rr = Math.max(.004, Math.round(r * 500) / 500), ll = Math.max(.002, Math.round(length * 50) / 50), key = 'capsule:' + rr + ':' + ll; if (!geometries.has(key)) geometries.set(key, new CapsuleGeometry(rr, ll, 3, 8)); return geometries.get(key); }
 function material(colour) { let m = materials.get(colour); if (!m) { m = new MeshLambertMaterial({ color: new Color(colour) }); m.userData.colour = colour; materials.set(colour, m); } return m; }
 const shadowMaterial = new MeshBasicMaterial({ color: '#17291e', transparent: true, opacity: .26, depthWrite: false, side: DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });

 // Actors are retained between frames and updated in place; parts not touched in a frame are hidden.
 const actors = new Map(), forward = new Vector3(0, 0, 1);
 let frame = 0, active = false, viewW = 0, viewH = 0, staticKey = '', test = false;
 function actor(id) { let a = actors.get(id); if (!a) { a = { group: new Group(), parts: new Map(), frame: 0 }; scene.add(a.group); actors.set(id, a); } a.frame = frame; a.group.visible = true; return a; }
 function part(a, name, geometry, mat) { let m = a.parts.get(name); if (!m) { m = new Mesh(geometry, mat); m.matrixAutoUpdate = false; a.group.add(m); a.parts.set(name, m); } else { if (m.geometry !== geometry) m.geometry = geometry; if (m.material !== mat) m.material = mat; } m.frame = frame; m.visible = true; return m; }
 // Column basis: ax, ay, az are the already scaled axes of the part, c its centre, all in scene space.
 function place(m, c, ax, ay, az) { m.matrix.set(ax.x, ay.x, az.x, c.x, ax.y, ay.y, az.y, c.y, ax.z, ay.z, az.z, c.z, 0, 0, 0, 1); m.matrixWorldNeedsUpdate = true; }
 function capsule(a, name, p, q, r, colour) {
  const length = p.distanceTo(q), m = part(a, name, capsuleGeometry(r, length), material(colour));
  T[12].subVectors(q, p); if (length > 1e-6) T[12].divideScalar(length); else T[12].set(0, 1, 0);
  T[13].crossVectors(Y, T[12]); if (T[13].lengthSq() < 1e-8) T[13].set(1, 0, 0); else T[13].normalize();
  T[14].crossVectors(T[12], T[13]);
  T[15].addVectors(p, q).multiplyScalar(.5);
  place(m, T[15], T[13], T[12], T[14]);
  return m;
 }
 // Ellipsoid and box keep the vertical axis upright and turn towards `front`, as the canvas primitives do.
 function ellipsoid(a, name, c, rx, ry, rz, colour, front = null, geometry = unitSphere) {
  const m = part(a, name, geometry, material(colour));
  if (front) { T[13].crossVectors(Y, front); if (T[13].lengthSq() < 1e-8) T[13].set(1, 0, 0); else T[13].normalize(); T[13].multiplyScalar(rx); T[14].copy(front).multiplyScalar(rz); } else { T[13].set(rx, 0, 0); T[14].set(0, 0, rz); }
  T[12].set(0, ry, 0);
  place(m, c, T[13], T[12], T[14]);
  return m;
 }
 function box(a, name, c, ax, ay, az, hx, hy, hz, colour) {
  const m = part(a, name, unitBox, material(colour));
  T[12].copy(ax).multiplyScalar(2 * hx); T[13].copy(ay).multiplyScalar(2 * hy); T[14].copy(az).multiplyScalar(2 * hz);
  place(m, c, T[12], T[13], T[14]);
  return m;
 }
 // A soft contact shadow on the turf, displaced along the sun like the canvas shadows (engine coordinates).
 function blob(a, name, x, z, h, rx, rz, opacity) {
  let m = a.parts.get(name);
  if (!m) { m = new Mesh(unitDisc, shadowMaterial.clone()); m.matrixAutoUpdate = false; m.renderOrder = 2; a.group.add(m); a.parts.set(name, m); }
  m.frame = frame; m.visible = true; m.material.opacity = opacity;
  place(m, T[12].set(-(x + h * .68), .012, z + h * .47), T[13].set(rx, 0, 0), T[14].set(0, 0, rz), T[15].set(0, 1, 0));
  return m;
 }
 // Engine to scene: joints are relative to the actor's root on the turf; vectors only mirror x.
 const joint = (root, j, out) => out.set(-(root.x + j.x), j.y, root.z + j.z);
 const vector = (v, out) => out.set(-v.x, v.y, v.z);

 // Static scene: turf stripes, pitch, creases, the thirty-yard circle, the rope and the sightscreens.
 function pitchColour(c) { const base = c?.id === 'grass' ? [169, 172, 120] : c?.id === 'dry' ? [197, 170, 121] : [188, 169, 119], damp = c?.weather?.damp || 0; return 'rgb(' + base.map((n, i) => Math.round(n + ([117, 110, 80][i] - n) * damp)).join(',') + ')'; }
 function decal(w, d, x, z, y, colour, opacity = 1, order = 1) {
  const m = new Mesh(new PlaneGeometry(w, d), new MeshLambertMaterial({ color: new Color(colour), transparent: opacity < 1, opacity, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
  m.rotation.x = -Math.PI / 2; m.position.set(-x, y, z); m.renderOrder = order; statics.add(m); return m;
 }
 function buildStatics(info) {
  for (const child of statics.children) { child.geometry?.dispose?.(); if (child.material?.map) { child.material.map.dispose(); child.material.dispose(); } }
  statics.clear();
  const grass = Array.isArray(info.grass) && info.grass.length >= 2 ? info.grass : ['#668948', '#5b8041'];
  // Two texels, one per mowing stripe, repeated every 11 m so a stripe is 5.5 m like the canvas terrain.
  const data = new Uint8Array(8);
  grass.slice(0, 2).forEach((hex, i) => { const n = parseInt(String(hex).replace('#', '').slice(0, 6), 16) || 0x5b8041; data.set([n >> 16 & 255, n >> 8 & 255, n & 255, 255], i * 4); });
  const texture = new DataTexture(data, 2, 1, RGBAFormat, UnsignedByteType);
  texture.colorSpace = SRGBColorSpace; texture.wrapS = texture.wrapT = RepeatWrapping; texture.magFilter = NearestFilter; texture.minFilter = LinearMipmapLinearFilter; texture.generateMipmaps = true; texture.repeat.set(63, 1); texture.needsUpdate = true;
  const ground = new Mesh(new PlaneGeometry(693, 693), new MeshLambertMaterial({ map: texture }));
  ground.rotation.x = -Math.PI / 2; ground.renderOrder = 0; statics.add(ground);
  decal(3.1, 22.85, 0, 10.125, .004, '#9e916a', 1, 1);
  decal(2.96, 22.7, 0, 10.1, .006, pitchColour(info.conditions), 1, 2);
  decal(1.62, 22.7, .05, 10.1, .008, '#c7b581', .27, 3);
  for (const z of Cricket.Rules.crease) { decal(3.5, .028, 0, z, .01, '#f5f0db', 1, 4); for (const x of [-1.12, 1.12]) decal(.024, 1.25, x, z - .275, .01, '#eae8d7', 1, 4); }
  for (const z of Cricket.Rules.wickets) decal(2.24, .02, 0, z, .01, '#ece7ce', .8, 4);
  if (info.circle) {
   const at = t => new Vector3(-Math.sin(t) * 27.43, .012, Math.cos(t) * 27.43 + (Math.cos(t) > 0 ? 18.4 : 0)), points = [];
   for (let i = 0; i < 100; i += 2) points.push(at(i * Math.PI / 50), at((i + 1) * Math.PI / 50));
   for (const x of [-27.43, 27.43]) points.push(new Vector3(x, .012, 0), new Vector3(x, .012, 18.4));
   statics.add(new LineSegments(new BufferGeometry().setFromPoints(points), new LineBasicMaterial({ color: '#e0e5c3', transparent: true, opacity: .42 })));
  }
  const rope = info.rope || { x: 62, z: 70 }, ring = [];
  for (let i = 0; i < 160; i++) { const a = i * Math.PI / 80; ring.push(new Vector3(-Math.sin(a) * rope.x, .025, Math.cos(a) * rope.z)); }
  statics.add(new LineLoop(new BufferGeometry().setFromPoints(ring), new LineBasicMaterial({ color: '#ede7ca' })));
  for (const z of [-69, 69]) { const screen = new Mesh(new BoxGeometry(7.6, 3.8, .2), material(info.test ? '#e9e7d9' : '#273638')); screen.position.set(0, 2.0, z); statics.add(screen); }
 }

 function projection() {
  const w = viewW, h = viewH; if (!(w > 0 && h > 0)) return;
  const f = .98 * h, cx = .52 * w, cy = .43 * h, near = .25, far = 900;
  camera.projectionMatrix.makePerspective(-cx / f * near, (w - cx) / f * near, cy / f * near, -(h - cy) / f * near, near, far);
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
 }

 const api = {
  canvas: gl,
  get active() { return active; },
  resize(w, h, dpr) { if (!(w > 0 && h > 0)) return; renderer.setPixelRatio(dpr || 1); renderer.setSize(w, h, false); viewW = w; viewH = h; projection(); },
  suspend() { active = false; },
  // Called by drawField once the camera for the frame is known. `info` is the static scene description.
  begin(cam, w, h, info = {}) {
   active = true; frame++; test = !!info.test;
   const key = JSON.stringify([info.grass, info.conditions?.id, info.conditions?.weather?.damp, info.circle, info.test, info.rope]);
   if (key !== staticKey) { staticKey = key; buildStatics(info); }
   camera.position.set(-cam.x, cam.y, cam.z); camera.up.set(0, 1, 0); camera.lookAt(-cam.tx, cam.ty, cam.tz);
   forward.set(-cam.tx, cam.ty, cam.tz).sub(camera.position).normalize();
   if (w !== viewW || h !== viewH) { viewW = w; viewH = h; projection(); }
  },
  wickets(z, broken = false) {
   const a = actor('stumps:' + z);
   for (let i = -1; i <= 1; i++) {
    const m = part(a, 'stump' + i, unitCylinder, material('#eae4c7'));
    T[0].set(-i * .0762, 0, z); T[1].set(-(broken ? i * .2 : 0), .711, 0); T[2].copy(T[0]).addScaledVector(T[1], .5);
    place(m, T[2], T[3].set(.019, 0, 0), T[1], T[4].set(0, 0, .019));
   }
   if (!broken) box(a, 'bails', T[0].set(0, .735, z), T[1].set(1, 0, 0), T[2].set(0, 1, 0), T[3].set(0, 0, 1), .1143, .012, .012, '#efdfb1');
   else for (let i = 0; i < 2; i++) box(a, 'bail' + i, T[0].set(-(-.34 + i * .6), .02, z + .13), T[1].set(1, 0, 0), T[2].set(0, 1, 0), T[3].set(0, 0, 1), .075, .011, .011, '#f2e9c9');
  },
  // The canvas renderer never draws the ball smaller than 2.6 px (its shadow 1.25 px), so a distant ball stays
  // visible; the sphere grows the same way, from its depth along the camera axis (View.project's unit).
  ball(loc) {
   const a = actor('ball');
   T[0].set(-loc.x, loc.h, loc.z);
   const depth = Math.max(.2, T[1].subVectors(T[0], camera.position).dot(forward)), metre = .98 * viewH / depth, r = Math.max(.036, 2.6 / metre);
   ellipsoid(a, 'ball', T[0], r, r, r, test ? '#b9313b' : '#f3efdf');
   blob(a, 'shadow', loc.x, loc.z, loc.h, Math.max(.044, 1.25 / metre), Math.max(.044, 1.25 / metre), Math.min(.4, Math.max(.09, .5 / (1 + loc.h * .5))));
  },
  // BatterRig.pose, in metres relative to the batter's root on the turf. `look` carries the kit colours.
  batter(rootX, rootZ, pose, look, ball) {
   const a = actor('batter'), root = { x: rootX, z: rootZ }, front = vector(pose.front, T[11]);
   for (const [tag, hip, knee, ankle, isFront] of [['L', pose.leftHip, pose.leftKnee, pose.leftAnkle, true], ['R', pose.rightHip, pose.rightKnee, pose.rightAnkle, false]]) {
    joint(root, hip, T[0]); joint(root, knee, T[1]); joint(root, ankle, T[2]);
    capsule(a, 'thigh' + tag, T[0], T[1], .088, look.trousers); ellipsoid(a, 'knee' + tag, T[1], .07, .076, .066, look.trousers); capsule(a, 'shin' + tag, T[1], T[2], .057, look.trousers);
    // Boots point with the stance and turn with the weight transfer, as in drawBatter.
    T[3].set(look.hand || 1, 0, 0).lerp(T[4].set(.10, 0, 1), isFront ? pose.weight * .8 : pose.weight * .18).normalize(); vector(T[3], T[5]);
    T[6].copy(T[2]).addScaledVector(T[5], .055); T[6].y -= .025;
    ellipsoid(a, 'boot' + tag, T[6], .054, .048, .145, '#eeeedd', T[5]);
    T[7].copy(T[1]).lerp(T[2], .13).addScaledVector(front, .035); T[8].copy(T[1]).lerp(T[2], .89).addScaledVector(front, .03);
    capsule(a, 'pad' + tag, T[7], T[8], .074, '#f0efdf');
   }
   joint(root, pose.pelvis, T[0]); joint(root, pose.shoulders, T[1]);
   ellipsoid(a, 'pelvis', T[2].copy(T[0]).setY(T[0].y + .015), .174, .105, .127, look.trousers, front);
   T[3].copy(T[0]).setY(T[0].y + .03); T[4].copy(T[1]).setY(T[1].y - .04);
   ellipsoid(a, 'waist', T[3], .18, .11, .13, look.shirt, front); capsule(a, 'torso', T[3], T[4], .165, look.shirt); ellipsoid(a, 'chest', T[4], .237, .13, .125, look.shirt, front);
   const direction = vector(pose.direction, T[10]);
   for (const [tag, shoulder, elbow, wrist] of [['L', pose.leftShoulder, pose.leftElbow, pose.leftWrist], ['R', pose.rightShoulder, pose.rightElbow, pose.rightWrist]]) {
    joint(root, shoulder, T[0]); joint(root, elbow, T[1]); joint(root, wrist, T[2]);
    ellipsoid(a, 'shoulder' + tag, T[0], .08, .084, .077, look.shirt); capsule(a, 'upperArm' + tag, T[0], T[1], .045, look.skin); capsule(a, 'sleeve' + tag, T[0], T[3].copy(T[0]).lerp(T[1], .62), .062, look.shirt);
    ellipsoid(a, 'elbow' + tag, T[1], .043, .043, .043, look.skin); capsule(a, 'forearm' + tag, T[1], T[2], .035, look.skin); ellipsoid(a, 'glove' + tag, T[2], .041, .034, .047, '#f1f1e3', direction);
   }
   joint(root, pose.shoulders, T[0]); T[0].y += .005; joint(root, pose.head, T[1]); T[2].copy(T[1]).setY(T[1].y - .09);
   capsule(a, 'neck', T[0], T[2], .046, look.skin); capsule(a, 'collar', T[0], T[3].copy(T[0]).lerp(T[2], .3), .059, '#294f66');
   const lookDir = vector(pose.headLook, T[9]);
   ellipsoid(a, 'head', T[1], .092, .123, .101, look.skin, lookDir);
   T[4].copy(T[1]); T[4].y += .027; T[4].z -= .010;
   ellipsoid(a, 'helmet', T[4], .105, .12, .113, '#173b50', lookDir, capGeometry(1.30));
   T[5].copy(T[4]).addScaledVector(lookDir, .10); T[5].y -= .014; T[6].crossVectors(Y, lookDir).normalize();
   box(a, 'peak', T[5], T[6], Y, lookDir, .111, .010, .065, '#254f64');
   // One rigid bat: handle from the knob to the top of the blade, then the blade to the toe.
   joint(root, pose.knob, T[0]); joint(root, pose.bladeTop, T[1]); joint(root, pose.toe, T[2]);
   capsule(a, 'handle', T[0], T[1], .014, '#78958c'); ellipsoid(a, 'knob', T[0], .018, .017, .017, '#385c59');
   T[3].addVectors(T[1], T[2]).multiplyScalar(.5); T[4].subVectors(T[2], T[1]); const blade = T[4].length(); T[4].divideScalar(Math.max(1e-6, blade));
   box(a, 'blade', T[3], vector(pose.batWidth, T[5]), T[4], vector(pose.batFace, T[6]), .047, blade / 2, .016, '#e6c68f');
   blob(a, 'shadow', rootX + (pose.leftAnkle.x + pose.rightAnkle.x) / 2 + .12, rootZ + (pose.leftAnkle.z + pose.rightAnkle.z) / 2 + .08, 0, .46, .32, .24);
   if (ball) api.ball(ball);
  },
  // FielderRig.pose for fielders, the bowler, the non-striker, runners and the umpire; `f` is the engine's actor.
  fielder(f, pose, look, ball) {
   const a = actor('fielder:' + f.id), root = { x: f.x, z: f.z }, front = vector(pose.front, T[11]), side = vector(pose.side, T[10]);
   for (let i = 0; i < 2; i++) {
    joint(root, pose.hips[i], T[0]); joint(root, pose.knees[i], T[1]); joint(root, pose.ankles[i], T[2]);
    capsule(a, 'thigh' + i, T[0], T[1], .08, look.trousers); ellipsoid(a, 'knee' + i, T[1], .066, .067, .062, look.trousers); capsule(a, 'shin' + i, T[1], T[2], .052, look.trousers);
    T[3].copy(T[2]).addScaledVector(front, .055); T[3].y -= .025;
    ellipsoid(a, 'foot' + i, T[3], .052, .039, .125, '#e7e9df', front);
    if (f.batting) { T[4].copy(T[1]).lerp(T[2], .12).addScaledVector(front, .04); T[5].copy(T[1]).lerp(T[2], .87).addScaledVector(front, .04); capsule(a, 'pad' + i, T[4], T[5], .072, '#e9eddf'); }
   }
   joint(root, pose.pelvis, T[0]); joint(root, pose.shoulders, T[1]);
   ellipsoid(a, 'pelvis', T[2].copy(T[0]).setY(T[0].y + .025), .175, .11, .12, look.trousers, front);
   T[3].copy(T[0]).setY(T[0].y + .04); T[4].copy(T[1]).setY(T[1].y - .035);
   ellipsoid(a, 'waist', T[3], .16, .1, .11, look.shirt, front); capsule(a, 'torso', T[3], T[4], .15, look.shirt); ellipsoid(a, 'chest', T[4], .22, .11, .115, look.shirt, front);
   const keeper = f.id === 'keeper', handColour = keeper || f.batting ? '#e2e8d8' : look.skin;
   for (let i = 0; i < 2; i++) {
    joint(root, pose.roots[i], T[0]); joint(root, pose.elbows[i], T[1]); joint(root, pose.wrists[i], T[2]);
    ellipsoid(a, 'shoulder' + i, T[0], .071, .08, .065, look.shirt); capsule(a, 'upperArm' + i, T[0], T[1], .042, look.skin); capsule(a, 'sleeve' + i, T[0], T[3].copy(T[0]).lerp(T[1], .55), .055, look.shirt);
    ellipsoid(a, 'elbow' + i, T[1], .037, .041, .036, look.skin); capsule(a, 'forearm' + i, T[1], T[2], .032, look.skin);
    ellipsoid(a, 'hand' + i, T[2], keeper ? .064 : .039, keeper ? .052 : .034, .033, handColour, front);
   }
   if (look.holding) { joint(root, pose.wrists[f.delivery?.arm === 'left' ? 0 : 1], T[0]); ellipsoid(a, 'held', T[0], .036, .036, .036, test ? '#a53b39' : '#f5f0df'); }
   joint(root, pose.shoulders, T[0]); joint(root, pose.head, T[1]); T[2].copy(T[1]).setY(T[1].y - .115);
   capsule(a, 'neck', T[0], T[2], .043, look.skin);
   ellipsoid(a, 'head', T[1], .087, .116, .092, look.skin, front);
   if (f.batting) {
    ellipsoid(a, 'helmet', T[3].copy(T[1]).setY(T[1].y + .015), .103, .128, .106, '#244655', front, capGeometry(1.6));
    // The bat hangs from the top hand, or grounds at the tip the running model reports.
    joint(root, pose.wrists[1], T[4]);
    const grounded = f.moving && f.progress > .86 || f.grounding;
    if (grounded && f.tip) T[5].set(-f.tip.x, .025, f.tip.z); else T[5].copy(T[4]).addScaledVector(front, .21).setY(T[4].y - .80);
    T[6].subVectors(T[5], T[4]).normalize(); T[7].copy(T[4]).addScaledVector(T[6], .83);
    capsule(a, 'handle', T[4], T[8].copy(T[4]).lerp(T[7], .28), .013, '#6b8b7d');
    T[9].copy(T[4]).lerp(T[7], .64); T[0].copy(T[6]).negate();
    box(a, 'blade', T[9], side, T[0], front, .048, .285, .020, '#dbc08e');
   } else {
    T[3].copy(T[1]).setY(T[1].y + .042);
    ellipsoid(a, 'cap', T[3], .097, .093, .10, '#244655', front, capGeometry(1.55));
    T[4].copy(T[3]).addScaledVector(front, .094); T[4].y -= .007;
    box(a, 'peak', T[4], side, Y, front, .091, .008, .055, '#345968');
   }
   blob(a, 'shadow', f.x + (pose.ankles[0].x + pose.ankles[1].x) / 2 + .1, f.z + (pose.ankles[0].z + pose.ankles[1].z) / 2 + .07, 0, .42, .3, .22);
   if (ball) api.ball(ball);
  },
  render() {
   for (const a of actors.values()) {
    if (a.frame !== frame) { a.group.visible = false; continue; }
    for (const m of a.parts.values()) if (m.frame !== frame) m.visible = false;
   }
   renderer.render(scene, camera);
  }
 };
 return api;
}
