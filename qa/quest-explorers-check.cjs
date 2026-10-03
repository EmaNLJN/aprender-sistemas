'use strict';

// Deterministic model checks. Real browser layout/keyboard checks live separately.
// The VM hook exposes private pure functions only in this test's source copy.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const filename = path.join(__dirname, '..', 'quest-explorers.js');
const source = fs.readFileSync(filename, 'utf8');
const marker = 'window.TallerQuestExplorers = {render, act, reset};';
assert.ok(source.includes(marker), 'The test hook must match the public API declaration.');
const instrumented = source.replace(marker,
  'globalThis.test = {crc32,rotateChecksum,packetData,fresh,descriptor,move}; ' + marker);
const context = {window: {}};
vm.createContext(context);
vm.runInContext(instrumented, context, {filename});
const api = context.window.TallerQuestExplorers;
const model = context.test;
let assertions = 0;

function check(value, label) {
  assert.ok(value, label);
  assertions++;
}

for (const language of ['rust', 'go']) {
  for (let number = 101; number <= 106; number++) {
    const id = language + '-' + number;
    check(api.render({id}).includes('data-quest-explorer="' + id + '"'), 'Supported exercise: ' + id);
  }
}
for (const id of ['go-100', 'rust-107', 'go-110', 'evil-101', 'go-101x', '<script>']) {
  check(api.render({id}) === null, 'Unsupported ID returns null: ' + id);
}

const robot = model.fresh({mode: 'robot'});
model.move(robot, 'O');
check(robot.energy === 4 && robot.x === 0 && robot.y === 0, 'Wall collision preserves position and battery');
for (const direction of ['N', 'N', 'E', 'E']) model.move(robot, direction);
check(robot.x === 2 && robot.y === 2 && robot.energy === 0 && robot.moves === 4, 'Four accepted steps reach the beacon');
model.move(robot, 'S');
check(robot.x === 2 && robot.y === 2 && robot.energy === 0, 'An empty battery prevents an otherwise valid movement');
for (let index = 0; index < 8; index++) model.move(robot, 'N');
check(robot.logs.length === 6 && robot.logs[0].step === robot.attempts - 5, 'Trace retains the last six numbered attempts');

check(model.crc32([]) === 0, 'CRC-32 IEEE of an empty message is zero');
check(model.crc32(Array.from(Buffer.from('123456789'))) === 0xCBF43926, 'CRC-32 IEEE matches the independent standard check vector');
check(model.rotateChecksum([1, 2]) === 0 && model.rotateChecksum([2, 1]) === 5, 'The educational rotate-XOR checksum is order-sensitive');

const go = {mode: 'packet', language: 'go'};
const rust = {mode: 'packet', language: 'rust'};
let packet = model.fresh(go);
let data = model.packetData(packet, go);
check(data.failure === null && data.declared === 3, 'Initial Go packet is accepted');
packet.corrupt = true;
data = model.packetData(packet, go);
check(data.failure === 'checksum' && data.sent !== data.computed, 'Corruption changes received data without recalculating the sent CRC');
packet = model.fresh(go);
packet.size = 260;
data = model.packetData(packet, go);
check(data.lengthBytes[0] === 1 && data.lengthBytes[1] === 4 && data.failure === null, 'Length 260 is encoded as 01 04 in big-endian');
packet.reversed = true;
data = model.packetData(packet, go);
check(data.declared === 1025 && data.failure === 'largo', 'Reversing length bytes changes the receiver interpretation to 1025');
packet.badLength = true;
check(model.packetData(packet, go).declared === 1024, 'Length bit control affects the low received byte after reversal');

packet = model.fresh(rust);
data = model.packetData(packet, rust);
check(data.failure === null && data.sent === model.rotateChecksum([0x13, 3, 0x53, 0x4F, 0x53]), 'Rust packet checksum covers header, length and payload');
packet.corrupt = true;
check(model.packetData(packet, rust).failure === 'checksum', 'Rust packet detects the selected payload corruption');
packet.badLength = true;
check(model.packetData(packet, rust).failure === 'largo', 'Rust length validation precedes checksum validation');
packet.control = 0x23;
check(model.packetData(packet, rust).failure === 'version', 'Rust version validation precedes length validation');

// A deliberately small DOM double verifies the act contract and stable live node.
// It does not claim to validate accessibility-tree behavior or browser geometry.
function fixture(id) {
  const item = {id};
  const view = {innerHTML: ''};
  const live = {textContent: ''};
  let focused = '';
  const panel = {
    dataset: {questExplorer: id},
    querySelector(selector) {
      if (selector === '[data-q-view]') return view;
      if (selector === '[data-q-status]') return live;
      return null;
    },
    querySelectorAll() {
      return [...view.innerHTML.matchAll(/<button[^>]*data-quest-op="([^"]+)"([^>]*)>/g)].map(match => ({
        dataset: {questOp: match[1]},
        disabled: /\bdisabled\b/.test(match[2]),
        focus() { focused = match[1]; }
      }));
    }
  };
  return {
    item, view, live,
    get focused() { return focused; },
    act(operation) {
      api.act({dataset: {questOp: operation}, closest() { return panel; }}, item, null);
    }
  };
}

let mounted = fixture('rust-103');
mounted.act('move-N');
check(mounted.view.innerHTML.includes('(0,1)') && mounted.live.textContent.includes('batería 3') && mounted.focused === 'move-N', 'Movement updates view and live text, restoring the same control focus');
mounted.act('battery-2');
check(mounted.live.textContent.includes('batería 2') && mounted.view.innerHTML.includes('(0,0)'), 'Battery preset starts a new run');
mounted.act('predict-0');
check(mounted.view.innerHTML.includes('qx-good'), 'Correct prediction displays explanatory feedback');

mounted = fixture('go-106');
mounted.act('size-260');
check(mounted.view.innerHTML.includes('01 04') && mounted.focused === 'size-260', 'Size control updates displayed bytes and retains focus');
mounted.act('reverse-endian');
check(mounted.view.innerHTML.includes('1025') && mounted.view.innerHTML.includes('qx-rejected'), 'Endianness control displays the concrete rejection');
mounted.act('packet-reset');
check(mounted.view.innerHTML.includes('qx-accepted') && mounted.focused === 'packet-reset', 'Packet reset restores an accepted packet');
api.reset();
check(api.render({id: 'rust-103'}).includes('Partís de (0,0)'), 'Global reset clears per-exercise model state');

console.log(JSON.stringify({
  status: 'PASS', assertions,
  scope: 'Pure models, checksums, mutations, rendering, live text and focus restoration. Browser checks are separate.'
}));
