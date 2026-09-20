import type { Hand } from "../src/tracking/GestureEngine";
export function hand(x = 0.5, y = 0.5, pinch = 0.8, scale = 1): Hand {
  const landmarks = Array.from({ length: 21 }, () => ({ x, y, z: 0 }));
  landmarks[0] = { x, y: y + 0.1 * scale, z: 0 };
  landmarks[9] = { x, y: y - 0.1 * scale, z: 0 };
  landmarks[8] = { x, y, z: 0 };
  landmarks[4] = { x: x + pinch * 0.2 * scale, y, z: 0 };
  return { id: "Left", confidence: 0.95, landmarks };
}
const sequence = (n: number, fn: (i: number) => Hand[]) =>
  Array.from({ length: n }, (_, i) => ({ t: i * 40, hands: fn(i) }));
export const scenarios = {
  slow: sequence(35, (i) => [hand(0.7 - i * 0.005)]),
  fast: sequence(15, (i) => [hand(0.8 - i * 0.035)]),
  jitter: sequence(30, (i) => [hand(0.5 + (i % 2 ? 0.004 : -0.004))]),
  longPinch: sequence(24, (i) => [
    hand(0.5, 0.5, i > 2 && i < 21 ? 0.15 : 0.8),
  ]),
  falseDetection: sequence(12, (i) => [hand(0.5, 0.5, i === 4 ? 0.1 : 0.8)]),
  drag: sequence(25, (i) => [
    hand(0.75 - i * 0.018, 0.5, i > 2 && i < 22 ? 0.15 : 0.8),
  ]),
  left: sequence(10, (i) => [hand(0.25 + i * 0.05)]),
  right: sequence(10, (i) => [hand(0.75 - i * 0.05)]),
  zoom: sequence(25, (i) => {
    const a = hand(0.4 - i * 0.006, 0.5, 0.15);
    const b = hand(0.6 + i * 0.006, 0.5, 0.15);
    b.id = "Right";
    return [a, b];
  }),
  loss: sequence(30, (i) => (i > 10 && i < 16 ? [] : [hand(0.5)])),
  lowConfidence: sequence(20, () => [{ ...hand(), confidence: 0.2 }]),
  crossing: sequence(20, (i) => [
    hand(0.3 + i * 0.02),
    { ...hand(0.7 - i * 0.02), id: "Right" },
  ]),
  zoomOut: sequence(20, (i) => [
    hand(0.2 + i * 0.009, 0.5, 0.15),
    { ...hand(0.8 - i * 0.009, 0.5, 0.15), id: "Right" },
  ]),
};
