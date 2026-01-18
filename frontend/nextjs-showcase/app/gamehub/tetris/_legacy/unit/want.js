
export const want = (next, matrix) => { // 方块是否能移到到指定位置
  const xy = next.xy;
  const shape = next.shape;
  const horizontal = shape.get(0).size;
  return shape.every((m, k1) => (
    m.every((n, k2) => {
      if (xy[1] < 0) { // left
        return false;
      }
      if (xy[1] + horizontal > 10) { // right
        return false;
      }
      if (xy[0] + k1 < 0) { // top
        return true;
      }
      if (xy[0] + k1 >= 20) { // bottom
        return false;
      }
      if (n) {
        if (matrix.get(xy[0] + k1).get(xy[1] + k2)) {
          return false;
        }
        return true;
      }
      return true;
    })
  ));
};
