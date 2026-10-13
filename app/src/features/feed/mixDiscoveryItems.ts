// Keep existing post/ad order and introduce each discovery type early, without duplicates.
export function mixDiscoveryItems<T extends { id: string; type: string }>(base: T[], groups: T[][]): T[] {
  const queues = groups.map(group => Array.from(new Map(group.map(item => [item.id, item])).values()));
  const result: T[] = [];
  let turn = 0;
  let posts = 0;
  const append = () => {
    for (let n = 0; n < queues.length; n++) {
      const item = queues[turn++ % queues.length].shift();
      if (item) { result.push(item); return; }
    }
  };
  for (const item of base) {
    result.push(item);
    if (item.type === 'post' && ++posts % 2 === 0) append();
  }
  // Short or empty feeds still expose one card from each discovery category.
  const represented = new Set(result.map(item => item.type));
  for (const queue of queues) {
    if (queue[0] && !represented.has(queue[0].type)) result.push(queue[0]);
  }
  return result;
}
