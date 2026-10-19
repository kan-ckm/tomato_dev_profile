import { CoreBlockConfig } from "@/types";

/**
 * Cấu hình hiệu ứng 3D Armillary Sphere (Three.js) trên trang /clock.
 */
export const defaultCoreBlockConfig: CoreBlockConfig = {
  dirLightIntensity: 2.2,
  fillLightIntensity: 1.5,
  pointLightIntensity: 5.0,
  speed: 0.6,
  zoom: 22,
  offsetX: 0,
  offsetY: 0,
  ringAmount: 3,
  particleAmount: 3500,
  particleSize: 0.08,
  debrisAmount: 30,
  debrisSize: 1.0,
  ringSpacing: 1.3,
  glowSize: 0.55,
  glowIntensity: 0.8,
  musicEnable: false,
  musicSensitive: 50,
  musicStyle: "tectonic",
};
