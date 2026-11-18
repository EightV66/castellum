import { Matrix4, Vector3, MathUtils } from "three";

export function verticalFov(aspect) {
  return MathUtils.radToDeg(
    2 *
      Math.atan(
        Math.tan(MathUtils.degToRad(21.5)) *
          MathUtils.clamp(1.37 / aspect, 1, 1.8),
      ),
  );
}
export function presetPose(location, camera) {
  const eye = new Vector3(...location.view),
    target = new Vector3(...location.point);
  if (location.id === "wing") {
    const lens =
      Math.tan(MathUtils.degToRad(camera.fov / 2)) /
      Math.tan(MathUtils.degToRad(21.5));
    const pull = Math.max(1, 1.6 / (camera.aspect * lens));
    target.x -= 91 * (1 - MathUtils.smoothstep(camera.aspect, 0.56, 1.48));
    eye.x = target.x + (eye.x - location.point[0]) * pull;
    eye.z = target.z + (eye.z - target.z) * pull;
  }
  return { eye, target };
}

// Bounds of the actual projected triangles in CSS pixels, including the stone
// foundation of the court. Only called for a stationary QA view.
export function screenExtent(object, camera, width, height) {
  const point = new Vector3(),
    matrix = new Matrix4();
  const view = new Matrix4().multiplyMatrices(
    camera.projectionMatrix,
    camera.matrixWorldInverse,
  );
  let left = Infinity,
    right = -Infinity,
    top = Infinity,
    bottom = -Infinity;
  object.traverse((mesh) => {
    if (!mesh.isMesh) return;
    matrix.multiplyMatrices(view, mesh.matrixWorld);
    const vertices = mesh.geometry.attributes.position;
    for (let i = 0; i < vertices.count; i++) {
      point.fromBufferAttribute(vertices, i).applyMatrix4(matrix);
      if (point.z < -1 || point.z > 1) continue;
      const x = ((1 + point.x) * width) / 2,
        y = ((1 - point.y) * height) / 2;
      left = Math.min(left, x);
      right = Math.max(right, x);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  });
  return {
    left,
    right,
    top,
    bottom,
    width: right - left,
    height: bottom - top,
  };
}
