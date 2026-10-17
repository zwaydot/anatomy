/** 折叠开合的光学模型：共享像面 + 铰链距立方模糊。 */

export const W = 44; // 单叶宽度
export const PHONE_H = 90; // 沿 z 的高度
export const HALF_T = 5.4; // 单叶厚度
export const GAP = 1.2; // 铰链轴到机身
export const BEZEL = 2.6; // 屏幕凹槽边框
export const Z0 = 16;
export const Z1 = Z0 + PHONE_H;
export const SIGMA_AT_30 = 48; // 30° 时自由边高斯半径（源图像素）
export const IMG = [768, 512];

/** θ：0 闭合，π 全开。u：0 铰链，1 自由边。 */
export function sigmaEdge(theta) {
  return SIGMA_AT_30 * (Math.sin(theta) / Math.sin(Math.PI / 6));
}

export function sigmaAt(theta, u) {
  const uu = Math.min(1, Math.max(0, u));
  return sigmaEdge(theta) * uu * uu * uu;
}

/** 活动内屏沿自由边变暗；两端（闭合/全开）sin=0，保持全亮。 */
export function innerGain(theta, u) {
  const uu = Math.min(1, Math.max(0, u));
  return 1 - 0.52 * uu * Math.sin(theta);
}

export function coverGain(theta) {
  return 1 - 0.08 * Math.sin(theta);
}
