// Sample the two triangles of the render grid, including variable spacing and
// the far ranges' decreasing Z axis.
export function heightSampler(geometry, columns) {
  const p = geometry.attributes.position,
    rows = p.count / columns;
  const xs = Array.from({ length: columns }, (_, i) => p.getX(i));
  const zs = Array.from({ length: rows }, (_, j) => p.getZ(j * columns));
  function cell(axis, value) {
    const sign = axis[1] > axis[0] ? 1 : -1;
    if (sign * (value - axis[0]) < 0 || sign * (value - axis.at(-1)) > 0)
      return -1;
    let lo = 0,
      hi = axis.length - 1;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (sign * (value - axis[mid]) >= 0) lo = mid;
      else hi = mid;
    }
    return lo;
  }
  return (x, z) => {
    const j = cell(zs, z);
    if (j < 0) return -Infinity;
    const i = cell(xs, x);
    if (i < 0) return -Infinity;
    const u = (x - xs[i]) / (xs[i + 1] - xs[i]),
      v = (z - zs[j]) / (zs[j + 1] - zs[j]);
    const k = j * columns + i,
      a = p.getY(k),
      b = p.getY(k + 1),
      c = p.getY(k + columns),
      d = p.getY(k + columns + 1);
    return u + v <= 1
      ? a + (b - a) * u + (c - a) * v
      : d + (c - d) * (1 - u) + (b - d) * (1 - v);
  };
}
