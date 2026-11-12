const SEARCHING = new Set(['queued', 'watching', 'preparing', 'submitting', 'verifying']);

export function taskIndicator(tasks) {
  // 任务队列按创建时间倒序，只用正在执行或等待处理的任务决定状态。
  for (const task of tasks) {
    if (task.deletedAt || task.config.action !== 'execute' || task.config.provider !== 'autodl') continue;
    const needsAttention = task.state === 'attention' || task.state === 'reconciling';
    if (!needsAttention && !SEARCHING.has(task.state)) continue;
    if (task.operation?.allocatedAt || (task.result?.gpuVerified && !task.result.failed)) return 'allocated';
    return needsAttention ? 'attention' : 'searching';
  }
  return null;
}

export function badgeBitmap([red, green, blue]) {
  const size = 16;
  const bitmap = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const distance = Math.hypot(x - 7.5, y - 7.5);
      if (distance > 7) continue;
      bitmap.set(distance <= 5.5 ? [blue, green, red, 255] : [255, 255, 255, 255], (y * size + x) * 4);
    }
  }
  return bitmap;
}
