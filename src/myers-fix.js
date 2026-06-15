/**
 * Simple Myers' diff algorithm implementation
 */
function myersSimple(aLen, bLen, eq) {
  if (aLen === 0 && bLen === 0) return [];
  if (aLen === 0) {
    const ops = [];
    for (let b = 0; b < bLen; b++) ops.push({ type: 'ins', a: 0, b });
    return ops;
  }
  if (bLen === 0) {
    const ops = [];
    for (let a = 0; a < aLen; a++) ops.push({ type: 'del', a, b: 0 });
    return ops;
  }

  // Find the optimal path
  const path = [];
  let a = 0, b = 0;
  
  while (a < aLen || b < bLen) {
    if (a < aLen && b < bLen && eq(a, b)) {
      path.push({ type: 'eq', a, b });
      a++;
      b++;
    } else if (a < aLen && (b >= bLen || (a + 1 <= aLen && eq(a + 1, b)))) {
      path.push({ type: 'del', a, b });
      a++;
    } else {
      path.push({ type: 'ins', a, b });
      b++;
    }
  }
  
  return path;
}

// Replace the original myersDiff function
export { myersSimple as myersDiff };