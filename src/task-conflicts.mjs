import { AppError } from './errors.mjs';
import { gpuKey } from './matching.mjs';
const FINISHED = new Set(['cancelled', 'expired', 'completed', 'found']);
export function sameTaskResource(task, config) {
  return task.config.provider === 'autodl' && config.provider === 'autodl'
    && task.config.mode === config.mode
    && (config.mode === 'clone' ? task.config.sourceId === config.sourceId
      : gpuKey(task.config.gpuModel) === gpuKey(config.gpuModel));
}
export function blocksTask(task, config) {
  // 未核验完成的提交记录即使被停止也保留去重保护。
  return sameTaskResource(task, config)
    && (!FINISHED.has(task.state) || (!!task.operation && task.state !== 'completed'));
}
export function canReplaceTask(task) {
  return ['attention', 'paused'].includes(task.state) && !task.operation && !task.result && !task.replacedBy;
}
export function conflictError(task) {
  const conflict = {
    id: task.id, name: task.config.name, state: task.state, mode: task.config.mode, updatedAt: task.updatedAt,
    gpuModel: task.config.gpuModel, cuda: task.config.cuda, regions: task.config.regions,
    lastError: task.lastError || null, hasOperation: !!task.operation,
    replaceable: canReplaceTask(task),
  };
  const message = conflict.hasOperation ? '旧任务已有提交记录，请先核对目标实例，避免重复租用'
    : conflict.replaceable ? '已有未提交的旧任务，可查看原因或停止旧任务并按当前配置重建'
    : '已有相同资源的任务正在运行或等待处理，请先查看原任务';
  return new AppError('DUPLICATE', message, { status: 409, conflict });
}

export function manualCompletionPatch(task, at) {
  return {
    state:'completed', updatedAt:at, lastError:null, balanceLow:null,
    manualCompletion:{at, previousState:task.state, previousError:task.lastError || null},
    logs:[...task.logs,{at,level:'warn',message:'用户手动确认本地任务完成；原提交记录保留，允许创建同资源新任务。'}].slice(-200),
  };
}
