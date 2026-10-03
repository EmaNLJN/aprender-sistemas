// Checks use the public render/act/reset API without exposing private functions.
// The DOM double does not validate browser geometry or accessibility-tree behavior.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { runSource } from './lib/sources.ts';

interface ExplorerItem {
  id: string;
}
interface ExplorerApi {
  render(item: ExplorerItem): string | null;
  act(target: unknown, item: ExplorerItem, event: unknown): void;
  reset(): void;
}
interface ButtonDouble {
  dataset: { questOp: string };
  disabled: boolean;
  focus(): void;
}
interface Fixture {
  item: ExplorerItem;
  view: { innerHTML: string };
  live: { textContent: string };
  readonly focused: string;
  readonly text: string;
  act(operation: string): void;
}

const context = vm.createContext({ window: {} as { TallerQuestExplorers?: unknown } });
runSource(context, 'quest-explorers.js');
const api = context.window.TallerQuestExplorers as ExplorerApi;
let assertions = 0;

function check(value: unknown, label: string): void {
  assert.ok(value, label);
  assertions++;
}

// Only the DOM interfaces used by the public API are simulated here.
function fixture(id: string): Fixture {
  const item = { id };
  const view = { innerHTML: api.render(item) as string };
  const live = { textContent: '' };
  let focused = '';
  const panel = {
    dataset: { questExplorer: id },
    querySelector(selector: string) {
      if (selector === '[data-q-view]') return view;
      if (selector === '[data-q-status]') return live;
      return null;
    },
    querySelectorAll(): ButtonDouble[] {
      return [...view.innerHTML.matchAll(/<button[^>]*data-quest-op="([^"]+)"([^>]*)>/g)].map(
        (match): ButtonDouble => ({
          dataset: { questOp: match[1] },
          disabled: /\bdisabled\b/.test(match[2]),
          focus() {
            focused = match[1];
          },
        }),
      );
    },
  };
  return {
    item,
    view,
    live,
    get focused() {
      return focused;
    },
    get text() {
      return view.innerHTML
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    },
    act(operation: string) {
      api.act(
        {
          dataset: { questOp: operation },
          closest() {
            return panel;
          },
        },
        item,
        null,
      );
    },
  };
}

for (const language of ['rust', 'go']) {
  for (let number = 101; number <= 106; number++) {
    const id = language + '-' + number;
    check(
      api.render({ id })?.includes('data-quest-explorer="' + id + '"'),
      'Supported exercise: ' + id,
    );
  }
}
for (const id of ['go-100', 'rust-107', 'go-110', 'evil-101', 'go-101x', '<script>']) {
  check(api.render({ id }) === null, 'Unsupported ID returns null: ' + id);
}

let mounted = fixture('rust-103');
mounted.act('move-O');
check(
  mounted.text.includes('Posición (0,0)') && mounted.text.includes('Batería 4/4'),
  'Wall collision preserves position and battery',
);
check(mounted.text.includes('Pasos aceptados 0'), 'Rejected movement earns no accepted step');
for (const direction of ['N', 'N', 'E', 'E']) mounted.act('move-' + direction);
check(
  mounted.text.includes('Posición (2,2)') && mounted.text.includes('Batería 0/4'),
  'Four accepted steps reach the beacon with empty battery',
);
check(
  mounted.text.includes('Pasos aceptados 4') && mounted.text.includes('Baliza alcanzada.'),
  'Arrival displays the four accepted steps and success message',
);
mounted.act('move-S');
check(
  mounted.text.includes('Posición (2,2)') && mounted.text.includes('Batería 0/4'),
  'Empty battery prevents an otherwise valid movement',
);
check(
  mounted.live.textContent.includes('sin batería'),
  'A rejected move explains the missing energy',
);
for (let index = 0; index < 8; index++) mounted.act('move-N');
const history = /<ol class="qx-log" start="(\d+)">([\s\S]*?)<\/ol>/.exec(mounted.view.innerHTML);
check(
  history && history[1] === '9' && (history[2].match(/<li>/g) || []).length === 6,
  'Fourteen attempts display exactly the last six, numbered nine through fourteen',
);
check(
  mounted.live.textContent.includes('Intento 14.'),
  'The live announcement retains the total attempt number',
);

