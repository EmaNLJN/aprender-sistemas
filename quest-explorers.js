/* Modelos conceptuales locales. No ejecutan ni evalúan el código del editor. */
(() => {
  'use strict';
  const states = new Map();
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
  const hex = (value, digits = 2) => (value >>> 0).toString(16).toUpperCase().padStart(digits, '0');
  const directions = {N: [0, 1, 'norte'], S: [0, -1, 'sur'], E: [1, 0, 'este'], O: [-1, 0, 'oeste']};
  const sample = [0x53, 0x4F, 0x53, 0, 0xFF, 0x2A];

  function descriptor(item) {
    const match = /^(rust|go)-(10[1-6])$/.exec(item?.id || '');
    return match ? {language: match[1], number: Number(match[2]), mode: Number(match[2]) < 104 ? 'robot' : 'packet'} : null;
  }
  function fresh(info, energy = 4) {
    return info.mode === 'robot'
      ? {x: 0, y: 0, energy, initialEnergy: energy, attempts: 0, moves: 0, logs: [], prediction: null,
          notice: 'Partís de (0,0). Probá O para observar un choque; después buscá la baliza (2,2).'}
      : {control: info.language === 'rust' ? 0x13 : 0xA3, size: 3, corrupt: false, badLength: false, reversed: false, prediction: null,
          notice: 'Alterná un bit o alterá el paquete. Compará la representación con la regla que usa el receptor.'};
  }
  function stateFor(item, info) {
    if (!states.has(item.id)) states.set(item.id, fresh(info));
    return states.get(item.id);
  }
  function button(operation, label, extra = '') {
    return `<button type="button" data-lab-action="quest-explore" data-quest-op="${operation}" ${extra}>${label}</button>`;
  }
  function prediction(state, question, options, answer, explanation) {
    return `<fieldset class="qx-prediction"><legend>Antes de ejecutar: ${esc(question)}</legend><div class="qx-options">${options.map((label, index) => button('predict-' + index, esc(label), `aria-pressed="${state.prediction === index}"`)).join('')}</div>${state.prediction === null ? '<p>Elegí una respuesta para revelar el porqué. No suma puntos a la misión.</p>' : `<p class="qx-answer ${state.prediction === answer ? 'qx-good' : ''}"><strong>${state.prediction === answer ? 'Sí.' : 'Revisemos la regla.'}</strong> ${esc(explanation)}</p>`}</fieldset>`;
  }
  function robotBody(state, info) {
    const robot = '<svg viewBox="0 0 48 48" aria-hidden="true" focusable="false"><path d="M24 6v6M19 6h10M11 18h26v23H11zM6 24h5m26 0h5" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/><circle cx="19" cy="26" r="2.5" fill="currentColor"/><circle cx="29" cy="26" r="2.5" fill="currentColor"/><path d="M18 34h12" stroke="currentColor" stroke-width="3"/></svg>';
    const cells = [];
    for (let y = 2; y >= 0; y--) for (let x = 0; x < 3; x++) {
      const here = state.x === x && state.y === y, goal = x === 2 && y === 2;
      cells.push(`<div class="qx-cell ${here ? 'qx-here' : ''} ${goal ? 'qx-goal' : ''}"><span class="qx-coordinate">${x},${y}</span>${here ? robot : goal ? '<span class="qx-beacon">✦</span>' : '<span class="qx-dot">·</span>'}${here && goal ? '<span class="qx-arrival">Llegaste</span>' : ''}</div>`);
    }
    const log = state.logs.length ? `<ol class="qx-log" start="${state.logs[0].step}">${state.logs.map(entry => `<li><strong>${esc(entry.summary)}</strong><span>${esc(entry.why)}</span></li>`).join('')}</ol>` : '<p class="qx-empty-log">El registro va a mostrar primero la propuesta y después por qué se acepta o rechaza.</p>';
    return `<div class="qx-heading"><span class="small-label">EXPLORADOR · ESTADOS Y DECISIONES</span><h3>Un paso. Una decisión.</h3><p>Llegá a la baliza con cuatro movimientos. Los bordes son paredes: chocar no cambia la posición ni consume batería.</p></div>
      <div class="qx-robot-layout"><div><div class="qx-grid" role="img" aria-label="Hangar de 3 por 3. Robot en x ${state.x}, y ${state.y}. Baliza en x 2, y 2. Norte aumenta y; este aumenta x."><div class="qx-cells" aria-hidden="true">${cells.join('')}</div></div><p class="qx-grid-caption">Norte ↑ · Este → · Coordenadas (x,y)</p>
        <div class="qx-direction-pad" role="group" aria-label="Mover el robot un paso">${button('move-N', '↑ N', 'class="qx-north" aria-label="Ir al norte: sumar uno a y"')}${button('move-O', '← O', 'class="qx-west" aria-label="Ir al oeste: restar uno a x"')}${button('move-S', '↓ S', 'class="qx-south" aria-label="Ir al sur: restar uno a y"')}${button('move-E', 'E →', 'class="qx-east" aria-label="Ir al este: sumar uno a x"')}</div>
      </div><div><dl class="qx-stats"><div><dt>Posición</dt><dd>(${state.x},${state.y})</dd></div><div><dt>Batería</dt><dd>${state.energy}/${state.initialEnergy}</dd></div><div><dt>Pasos aceptados</dt><dd>${state.moves}</dd></div></dl><meter class="qx-battery" min="0" max="${state.initialEnergy}" value="${state.energy}" aria-label="Batería restante: ${state.energy} de ${state.initialEnergy}">${state.energy}</meter>
        <div class="qx-rule"><strong>Proponer → validar → confirmar</strong><p>Solo si 0 ≤ x,y ≤ 2 y batería &gt; 0, se actualizan juntas posición y energía.</p></div><div class="qx-actions" role="group" aria-label="Reiniciar el tablero con una batería inicial">${[2, 4, 6].map(energy => button('battery-' + energy, `Reiniciar · ${energy} de batería`, `aria-pressed="${state.initialEnergy === energy}"`)).join('')}</div>
        ${state.x === 2 && state.y === 2 ? '<p class="qx-goal-message">✦ Baliza alcanzada. La traza explica cómo llegaste.</p>' : state.energy === 0 ? '<p class="qx-goal-message">Batería agotada. Podés probar otra orden para observar que el estado se conserva.</p>' : ''}
      </div></div><details class="qx-history" open><summary>Traza de decisiones · últimos 6 intentos</summary>${log}</details>
      ${prediction(state, 'en (0,0), con batería 4, intentás O. ¿Qué queda?', ['(0,0), batería 4', '(0,0), batería 3', '(-1,0), batería 3'], 0, 'La posición candidata es (-1,0), fuera del hangar. Se rechaza antes de modificar posición o energía.')}
      <p class="qx-scope">${info.language === 'go' ? 'Variante visual compartida: usa N/S/E/O y bordes. El jefe Go-103 usa F/R en un espacio sin estos bordes, y se detiene ante F sin energía. El contrato del editor manda.' : 'La grilla y batería corresponden al modelo de Rust-103. Rust-101 solo transforma coordenadas y Rust-102 valida un inventario: comparten la idea de decidir antes de modificar el estado.'}</p>`;
  }

  // CRC-32 IEEE reflejado, solo para dibujar el modelo en JavaScript.
  function crc32(bytes) {
    let crc = 0xFFFFFFFF;
    for (const byte of bytes) {
      crc ^= byte;
      for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xEDB88320 : 0);
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function rotateChecksum(bytes) {
    let value = 0;
    for (const byte of bytes) value = (((value << 1) | (value >>> 7)) & 255) ^ byte;
    return value;
  }
  function packetData(state, info) {
    const rust = info.language === 'rust';
    const original = Array.from({length: state.size}, (_, index) => sample[index % sample.length]);
    const received = original.slice();
    if (state.corrupt && received.length) received[0] ^= 1;
    let lengthBytes = rust ? [state.size] : [state.size >>> 8, state.size & 255];
    if (state.reversed && !rust) lengthBytes.reverse();
    if (state.badLength) lengthBytes[lengthBytes.length - 1] ^= 1;
    const declared = rust ? lengthBytes[0] : lengthBytes[0] * 256 + lengthBytes[1];
    const sent = rust ? rotateChecksum([state.control, state.size, ...original]) : crc32(original);
    const computed = rust ? rotateChecksum([state.control, ...lengthBytes, ...received]) : crc32(received);
    const failure = rust && (state.control >>> 4) !== 1 ? 'version' : declared !== state.size ? 'largo' : sent !== computed ? 'checksum' : null;
    return {original, received, lengthBytes, declared, sent, computed, failure};
  }
  function bytesPreview(bytes) {
    if (!bytes.length) return '∅';
    const beginning = bytes.slice(0, 6).map(byte => hex(byte)).join(' ');
    return bytes.length > 6 ? beginning + ' … (' + bytes.length + ' bytes)' : beginning;
  }
  function packetBody(state, info) {
    const rust = info.language === 'rust', lowBits = rust ? 4 : 5, lowMask = (1 << lowBits) - 1;
    const data = packetData(state, info), type = state.control >>> lowBits, low = state.control & lowMask;
    const bits = Array.from({length: 8}, (_, index) => {
      const bit = 7 - index, active = !!(state.control & (1 << bit)), field = bit >= lowBits ? 'tipo' : rust ? 'banderas' : 'prioridad';
      return button('bit-' + bit, `<small>b${bit} · ${field === 'tipo' ? 'T' : rust ? 'B' : 'P'}</small><strong>${active ? 1 : 0}</strong><span>${1 << bit}</span>`, `class="qx-bit ${field === 'tipo' ? 'qx-type-bit' : 'qx-low-bit'}" aria-pressed="${active}" aria-label="Alternar bit ${bit}, peso ${1 << bit}, campo ${field}, valor actual ${active ? 1 : 0}"`);
    }).join('');
    const checksumName = rust ? 'rotl8 + XOR' : 'CRC-32 IEEE';
    const checksumDigits = rust ? 2 : 8;
    const lengthExplanation = rust ? `Un byte de longitud: 0x${hex(data.lengthBytes[0])} = ${data.declared}. No hay orden entre varios bytes que elegir.` : `Big-endian: 0x${hex(data.lengthBytes[0])} × 256 + 0x${hex(data.lengthBytes[1])} = ${data.declared}. El byte de mayor peso va primero.`;
    const result = data.failure === 'version' ? 'Rechazado: versión distinta de 1.' : data.failure === 'largo' ? `Rechazado: declara ${data.declared} bytes, pero llegaron ${state.size}.` : data.failure === 'checksum' ? 'Rechazado: la comprobación recibida no coincide con la calculada.' : 'Pasa las comprobaciones representadas en este modelo.';
    const checksumExplain = rust ? `Se calcula a = rotl8(a,1) XOR byte, desde a=0. En Rust-105 entran solo sus datos; en el paquete Rust-106 entran cabecera, longitud y payload. Con este paquete: 0x${hex(data.computed)}.` : `Go-105 y Go-106 usan hash/crc32.ChecksumIEEE sobre el payload. En Go-106 la marca y la longitud se validan por separado; el CRC no las incluye.`;
    return `<div class="qx-heading"><span class="small-label">EXPLORADOR · BITS Y PROTOCOLOS</span><h3>Desarmá un mensaje.</h3><p>Tocá un bit: cada posición pesa el doble de la anterior. Después alterá la longitud o un byte recibido y seguí las comprobaciones del receptor.</p></div>
      <div class="qx-control-byte"><div class="qx-byte-summary"><strong>Byte de control · misión 104</strong><code>0x${hex(state.control)} = ${state.control}</code></div><div class="qx-bit-grid" role="group" aria-label="Ocho bits del byte de control; cada botón alterna un bit">${bits}</div><div class="qx-fields"><span class="qx-field-type">Tipo: <strong>${type}</strong> · ${8 - lowBits} bits altos</span><span class="qx-field-low">${rust ? 'Banderas' : 'Prioridad'}: <strong>${low}</strong> · ${lowBits} bits bajos</span></div><p class="qx-equation"><code>(${type} &lt;&lt; ${lowBits}) | ${low} = ${state.control}</code></p><p class="qx-scope">${rust ? 'En la misión 104 se admiten tipos 0…15. El paquete de la misión 106 exige versión 1: cambiar los bits altos puede hacerlo inválido.' : 'Este control de 3+5 bits pertenece a Go-104. La trama de Go-106 usa otra cabecera: una marca fija 0x47. Cambiar este control no modifica esa trama.'}</p></div>
      <div class="qx-packet-heading"><strong>Paquete completo · misión 106</strong><span>${state.size + (rust ? 3 : 7)} bytes totales</span></div>
      <div class="qx-actions" role="group" aria-label="Elegir tamaño real del payload">${(rust ? [0, 3, 6] : [0, 3, 6, 260]).map(size => button('size-' + size, `${size} bytes`, `aria-pressed="${state.size === size}"`)).join('')}</div>
      <div class="qx-wire" aria-label="Campos del paquete recibido"><div><small>${rust ? 'Cabecera' : 'Marca fija'}</small><code>${rust ? hex(state.control) : '47'}</code></div><div><small>Longitud</small><code>${data.lengthBytes.map(byte => hex(byte)).join(' ')}</code></div><div class="qx-payload"><small>Payload recibido</small><code>${bytesPreview(data.received)}</code></div><div><small>${checksumName} enviado</small><code>${hex(data.sent, checksumDigits).match(/.{1,2}/g).join(' ')}</code></div></div>
      <p class="qx-length-explanation">${lengthExplanation}</p><div class="qx-actions qx-fault-controls" role="group" aria-label="Simular alteraciones durante la transmisión">${button('corrupt', 'Alternar b0 del primer byte', `aria-pressed="${state.corrupt}" ${state.size === 0 ? 'disabled' : ''}`)}${button('bad-length', 'Alternar b0 de la longitud', `aria-pressed="${state.badLength}"`)}${rust ? '' : button('reverse-endian', 'Invertir bytes de longitud', `aria-pressed="${state.reversed}"`)}${button('packet-reset', 'Restaurar paquete')}</div>
      <div class="qx-checksum"><div><span>Enviado</span><code>0x${hex(data.sent, checksumDigits)}</code></div><span aria-hidden="true">${data.sent === data.computed ? '=' : '≠'}</span><div><span>Calculado</span><code>0x${hex(data.computed, checksumDigits)}</code></div></div><p class="qx-checksum-explanation">${checksumExplain}</p>
      <div class="qx-verdict ${data.failure ? 'qx-rejected' : 'qx-accepted'}"><strong>${result}</strong><span>${rust ? 'Orden de validación: mínimo → versión → largo exacto → checksum.' : 'Orden de validación: mínimo → marca → largo exacto → CRC.'}</span></div>
      ${rust ? prediction(state, '¿qué guarda 0x13 en un formato de 4+4 bits?', ['Tipo 3, banderas 1', 'Tipo 1, banderas 3', 'Tipo 19, sin banderas'], 1, '0x13 es 0001 0011: el nibble alto vale 1 y el bajo vale 3.') : prediction(state, '00 03 leído como uint16 big-endian, ¿cuánto vale?', ['768', '3', '300'], 1, 'El primer byte pesa 256: 0×256 + 3 = 3. Invertidos, 03 00 representan 768.')}
      <p class="qx-scope">${rust ? 'Esta huella educativa de 8 bits y el CRC-32 IEEE de Go son algoritmos diferentes: no son intercambiables.' : 'CRC-32 IEEE no es la huella de rotación + XOR usada en las misiones Rust.'} Ninguna de estas comprobaciones autentica al emisor. El inspector muestra casos concretos, no demuestra ausencia de colisiones.</p>`;
  }
  function body(state, info) { return info.mode === 'robot' ? robotBody(state, info) : packetBody(state, info); }
  function render(item) {
    const info = descriptor(item);
    if (!info) return null;
    const state = stateFor(item, info);
    return `<section class="quest-explorer" data-quest-explorer="${esc(item.id)}" aria-label="Explorador conceptual interactivo"><p class="qx-model-label">Modelo conceptual · No ejecuta el código del editor ni acredita la misión.</p><div data-q-view>${body(state, info)}</div><p class="qx-live" data-q-status role="status" aria-live="polite" aria-atomic="true">${esc(state.notice)}</p></section>`;
  }
  function move(state, direction) {
    const [dx, dy, name] = directions[direction];
    const x = state.x + dx, y = state.y + dy;
    state.attempts++;
    let summary, why;
    if (x < 0 || x > 2 || y < 0 || y > 2) {
      summary = `${direction} → choque; seguís en (${state.x},${state.y}), batería ${state.energy}.`;
      why = `La propuesta (${x},${y}) cruza el borde. Se rechaza antes de gastar: el estado se conserva.`;
    } else if (state.energy === 0) {
      summary = `${direction} → sin batería; seguís en (${state.x},${state.y}).`;
      why = `La propuesta (${x},${y}) entra en la grilla, pero necesita una unidad de energía. No se confirma.`;
    } else {
      const previous = `(${state.x},${state.y})`;
      state.x = x; state.y = y; state.energy--; state.moves++;
      summary = `${direction} → ${previous} a (${x},${y}), batería ${state.energy}.`;
      why = `Mover al ${name} es válido. Posición y batería cambian juntas; se consumió exactamente una unidad.`;
    }
    state.logs.push({step: state.attempts, summary, why});
    if (state.logs.length > 6) state.logs.shift();
    state.notice = `Intento ${state.attempts}. ${summary} ${why}${state.x === 2 && state.y === 2 ? ' Baliza alcanzada.' : ''}`;
  }
  function act(control, item, host) {
    const info = descriptor(item), operation = control?.dataset?.questOp;
    if (!info || !operation) return;
    const panel = control.closest?.('[data-quest-explorer]') || host?.querySelector?.('[data-quest-explorer]');
    if (!panel || panel.dataset.questExplorer !== item.id) return;
    let state = stateFor(item, info);
    const predictionMatch = /^predict-([0-2])$/.exec(operation);
    if (predictionMatch) {
      state.prediction = Number(predictionMatch[1]);
      const correct = info.mode === 'robot' ? 0 : 1;
      state.notice = state.prediction === correct ? 'Predicción correcta. Leé la explicación para conectar el resultado con su regla.' : 'La predicción necesita un ajuste. La explicación muestra qué regla determina el resultado; podés probar otra respuesta.';
    } else if (info.mode === 'robot') {
      const moveMatch = /^move-([NSEO])$/.exec(operation), energyMatch = /^battery-(2|4|6)$/.exec(operation);
      if (moveMatch) move(state, moveMatch[1]);
      else if (energyMatch) { state = fresh(info, Number(energyMatch[1])); state.notice = `Tablero reiniciado en (0,0), con batería ${state.energy}. La baliza está en (2,2).`; }
      else return;
    } else {
      const bitMatch = /^bit-([0-7])$/.exec(operation), sizeMatch = /^size-(0|3|6|260)$/.exec(operation);
      if (bitMatch) {
        const bit = Number(bitMatch[1]); state.control ^= 1 << bit;
        state.notice = `Alternaste b${bit}, de peso ${1 << bit}. El control ahora es 0x${hex(state.control)} (${state.control}). ${info.language === 'go' ? 'La trama Go-106 mantiene su marca fija 0x47.' : 'En el paquete Rust-106, los bits altos deben representar versión 1.'}`;
      } else if (sizeMatch && (info.language === 'go' || Number(sizeMatch[1]) <= 255)) {
        state.size = Number(sizeMatch[1]); state.corrupt = false; state.badLength = false; state.reversed = false;
        state.notice = `Se creó un paquete sin alteraciones con ${state.size} bytes de payload. Su longitud y comprobación fueron recalculadas; el byte de control seleccionado se conserva.`;
      } else if (operation === 'corrupt' && state.size > 0) {
        state.corrupt = !state.corrupt;
        state.notice = state.corrupt ? 'Se alternó el bit 0 del primer byte recibido. La comprobación enviada se conserva: ahora el receptor puede detectar esa alteración.' : 'El primer byte volvió a su valor original. Compará nuevamente las comprobaciones.';
      } else if (operation === 'bad-length') {
        state.badLength = !state.badLength;
        state.notice = state.badLength ? 'Se alternó el bit de menor peso de la longitud declarada. La cantidad real de payload no cambió; el receptor compara ambas.' : 'Se restauró el bit de longitud. Si invertiste los bytes, ese otro cambio sigue activo.';
      } else if (operation === 'reverse-endian' && info.language === 'go') {
        state.reversed = !state.reversed;
        state.notice = state.reversed ? 'Se invirtieron los dos bytes de longitud en tránsito. El receptor sigue leyendo big-endian: interpretará el orden recibido, sin adivinar tu intención.' : 'Los bytes de longitud recuperaron su orden big-endian. Las demás alteraciones se conservan.';
      } else if (operation === 'packet-reset') { state = fresh(info); state.notice = 'Paquete restaurado: 3 bytes de payload, sin alteraciones. El byte de control también recuperó su valor inicial.'; }
      else return;
    }
    states.set(item.id, state);
    const view = panel.querySelector('[data-q-view]'), live = panel.querySelector('[data-q-status]');
    if (!view || !live) return;
    const historyWasClosed = panel.querySelector('.qx-history')?.open === false;
    view.innerHTML = body(state, info);
    if (historyWasClosed) { const history = panel.querySelector('.qx-history'); if (history) history.open = false; }
    live.textContent = state.notice;
    const controls = [...panel.querySelectorAll('[data-quest-op]')];
    const replacement = controls.find(next => next.dataset.questOp === operation && !next.disabled) || controls.find(next => !next.disabled);
    replacement?.focus({preventScroll: true});
  }
  function reset() { states.clear(); }
  window.TallerQuestExplorers = {render, act, reset};
})();
