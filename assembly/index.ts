// assembly/index.ts
export function sum(ptr: usize, len: i32): i32 {
  let total = 0;
  for (let i = 0; i < len; i++) {
    total += load<i32>(ptr + (i << 2)); // 4 bytes mỗi phần tử
  }
  return total;
}
