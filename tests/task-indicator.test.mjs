import test from 'node:test';
import assert from 'node:assert/strict';
import { taskIndicator, badgeBitmap } from '../desktop/task-indicator.mjs';

test('任务栏优先显示最新占卡任务，已确认占卡时复制失败仍显示蓝色', () => {
  const task = { config: { provider: 'autodl', action: 'execute' } };
  const success = { ...task, state: 'attention', operation: { allocatedAt: 10 }, result: { copyFailed: true } };
  assert.equal(taskIndicator([success]), 'allocated');
  assert.equal(taskIndicator([{ ...task, state: 'watching' }, success]), 'searching');
  assert.equal(taskIndicator([{ ...task, state: 'reconciling' }]), 'attention');
  assert.equal(taskIndicator([{ ...task, state: 'completed', manualCompletion: {} }]), null);
  assert.equal(taskIndicator([{ ...task, state: 'verifying', operation: { receipt: { acceptedAt: 10 } } }]), 'searching');
  const bitmap = badgeBitmap([59, 130, 246]);
  assert.deepEqual([...bitmap.subarray(0, 4)], [0, 0, 0, 0]);
  assert.deepEqual([...bitmap.subarray(4 * (7 * 16 + 7), 4 * (7 * 16 + 8))], [246, 130, 59, 255]);
});

test('仅剩历史占卡记录时清除任务栏圆点，旧任务不会遮住当前任务', () => {
  const config = { provider: 'autodl', action: 'execute' };
  const withAllocation = { config, state: 'completed', operation: { allocatedAt: 10 } };
  const legacy = { config, state: 'completed', result: { gpuVerified: true }, manualCompletion: {} };
  assert.equal(taskIndicator([]), null);
  assert.equal(taskIndicator([withAllocation, legacy]), null);
  assert.equal(taskIndicator([withAllocation, { config, state: 'watching' }, legacy]), 'searching');
});
