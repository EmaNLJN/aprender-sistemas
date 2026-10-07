import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'yaml';
import { scenarios } from './lib/content-fixtures.ts';
import { repoRoot } from './lib/sources.ts';

const { test, done } = scenarios('compose-runs');

interface Service {
  networks?: string[];
  ports?: unknown[];
  volumes?: string[];
  group_add?: string[];
  read_only?: boolean;
  cap_drop?: string[];
  dns?: string[];
  stop_grace_period?: string;
  pids_limit?: number;
  environment?: Record<string, string>;
  command?: string[];
  deploy?: { replicas?: string };
  profiles?: string[];
  build?: unknown;
  image?: string;
}

interface Compose {
  services: Record<string, Service>;
  networks: Record<string, { internal?: boolean }>;
}

function read(file: string): string {
  return readFileSync(path.join(repoRoot, file), 'utf8');
}

function secondsOf(duration: string | undefined): number {
  const match = /^(\d+)s$/.exec(duration ?? '');
  assert.ok(match, `a duration in seconds was expected, got ${String(duration)}`);
  return Number(match[1]);
}

function numberAfter(source: string, pattern: RegExp): number {
  const match = pattern.exec(source);
  assert.ok(match, `${String(pattern)} did not match`);
  return Number(match[1]);
}

const compose = parse(read('docker/compose.yaml'), { merge: true }) as Compose;
const { executor, 'worker-runs': worker } = compose.services;
const executorJobTimeout = numberAfter(
  read('backend/api/app/Jobs/ExecuteRun.php'),
  /const TIMEOUT = (\d+);/,
);

test('the executor sits only in the sandbox network, publishes nothing and is locked down', () => {
  assert.deepEqual(executor.networks, ['sandbox']);
  assert.equal(executor.ports, undefined);
  assert.ok(executor.volumes?.includes('/var/run/docker.sock:/var/run/docker.sock'));
  assert.equal(executor.group_add?.length, 1);
  assert.equal(executor.read_only, true);
  assert.deepEqual(executor.cap_drop, ['ALL']);
  assert.deepEqual(executor.dns, ['127.0.0.1']);
  assert.equal(executor.stop_grace_period, '45s');
});

test('the executor bounds the Go threads of the docker CLI it spawns, so its pids limit holds on any host', () => {
  assert.equal(executor.environment?.GOMAXPROCS, '2');
  assert.ok((executor.pids_limit ?? 0) >= 128, `pids_limit is ${String(executor.pids_limit)}`);
});

test('the worker joins app and sandbox, scales with the executor slots and matches the job timeout', () => {
  assert.deepEqual(worker.networks, ['app', 'sandbox']);
  assert.match(worker.deploy?.replicas ?? '', /EXECUTOR_MAX_CONCURRENT/);
  assert.equal(worker.stop_grace_period, '150s');
  const command = worker.command ?? [];
  assert.ok(command.includes('--tries=1'));
  assert.ok(command.includes(`--timeout=${executorJobTimeout}`));
});

test('the sandbox network is internal and only the executor and the worker use it', () => {
  assert.equal(compose.networks.sandbox.internal, true);
  const members = Object.entries(compose.services)
    .filter(([, service]) => service.networks?.includes('sandbox'))
    .map(([name]) => name)
    .sort();
  assert.deepEqual(members, ['executor', 'worker-runs']);
});

test('EXECUTOR_TOKEN reaches only the executor and the worker', () => {
  const holders = Object.entries(compose.services)
    .filter(([, service]) => service.environment?.EXECUTOR_TOKEN !== undefined)
    .map(([name]) => name)
    .sort();
  assert.deepEqual(holders, ['executor', 'worker-runs']);
  const anchors = read('docker/compose.yaml').split(/^services:/m)[0];
  const tokenLines = anchors.split('\n').filter((line) => line.includes('EXECUTOR_TOKEN'));
  assert.equal(tokenLines.length, 1);
  assert.match(tokenLines[0], /^x-executor-token:/);
});

test('the sandbox images build under their own profile with the names the executor expects', () => {
  for (const [name, image] of [
    ['sandbox-rust', 'taller-sandbox-rust:local'],
    ['sandbox-go', 'taller-sandbox-go:local'],
  ]) {
    const service = compose.services[name];
    assert.deepEqual(service.profiles, ['sandbox-images']);
    assert.equal(service.image, image);
    assert.ok(service.build);
  }
  assert.equal(executor.environment?.EXECUTOR_RUST_IMAGE, 'taller-sandbox-rust:local');
  assert.equal(executor.environment?.EXECUTOR_GO_IMAGE, 'taller-sandbox-go:local');
});

test('the deadline chain closes: executor write timeout < PHP request timeout, job timeout < worker grace', () => {
  const writeTimeout = numberAfter(
    read('backend/executor/cmd/executor/main.go'),
    /writeTimeout\s*=\s*(\d+) \* time\.Second/,
  );
  const requestTimeout = numberAfter(
    read('backend/api/config/runs.php'),
    /'request_timeout' => (\d+)/,
  );
  assert.ok(writeTimeout < requestTimeout);
  assert.ok(executorJobTimeout < secondsOf(worker.stop_grace_period));
});

done();
