import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const isWindows = process.platform === 'win32';
const python = process.env.PYTHON || (isWindows ? 'python' : 'python3');
const apiPort = process.env.WHISTLEDROP_API_PORT || '8000';
const children = [];
let stopping = false;

function start(name, command, args, options) {
  const child = spawn(command, args, { stdio: 'inherit', ...options });
  children.push(child);
  child.on('error', error => {
    console.error(`${name} failed to start: ${error.message}`);
    stop(1);
  });
  child.on('exit', (code, signal) => {
    if (stopping) return;
    console.error(`${name} stopped${signal ? ` after ${signal}` : ` with exit code ${code}`}.`);
    stop(code ?? 1);
  });
  return child;
}

function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  process.exitCode = code;

  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (isWindows) {
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
      killer.unref();
    } else {
      child.kill('SIGTERM');
    }
  }
}

process.once('SIGINT', () => stop(130));
process.once('SIGTERM', () => stop(143));

console.log(`Starting WhistleDrop API at http://localhost:${apiPort}`);
start('Backend', python, ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', apiPort], {
  cwd: join(root, 'backend'),
});

console.log('Starting WhistleDrop frontend at http://localhost:5173 (Vite selects the next free port if needed)');
start('Frontend', isWindows ? 'cmd.exe' : 'pnpm', isWindows
  ? ['/d', '/s', '/c', 'pnpm --dir frontend dev']
  : ['--dir', 'frontend', 'dev'], {
  cwd: root,
  env: { ...process.env, VITE_API_URL: process.env.VITE_API_URL || `http://localhost:${apiPort}` },
});
