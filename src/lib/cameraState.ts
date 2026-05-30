// Shared mutable state updated by CameraController every frame.
// Lets HTML components (minimap, HUD) read camera without React re-renders.
export const liveCamera = {
  x: 0, y: 0, z: 0,
  yaw: 0, pitch: 0,
}
