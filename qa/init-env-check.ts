import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('init-env');

const workspaces: string[] = [];
process.on('exit', () => {
  for (const workspace of workspaces) rmSync(workspace, { recursive: true, force: true });
});

interface Workspace {
  envFile: string;
  socket: string;
  run(socket?: string): { status: number | null; stderr: string };
}

function createWorkspace(): Workspace {
  const root = mkdtempSync(path.join(tmpdir(), 'taller-init-env-'));
  workspaces.push(root);
  const scripts = path.join(root, 'backend/api/scripts');
  mkdirSync(scripts, { recursive: true });
  copyFileSync(
    path.join(repoRoot, 'backend/api/scripts/init-env.sh'),
    path.join(scripts, 'init-env.sh'),
  );
  const socket = path.join(root, 'fake-docker.sock');
  writeFileSync(socket, '');
  return {
    envFile: path.join(root, '.env'),
    socket,
    run(socketPath = socket) {
      const result = spawnSync('sh', [path.join(scripts, 'init-env.sh')], {
        env: { ...process.env, DOCKER_SOCKET: socketPath },
        encoding: 'utf8',
      });
      return { status: result.status, stderr: result.stderr };
    },
  };
}

function valueOf(envFile: string, name: string): string | undefined {
  const line = readFileSync(envFile, 'utf8')
    .split('\n')
    .find((entry) => entry.startsWith(`${name}=`));
  return line?.slice(name.length + 1);
}

test('it adds a 64-hex executor token and the numeric group id of the socket file', () => {
  const workspace = createWorkspace();
  assert.equal(workspace.run().status, 0);
  assert.match(valueOf(workspace.envFile, 'EXECUTOR_TOKEN') ?? '', /^[0-9a-f]{64}$/);
  assert.equal(
    valueOf(workspace.envFile, 'EXECUTOR_DOCKER_GID'),
    String(statSync(workspace.socket).gid),
  );
});

test('it keeps existing values on a second run', () => {
  const workspace = createWorkspace();
  writeFileSync(workspace.envFile, 'EXECUTOR_TOKEN=keep-me\nEXECUTOR_DOCKER_GID=4242\n');
  assert.equal(workspace.run().status, 0);
  assert.equal(valueOf(workspace.envFile, 'EXECUTOR_TOKEN'), 'keep-me');
  assert.equal(valueOf(workspace.envFile, 'EXECUTOR_DOCKER_GID'), '4242');
});

test('without a Docker socket it fails saying so and leaves no empty group id', () => {
  const workspace = createWorkspace();
  const missing = path.join(path.dirname(workspace.envFile), 'no-such.sock');
  const result = workspace.run(missing);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /socket de Docker/);
  assert.equal(valueOf(workspace.envFile, 'EXECUTOR_DOCKER_GID'), undefined);
});

done();
