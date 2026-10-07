/* Modelos conceptuales locales. No ejecutan ni evalúan el código del editor. */
import { escapeHtml } from './src/shared/lib/escape-html';
import {
  applyQuestOperation,
  hex,
  initialQuestState,
  packetData,
  questExplorerOf,
} from './src/entities/exercise/explorers';
(() => {
  'use strict';
  const states = new Map();
  function descriptor(item) {
    return questExplorerOf(item?.id || '');
  }
  function stateFor(item, info) {
    if (!states.has(item.id)) states.set(item.id, initialQuestState(info));
    return states.get(item.id);
  }
  function button(operation, label, extra = '') {
    return `<button type="button" data-lab-action="quest-explore" data-quest-op="${operation}" ${extra}>${label}</button>`;
  }
  function prediction(state, question, options, answer, explanation) {
    return `<fieldset class="qx-prediction"><legend>Antes de ejecutar: ${escapeHtml(question)}</legend><div class="qx-options">${options.map((label, index) => button('predict-' + index, escapeHtml(label), `aria-pressed="${state.prediction === index}"`)).join('')}</div>${state.prediction === null ? '<p>Elegí una respuesta para revelar el porqué. No suma puntos a la misión.</p>' : `<p class="qx-answer ${state.prediction === answer ? 'qx-good' : ''}"><strong>${state.prediction === answer ? 'Sí.' : 'Revisemos la regla.'}</strong> ${escapeHtml(explanation)}</p>`}</fieldset>`;
  }
  function robotBody(state, info) {
    const robot =
      '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 6v6M19 6h10M11 18h26v23H11zM6 24h5m26 0h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="19" cy="26" r="2.5" fill="currentColor"/><circle cx="29" cy="26" r="2.5" fill="currentColor"/><path d="M18 34h12" stroke="currentColor" stroke-width="3"/></svg>';
    const cells = [];
    for (let y = 2; y >= 0; y--)
      for (let x = 0; x < 3; x++) {
        const here = state.x === x && state.y === y,
          goal = x === 2 && y === 2;
        cells.push(
          `<div class="qx-cell ${here ? 'qx-here' : ''} ${goal ? 'qx-goal' : ''}"><span class="qx-coordinate">${x},${y}</span>${here ? robot : goal ? '<span class="qx-beacon">✦</span>' : '<span class="qx-dot">·</span>'}${here && goal ? '<span class="qx-arrival">Llegaste</span>' : ''}</div>`,
        );
      }
    const log = state.logs.length
      ? `<ol class="qx-log" start="${state.logs[0].step}">${state.logs.map((entry) => `<li><strong>${escapeHtml(entry.summary)}</strong><span>${escapeHtml(entry.why)}</span></li>`).join('')}</ol>`
      : '<p class="qx-empty-log">El registro va a mostrar primero la propuesta y después por qué se acepta o rechaza.</p>';
    return `<div class="qx-heading"><span class="small-label">EXPLORADOR · ESTADOS Y DECISIONES</span><h3>Un paso. Una decisión.</h3><p>Llegá a la baliza con cuatro movimientos. Los bordes son paredes: chocar no cambia la posición ni consume batería.</p></div>
      <div class="qx-robot-layout"><div><div class="qx-grid" role="img" aria-label="Hangar de 3 por 3. Robot en x ${state.x}, y ${state.y}. Baliza en x 2, y 2. Norte aumenta y; este aumenta x."><div class="qx-cells" aria-hidden="true">${cells.join('')}</div></div><p class="qx-grid-caption">Norte ↑ · Este → · Coordenadas (x,y)</p>
        <div class="qx-direction-pad" role="group" aria-label="Mover el robot un paso">${button('move-N', '↑ N', 'class="qx-north" aria-label="Ir al norte: sumar uno a y"')}${button('move-O', '← O', 'class="qx-west" aria-label="Ir al oeste: restar uno a x"')}${button('move-S', '↓ S', 'class="qx-south" aria-label="Ir al sur: restar uno a y"')}${button('move-E', 'E →', 'class="qx-east" aria-label="Ir al este: sumar uno a x"')}</div>
      </div><div><dl class="qx-stats"><div><dt>Posición</dt><dd>(${state.x},${state.y})</dd></div><div><dt>Batería</dt><dd>${state.energy}/${state.initialEnergy}</dd></div><div><dt>Pasos aceptados</dt><dd>${state.moves}</dd></div></dl><meter class="qx-battery" min="0" max="${state.initialEnergy}" value="${state.energy}" aria-label="Batería restante: ${state.energy} de ${state.initialEnergy}">${state.energy}</meter>
        <div class="qx-rule"><strong>Proponer → validar → confirmar</strong><p>Solo si 0 ≤ x,y ≤ 2 y batería &gt; 0, se actualizan juntas posición y energía.</p></div><div class="qx-actions" role="group" aria-label="Reiniciar el tablero con una batería inicial">${[2, 4, 6].map((energy) => button('battery-' + energy, `Reiniciar · ${energy} de batería`, `aria-pressed="${state.initialEnergy === energy}"`)).join('')}</div>
        ${state.x === 2 && state.y === 2 ? '<p class="qx-goal-message">✦ Baliza alcanzada. La traza explica cómo llegaste.</p>' : state.energy === 0 ? '<p class="qx-goal-message">Batería agotada. Podés probar otra orden para observar que el estado se conserva.</p>' : ''}
      </div></div><details class="qx-history" open><summary>Traza de decisiones · últimos 6 intentos</summary>${log}</details>
      ${prediction(state, 'en (0,0), con batería 4, intentás O. ¿Qué queda?', ['(0,0), batería 4', '(0,0), batería 3', '(-1,0), batería 3'], 0, 'La posición candidata es (-1,0), fuera del hangar. Se rechaza antes de modificar posición o energía.')}
      <p class="qx-scope">${info.language === 'go' ? 'Variante visual compartida: usa N/S/E/O y bordes. El jefe Go-103 usa F/R en un espacio sin estos bordes, y se detiene ante F sin energía. El contrato del editor manda.' : 'La grilla y batería corresponden al modelo de Rust-103. Rust-101 solo transforma coordenadas y Rust-102 valida un inventario: comparten la idea de decidir antes de modificar el estado.'}</p>`;
  }

  function bytesPreview(bytes) {
    if (!bytes.length) return '∅';
    const beginning = bytes
      .slice(0, 6)
      .map((byte) => hex(byte))
      .join(' ');
    return bytes.length > 6 ? beginning + ' … (' + bytes.length + ' bytes)' : beginning;
  }
  function packetBody(state, info) {
    const rust = info.language === 'rust',
      lowBits = rust ? 4 : 5,
      lowMask = (1 << lowBits) - 1;
    const data = packetData(state, info),
      type = state.control >>> lowBits,
      low = state.control & lowMask;
    const bits = Array.from({ length: 8 }, (_, index) => {
      const bit = 7 - index,
        active = !!(state.control & (1 << bit)),
        field = bit >= lowBits ? 'tipo' : rust ? 'banderas' : 'prioridad';
      return button(
        'bit-' + bit,
        `<small>b${bit} · ${field === 'tipo' ? 'T' : rust ? 'B' : 'P'}</small><strong>${active ? 1 : 0}</strong><span>${1 << bit}</span>`,
        `class="qx-bit ${field === 'tipo' ? 'qx-type-bit' : 'qx-low-bit'}" aria-pressed="${active}" aria-label="Alternar bit ${bit}, peso ${1 << bit}, campo ${field}, valor actual ${active ? 1 : 0}"`,
      );
    }).join('');
    const checksumName = rust ? 'rotl8 + XOR' : 'CRC-32 IEEE';
    const checksumDigits = rust ? 2 : 8;
    const lengthExplanation = rust
      ? `Un byte de longitud: 0x${hex(data.lengthBytes[0])} = ${data.declared}. No hay orden entre varios bytes que elegir.`
      : `Big-endian: 0x${hex(data.lengthBytes[0])} × 256 + 0x${hex(data.lengthBytes[1])} = ${data.declared}. El byte de mayor peso va primero.`;
    const result =
      data.failure === 'version'
        ? 'Rechazado: versión distinta de 1.'
        : data.failure === 'largo'
          ? `Rechazado: declara ${data.declared} bytes, pero llegaron ${state.size}.`
          : data.failure === 'checksum'
            ? 'Rechazado: la comprobación recibida no coincide con la calculada.'
            : 'Pasa las comprobaciones representadas en este modelo.';
    const checksumExplain = rust
      ? `Se calcula a = rotl8(a,1) XOR byte, desde a=0. En Rust-105 entran solo sus datos; en el paquete Rust-106 entran cabecera, longitud y payload. Con este paquete: 0x${hex(data.computed)}.`
      : `Go-105 y Go-106 usan hash/crc32.ChecksumIEEE sobre el payload. En Go-106 la marca y la longitud se validan por separado; el CRC no las incluye.`;
    return `<div class="qx-heading"><span class="small-label">EXPLORADOR · BITS Y PROTOCOLOS</span><h3>Desarmá un mensaje.</h3><p>Tocá un bit: cada posición pesa el doble de la anterior. Después alterá la longitud o un byte recibido y seguí las comprobaciones del receptor.</p></div>
      <div class="qx-control-byte"><div class="qx-byte-summary"><strong>Byte de control · misión 104</strong><code>0x${hex(state.control)} = ${state.control}</code></div><div class="qx-bit-grid" role="group" aria-label="Ocho bits del byte de control; cada botón alterna un bit">${bits}</div><div class="qx-fields"><span class="qx-field-type">Tipo: <strong>${type}</strong> · ${8 - lowBits} bits altos</span><span class="qx-field-low">${rust ? 'Banderas' : 'Prioridad'}: <strong>${low}</strong> · ${lowBits} bits bajos</span></div><p class="qx-equation"><code>(${type} &lt;&lt; ${lowBits}) | ${low} = ${state.control}</code></p><p class="qx-scope">${rust ? 'En la misión 104 se admiten tipos 0…15. El paquete de la misión 106 exige versión 1: cambiar los bits altos puede hacerlo inválido.' : 'Este control de 3+5 bits pertenece a Go-104. La trama de Go-106 usa otra cabecera: una marca fija 0x47. Cambiar este control no modifica esa trama.'}</p></div>
      <div class="qx-packet-heading"><strong>Paquete completo · misión 106</strong><span>${state.size + (rust ? 3 : 7)} bytes totales</span></div>
      <div class="qx-actions" role="group" aria-label="Elegir tamaño real del payload">${(rust ? [0, 3, 6] : [0, 3, 6, 260]).map((size) => button('size-' + size, `${size} bytes`, `aria-pressed="${state.size === size}"`)).join('')}</div>
      <div class="qx-wire" aria-label="Campos del paquete recibido"><div><small>${rust ? 'Cabecera' : 'Marca fija'}</small><code>${rust ? hex(state.control) : '47'}</code></div><div><small>Longitud</small><code>${data.lengthBytes.map((byte) => hex(byte)).join(' ')}</code></div><div class="qx-payload"><small>Payload recibido</small><code>${bytesPreview(data.received)}</code></div><div><small>${checksumName} enviado</small><code>${hex(
        data.sent,
        checksumDigits,
      )
        .match(/.{1,2}/g)
        .join(' ')}</code></div></div>
      <p class="qx-length-explanation">${lengthExplanation}</p><div class="qx-actions qx-fault-controls" role="group" aria-label="Simular alteraciones durante la transmisión">${button('corrupt', 'Alternar b0 del primer byte', `aria-pressed="${state.corrupt}" ${state.size === 0 ? 'disabled' : ''}`)}${button('bad-length', 'Alternar b0 de la longitud', `aria-pressed="${state.badLength}"`)}${rust ? '' : button('reverse-endian', 'Invertir bytes de longitud', `aria-pressed="${state.reversed}"`)}${button('packet-reset', 'Restaurar paquete')}</div>
      <div class="qx-checksum"><div><span>Enviado</span><code>0x${hex(data.sent, checksumDigits)}</code></div><span aria-hidden="true">${data.sent === data.computed ? '=' : '≠'}</span><div><span>Calculado</span><code>0x${hex(data.computed, checksumDigits)}</code></div></div><p class="qx-checksum-explanation">${checksumExplain}</p>
      <div class="qx-verdict ${data.failure ? 'qx-rejected' : 'qx-accepted'}"><strong>${result}</strong><span>${rust ? 'Orden de validación: mínimo → versión → largo exacto → checksum.' : 'Orden de validación: mínimo → marca → largo exacto → CRC.'}</span></div>
      ${rust ? prediction(state, '¿qué guarda 0x13 en un formato de 4+4 bits?', ['Tipo 3, banderas 1', 'Tipo 1, banderas 3', 'Tipo 19, sin banderas'], 1, '0x13 es 0001 0011: el nibble alto vale 1 y el bajo vale 3.') : prediction(state, '00 03 leído como uint16 big-endian, ¿cuánto vale?', ['768', '3', '300'], 1, 'El primer byte pesa 256: 0×256 + 3 = 3. Invertidos, 03 00 representan 768.')}
      <p class="qx-scope">${rust ? 'Esta huella educativa de 8 bits y el CRC-32 IEEE de Go son algoritmos diferentes: no son intercambiables.' : 'CRC-32 IEEE no es la huella de rotación + XOR usada en las misiones Rust.'} Ninguna de estas comprobaciones autentica al emisor. El inspector muestra casos concretos, no demuestra ausencia de colisiones.</p>`;
  }
  function body(state, info) {
    return info.mode === 'robot' ? robotBody(state, info) : packetBody(state, info);
  }
  function render(item) {
    const info = descriptor(item);
    if (!info) return null;
    const state = stateFor(item, info);
    return `<section class="quest-explorer" data-quest-explorer="${escapeHtml(item.id)}" aria-label="Explorador conceptual interactivo"><p class="qx-model-label">Modelo conceptual · No ejecuta el código del editor ni acredita la misión.</p><div data-q-view>${body(state, info)}</div><p class="qx-live" data-q-status role="status" aria-live="polite" aria-atomic="true">${escapeHtml(state.notice)}</p></section>`;
  }
  function act(control, item, host) {
    const info = descriptor(item),
      operation = control?.dataset?.questOp;
    if (!info || !operation) return;
    const panel =
      control.closest?.('[data-quest-explorer]') || host?.querySelector?.('[data-quest-explorer]');
    if (!panel || panel.dataset.questExplorer !== item.id) return;
    const state = applyQuestOperation(stateFor(item, info), info, operation);
    if (!state) return;
    states.set(item.id, state);
    const view = panel.querySelector('[data-q-view]'),
      live = panel.querySelector('[data-q-status]');
    if (!view || !live) return;
    const historyWasClosed = panel.querySelector('.qx-history')?.open === false;
    view.innerHTML = body(state, info);
    if (historyWasClosed) {
      const history = panel.querySelector('.qx-history');
      if (history) history.open = false;
    }
    live.textContent = state.notice;
    const controls = [...panel.querySelectorAll('[data-quest-op]')];
    const replacement =
      controls.find((next) => next.dataset.questOp === operation && !next.disabled) ||
      controls.find((next) => !next.disabled);
    replacement?.focus({ preventScroll: true });
  }
  function reset() {
    states.clear();
  }
  window.TallerQuestExplorers = { render, act, reset };
})();
