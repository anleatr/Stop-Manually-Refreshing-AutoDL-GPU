import fs from 'node:fs';
import { promises as files } from 'node:fs';
import path from 'node:path';

const preferenceFile = userData => path.join(userData, 'runtime-location.json');

export function runtimeDirectory(userData) {
  try {
    return path.resolve(JSON.parse(fs.readFileSync(preferenceFile(userData), 'utf8')).directory);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return path.resolve(process.env.AUTODL_RUNTIME_DIR || path.join(userData, 'runtime'));
}

export async function emptyDestination(source, selected) {
  const [current, destination] = await Promise.all([files.realpath(source), files.realpath(selected)]);
  const contains = (parent, child) => {
    const relative = path.relative(parent, child);
    return !path.isAbsolute(relative) && relative.split(path.sep)[0] !== '..';
  };
  if (contains(current, destination) || contains(destination, current))
    throw new Error('请选择与当前数据目录互不包含的文件夹。');
  if ((await files.readdir(destination)).length)
    throw new Error('请选择空文件夹，避免覆盖已有数据。');
  return destination;
}

// 调用方先关闭服务和浏览器，并在复制期间持有原目录的运行锁。
export async function migrateRuntime(source, destination, userData) {
  const staging = await files.mkdtemp(path.join(path.dirname(destination), '.gpu-watch-migration-'));
  try {
    const payload = path.join(staging, 'data');
    await files.cp(source, payload, {
      recursive: true,
      force: false,
      errorOnExist: true,
      filter: file => file !== path.join(source, 'server.lock'),
    });
    await files.rmdir(destination); // 再次验证目标为空。
    await files.rename(payload, destination);

    const preference = preferenceFile(userData);
    await files.mkdir(userData, { recursive: true });
    await files.writeFile(preference + '.tmp', JSON.stringify({ directory: destination }) + '\n', { mode: 0o600 });
    await files.rename(preference + '.tmp', preference);
  } finally {
    await files.rm(staging, { recursive: true, force: true });
  }
}