mounted.act('battery-4');
mounted.act('move-N');
check(
  mounted.text.includes('Posición (0,1)') &&
    mounted.live.textContent.includes('batería 3') &&
    mounted.focused === 'move-N',
  'Movement updates view and live text, restoring the same control focus',
);
mounted.act('battery-2');
check(
  mounted.live.textContent.includes('batería 2') && mounted.text.includes('Posición (0,0)'),
  'Battery preset starts a new run',
);
mounted.act('predict-0');
check(
  mounted.text.includes('Sí.') && mounted.live.textContent.includes('Predicción correcta.'),
  'Correct prediction displays explanatory feedback',
);

mounted = fixture('go-106');
check(mounted.text.includes('Pasa las comprobaciones'), 'Initial Go packet is accepted');
// CRC-32 IEEE literals were checked independently with Python zlib.crc32.
check(
  mounted.text.includes('Enviado 0x14381A7F') && mounted.text.includes('Calculado 0x14381A7F'),
  'Go SOS payload has the independently verified CRC-32 IEEE',
);
mounted.act('size-0');
check(
  mounted.text.includes('Enviado 0x00000000') && mounted.text.includes('Calculado 0x00000000'),
  'Empty Go payload has CRC-32 IEEE zero',
);
mounted.act('size-3');
mounted.act('corrupt');
check(
  mounted.text.includes('Enviado 0x14381A7F') && mounted.text.includes('Calculado 0x15FA7048'),
  'Corruption changes the received CRC while preserving the transmitted CRC',
);
check(
  mounted.text.includes('Rechazado: la comprobación recibida no coincide'),
  'Go rejects a corrupted payload',
);
mounted.act('size-260');
check(
  mounted.text.includes('01 04') && mounted.text.includes('= 260.'),
  'Length 260 is encoded as 01 04 in big-endian',
);
check(
  mounted.text.includes('Pasa las comprobaciones') && mounted.focused === 'size-260',
  'Size control resets corruptions and retains focus',
);
mounted.act('reverse-endian');
check(
  mounted.text.includes('Rechazado: declara 1025 bytes, pero llegaron 260.'),
  'Reversing length bytes changes receiver interpretation to 1025',
);
mounted.act('bad-length');
check(
  mounted.text.includes('Rechazado: declara 1024 bytes, pero llegaron 260.'),
  'Length bit control affects the low received byte after reversal',
);
mounted.act('packet-reset');
check(
  mounted.text.includes('Pasa las comprobaciones') && mounted.focused === 'packet-reset',
  'Packet reset restores an accepted packet',
);

mounted = fixture('rust-106');
// Worked independently: rotl8+XOR over 13 03 53 4F 53 gives 13 → 25 → 19 → 7D → A9.
check(
  mounted.text.includes('Enviado 0xA9') && mounted.text.includes('Calculado 0xA9'),
  'Rust checksum covers header, length and SOS payload',
);
check(mounted.text.includes('Pasa las comprobaciones'), 'Initial Rust packet is accepted');
mounted.act('corrupt');
check(
  mounted.text.includes('Enviado 0xA9') && mounted.text.includes('Calculado 0xAD'),
  'Rust payload bit corruption changes the independent expected checksum',
);
check(
  mounted.text.includes('Rechazado: la comprobación recibida no coincide'),
  'Rust packet detects selected payload corruption',
);
mounted.act('bad-length');
check(
  mounted.text.includes('Rechazado: declara 2 bytes, pero llegaron 3.'),
  'Rust length validation precedes checksum validation',
);
mounted.act('bit-5');
mounted.act('bit-4');
check(
  mounted.text.includes('0x23 = 35') && mounted.text.includes('Rechazado: versión distinta de 1.'),
  'Rust version validation precedes length validation',
);

api.reset();
check(
  api.render({ id: 'rust-103' })?.includes('Partís de (0,0)'),
  'Global reset clears robot state',
);
check(
  api.render({ id: 'rust-106' })?.includes('0xA9'),
  'Global reset clears packet corruption and control changes',
);

console.log(
  JSON.stringify({
    status: 'PASS',
    assertions,
    scope:
      'Public explorer API: movements, checksums, packet controls, rendering, live text, focus and reset. Browser checks are separate.',
  }),
);
