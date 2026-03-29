export function buildSeed(input: string): number {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }

  return Math.abs(hash);
}

export function pickFromPool<T>(pool: T[], seed: number, offset = 0): T {
  if (pool.length === 0) {
    throw new Error('Cannot pick from an empty pool.');
  }

  return pool[Math.abs(seed + offset) % pool.length];
}

export function pickManyFromPool<T>(pool: T[], count: number, seed: number): T[] {
  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const copy = [...pool];
  const selected: T[] = [];

  for (let i = 0; i < Math.min(count, pool.length); i += 1) {
    const index = Math.abs(seed + i * 17 + i * i) % copy.length;
    selected.push(copy[index]);
    copy.splice(index, 1);
  }

  return selected;
}
