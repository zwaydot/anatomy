import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as k from "../../kit/iso-kit.mjs";
import * as G from "../../kit/lathe.mjs";
import * as A from "../../kit/audit.mjs";
import { turning } from "../../kit/turn-build.mjs";
import { glCamera } from "../../kit/gl.mjs";
import { kitScript, glScript, turnScript } from "../../scripts/inline-kit.mjs";
import * as M from "./model.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2);
const theme = argv.includes("--light") ? "light" : "dark";

const WIDTH = 860;
const HEIGHT = 520;
const AZIMUTH = 90;
const ELEVATION = 0;

const { W, PHONE_H, HALF_T, GAP, BEZEL, Z0, Z1 } = M;

export const P = k.fitProjection(
  [
    [-(GAP + W + 4), 0, Z0 - 4],
    [GAP + W + 4, 0, Z0 - 4],
    [-(GAP + W + 4), 0, Z1 + 4],
    [GAP + W + 4, 0, Z1 + 4],
  ],
  WIDTH,
  HEIGHT,
  { pad: 36, azimuth: AZIMUTH, elevation: ELEVATION },
);

const VERT = (x, y) => G.frameOf([x, y, 0], [0, 0, 1], [1, 0, 0], [0, 1, 0]);

export const R = A.recorder(P);
export const T = turning(P, { recorder: R });
const bench = T.group("bench", { turn: { pivot: [-400, -400] } });
const leaf = T.group("leaf", { hinge: { point: [0, 0, Z0], axis: [0, 0, 1], range: [0, 180] } });
const leafLayer = T.layer("leaf");
T.stack(["back", "leaf"]);
export const follow = (values) => ({ leaf: values.leaf ?? 0, bench: 0 });
export const poses = () => Array.from({ length: 19 }, (_, i) => follow({ leaf: i * 10 }));
const B = { group: bench, layer: leafLayer };
T.prism({
  name: "phone.right",
  ...B,
  plan: { x: GAP, y: -HALF_T, w: W, d: HALF_T - 0.25, r: 4.2 },
  z: Z0,
  h: PHONE_H,
  bevel: 1.1,
  material: "steel",
  details: {
    seams: [Z0 + 8, Z1 - 8],
    dots: [
      { at: [Z1, GAP + 4, -1.4], normal: [0, 0, 1], size: 0.4 },
      { at: [Z1, GAP + W - 4, -1.4], normal: [0, 0, 1], size: 0.4 },
    ],
  },
});
for (const [i, z] of [Z0 + 28, Z0 + 36, Z0 + 52].entries()) {
  T.prism({
    name: `phone.btn.${i}`,
    ...B,
    plan: { x: GAP + W - 0.2, y: -HALF_T / 2 - 1.1, w: 1.4, d: 2.2, r: 0.5 },
    z,
    h: 7,
    bevel: 0.2,
    material: "chrome",
  });
}
T.round({ name: "hinge.pin", ...B, F: VERT(0, 0), s0: Z0, s1: Z1, r: 0.7, material: "chrome", lit: true });
const LEFT = { x: GAP, y: 0.25, w: W, d: HALF_T - 0.25, r: 4.2 };
T.prism({
  name: "leaf.body",
  group: leaf,
  layer: leafLayer,
  plan: LEFT,
  z: Z0,
  h: PHONE_H,
  bevel: 1.1,
  material: "steel",
  details: {
    seams: [Z0 + 8, Z1 - 8],
    dots: [
      { at: [Z1, GAP + 4, HALF_T - 1.4], normal: [0, 0, 1], size: 0.4 },
      { at: [Z1, GAP + W - 4, HALF_T - 1.4], normal: [0, 0, 1], size: 0.4 },
    ],
  },
});

const verify = argv.includes("--verify");
const out = T.build({ statics: R.items, poses, verify, strict: false });
A.settle(R, P);
const layerOf = (name) =>
  R.items
    .filter((item) => item.layer === name)
    .sort((a, b) => a.key - b.key)
    .map((item) => item.svg);
const BACK = layerOf("back");

const LABEL = "A folding dual-pane reader on a hinge-encoder bench. One shared picture sits behind the glass; as the leaf lifts, blur grows with the cube of distance from the hinge and the inner pane darkens toward its free edge.";
const backSvg = k.figureSvg({ width: WIDTH, height: HEIGHT, label: LABEL, body: BACK });
const canvas = `<canvas class="iso-layer duo-gl" data-canvas="screens" aria-hidden="true"></canvas>`;
const stage = `<div class="iso-stage iso-turn duo-stage" tabindex="0" role="slider" aria-label="Fold the dual-pane reader. Drag or use arrow keys." aria-valuemin="0" aria-valuemax="180" aria-valuenow="0" aria-valuetext="closed">${backSvg}${out.layerSvg("leaf", { width: WIDTH, height: HEIGHT })}${canvas}</div>`;

const DATA = {
  turn: out.data,
  gl: {
    W: WIDTH,
    H: HEIGHT,
    camera: glCamera(P),
    phoneW: W,
    halfT: HALF_T,
    gap: GAP,
    bezel: BEZEL,
    z0: Z0,
    z1: Z1,
    sigma30: M.SIGMA_AT_30,
  },
};

const CSS = `${out.css}
.duo-stage{touch-action:pan-y;cursor:ew-resize;outline:none;border-radius:8px}
.duo-stage:focus-visible{outline:1px solid var(--anatomy-muted);outline-offset:6px}
.duo-stage[data-drag]{cursor:ew-resize}
.duo-gl{display:block;pointer-events:none}
.duo-gl{mix-blend-mode:normal}
`;

const LIVE = readFileSync(join(HERE, "live.js"), "utf8").replace("__DATA__", JSON.stringify(DATA));
const body = k.plateHtml({
  fig: "Fig 1",
  title: "Duo fold · hinge blur",
  hint: "Drag to fold · arrow keys",
  readout: "fold 0° · σ_edge 0 px",
  keys: [
    { mark: "lit", label: "Hinge pin and the leaf that carries the cover" },
    { mark: "raised", label: "Inner right pane, sharp when the book is open" },
  ],
  caption:
    "Content lives on one virtual image behind the glass. Softness grows as u³ from the hinge (at 30° the free edge is 48 px, halfway only 6). The moving inner pane also darkens toward that edge. Bezels stay sharp.",
  body: `<style>${CSS}</style>${stage}`,
});
const page = k.pageHtml({
  title: "Duo fold · hinge blur",
  theme,
  body,
  script: turnScript() + glScript() + LIVE,
  width: 920,
});
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const name = `duo-fold${theme === "light" ? "-light" : ""}.html`;
  writeFileSync(join(HERE, name), page);
  console.log(`wrote ${name} · ${(page.length / 1024).toFixed(0)} KB · ${out.report.parts} parts · build ${out.report.seconds.toFixed(1)} s`);
}
