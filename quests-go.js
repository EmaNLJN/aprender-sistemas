/* Campaña original: problemas propios, APIs documentadas por Go. */
(() => {
  'use strict';
  const quests = [];
  const worlds = [
    ['go-rover-quests', 'La estación del rover', 'beginner'],
    ['go-packet-quests', 'La antena de telemetría', 'medium'],
    ['go-graph-quests', 'El mapa de suministros', 'advanced'],
    ['go-resilience-quests', 'El último enlace', 'expert']
  ];
  const t = (label, expression, why, failure) => ({label, expression, why, failure});
  const quiz = (question, options, answer, explanation) => ({question, options, answer, explanation});
  function add(n, exercise) {
    const world = Math.floor((n - 101) / 3), position = (n - 101) % 3;
    quests.push({id: 'go-' + n, language: 'go', topicId: worlds[world][0], topic: worlds[world][1],
      stage: 21 + world, level: worlds[world][2], challengeType: ['repair', 'kata', 'boss'][position],
      kind: position === 0 ? 'reparar' : 'completar', minutes: position === 2 ? 25 : 12,
      imports: [], visual: 'flow', ...exercise,
      tests: exercise.tests.map((test, i) => ({id: 't' + (i + 1), ...test}))});
  }

  add(101, {
    title: 'La brújula al revés',
    intro: 'El rover usa cuatro números: norte=0, este=1, sur=2 y oeste=3. Su giro a la derecha quedó programado hacia el lado contrario. Repará esa única transición antes de darle motores.',
    why: 'El resto de una división permite volver al inicio de un ciclo. Con orientaciones no negativas, (dirección + 1) % 4 recorre exactamente los cuatro estados.',
    objective: 'Implementá un giro horario. La entrada siempre pertenece a 0…3.',
    instructions: ['Conservá TurnRight(facing int) int.', 'Después del oeste debe venir el norte; no existe una orientación 4.'],
    starter: `func TurnRight(facing int) int {
    return (facing + 3) % 4
}`,
    solution: `func TurnRight(facing int) int {
    return (facing + 1) % 4
}`,
    tests: [
      t('Norte → este', 'TurnRight(0) == 1', 'Fija qué sentido significa derecha.', 'Sumar tres gira a la izquierda en esta codificación.'),
      t('El borde del ciclo', 'TurnRight(3) == 0 && TurnRight(2) == 3', 'Comprueba el retorno al primer estado y una transición interior.', 'La orientación tiene cuatro valores, no cinco.'),
      t('Una vuelta completa', 'func() bool { for start := 0; start < 4; start++ { d := start; for i := 0; i < 4; i++ { d = TurnRight(d) }; if d != start { return false } }; return true }()', 'Cuatro transiciones deben conservar la orientación inicial.', 'Aplicá la misma regla a cualquier punto de partida.')
    ],
    hints: ['Dibujá 0 → 1 → 2 → 3 → 0.', 'Primero avanzá una posición.', 'Usá % 4 para volver a cero después del tres.'],
    review: {success: 'Reparaste una transición local y verificaste una propiedad global: cuatro giros cierran el ciclo. Los tests también distinguen el sentido, porque una vuelta sola no lo distinguiría.', pitfall: 'En Go, % es resto; con números negativos no garantiza un resultado positivo. El contrato acá excluye esas entradas.'},
    transfer: 'Agregá TurnLeft y comprobá que izquierda(derecha(d)) conserva d.',
    prediction: quiz('Desde oeste (3), dos giros a la derecha terminan en…', ['Sur (2)', 'Este (1)', 'Norte (0)'], 1, '3 → 0 → 1: el ciclo pasa por norte y termina en este.'),
    sources: [{title: 'Operadores aritméticos de Go', url: 'https://go.dev/ref/spec#Arithmetic_operators'}]
  });

  add(102, {
    title: 'Carga express para el rover', visual: 'collections',
    intro: 'La base presenta cajas en orden de prioridad. Aceptá cada caja si entra en la capacidad restante y seguí revisando las siguientes aunque una no entre. Esta es una política de carga en orden, no una búsqueda de la combinación óptima.',
    why: 'Separar índices seleccionados y capacidad restante hace explícito el estado del recorrido. append construye el resultado sin alterar los pesos originales.',
    objective: 'PackCargo devuelve los índices aceptados en orden y la capacidad sobrante. Pesos y capacidad son no negativos.',
    instructions: ['Una caja que entra exactamente también se acepta; una caja de peso cero entra aunque no quede espacio.', 'No ordenes ni modifiques weights. Devolvé los índices originales.', 'Si una caja no entra, salteala y continuá.'],
    starter: `func PackCargo(weights []int, capacity int) ([]int, int) {
    var picked []int
    for i, weight := range weights {
        if weight > capacity { break } // ¿hay otras cajas más pequeñas después?
        picked = append(picked, i)
        capacity -= weight
    }
    return picked, capacity
}`,
    solution: `func PackCargo(weights []int, capacity int) ([]int, int) {
    var picked []int
    for i, weight := range weights {
        if weight > capacity { continue }
        picked = append(picked, i)
        capacity -= weight
    }
    return picked, capacity
}`,
    tests: [
      t('La caja gigante no bloquea la fila', 'func() bool { w := []int{4, 9, 2, 1}; ids, left := PackCargo(w, 7); return fmt.Sprint(ids) == "[0 2 3]" && left == 0 && fmt.Sprint(w) == "[4 9 2 1]" }()', 'Detecta el corte prematuro y la modificación del inventario.', 'continue salta una caja; break abandona toda la fila.'),
      t('Cero espacio y carga gratuita', 'func() bool { ids, left := PackCargo([]int{1, 0, 0}, 0); return fmt.Sprint(ids) == "[1 2]" && left == 0 }()', 'Distingue no tener espacio de no poder aceptar ningún elemento.', 'La condición de rechazo es peso > capacidad, no >=.'),
      t('Inventario vacío y política en orden', 'func() bool { empty, left := PackCargo(nil, 5); ids, remaining := PackCargo([]int{3, 2, 2}, 4); return len(empty) == 0 && left == 5 && fmt.Sprint(ids) == "[0]" && remaining == 1 }()', 'Comprueba el caso vacío y que no se reemplaza la política por una optimización distinta.', 'Respetá la primera caja aunque otras dos llenarían mejor el espacio.')
    ],
    hints: ['El estado mínimo es la capacidad restante y un slice de índices.', 'Una decisión se toma por cada caja.', 'Rechazar una caja debe permitir que el for continúe.'],
    review: {success: 'Tu algoritmo respeta una regla de negocio verificable: aceptar en orden lo que entre. Recorrer una vez cuesta O(n); no resolviste el problema general de la mochila.', pitfall: 'Una solución que maximiza peso o cantidad puede ser incorrecta cuando el contrato exige prioridad por orden.'},
    transfer: 'Cambiá el contrato para devolver también los índices rechazados sin hacer un segundo recorrido.',
    prediction: quiz('Pesos [5, 2], capacidad 2: ¿qué índice se acepta?', ['Ninguno', '0', '1'], 2, 'La primera caja se saltea y la segunda entra exactamente.'),
    sources: [{title: 'For y control de bucles', url: 'https://go.dev/ref/spec#For_statements'}, {title: 'Slices y append', url: 'https://go.dev/blog/slices-intro'}]
  });

  add(103, {
    title: 'Jefe: rescate en el cráter',
    intro: 'Tu rover parte en (0,0), mira al norte y recibe un programa de F (avanzar) y R (girar a la derecha). Ahora la brújula, el contador de energía y el intérprete deben trabajar juntos.',
    why: 'Un struct agrupa un estado coherente. Cada comando produce una transición; devolver también bool distingue completar el programa de detenerse con un estado parcial válido.',
    objective: 'RunRover devuelve el estado final y true si completó todo. Norte aumenta Y; este aumenta X. Facing usa 0=N,1=E,2=S,3=O.',
    instructions: ['F consume una unidad; R no consume energía. La energía inicial siempre es no negativa.', 'Ante un comando desconocido o un F sin energía, detenete y devolvé el estado ya alcanzado con false.', 'No avances ni gastes energía en el comando que falla. El programa vacío termina correctamente.'],
    starter: `type Rover struct { X, Y, Facing, Energy int }
func RunRover(program string, energy int) (Rover, bool) {
    rover := Rover{Energy: energy}
    for _, command := range program {
        switch command {
        case 'R': rover.Facing = (rover.Facing + 1) % 4
        case 'F':
            if rover.Energy == 0 { return rover, false }
            rover.Y++ // El motor todavía ignora la brújula.
            rover.Energy--
        default: return rover, false
        }
    }
    return rover, true
}`,
    solution: `type Rover struct { X, Y, Facing, Energy int }
func RunRover(program string, energy int) (Rover, bool) {
    rover := Rover{Energy: energy}
    directions := [4][2]int{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}
    for _, command := range program {
        switch command {
        case 'R': rover.Facing = (rover.Facing + 1) % 4
        case 'F':
            if rover.Energy == 0 { return rover, false }
            delta := directions[rover.Facing]
            rover.X += delta[0]
            rover.Y += delta[1]
            rover.Energy--
        default: return rover, false
        }
    }
    return rover, true
}`,
    tests: [
      t('Llegar y volver hacia el oeste', 'func() bool { a, ok := RunRover("RFFRF", 3); b, back := RunRover("RRRF", 1); return ok && a == (Rover{X:2, Y:-1, Facing:2}) && back && b == (Rover{X:-1, Facing:3}) }()', 'Comprueba desplazamientos según distintas orientaciones.', 'El avance necesita un delta X/Y elegido por Facing.'),
      t('Combustible agotado sin paso fantasma', 'func() bool { r, ok := RunRover("FFFR", 2); return !ok && r == (Rover{Y:2, Energy:0}) }()', 'El comando fallido y los siguientes no deben modificar el estado.', 'Verificá energía antes de mover; retorná inmediatamente cuando falla.'),
      t('Giros gratis, vacío y comando inválido', 'func() bool { a, ok := RunRover("RRRR", 0); b, empty := RunRover("", 2); c, invalid := RunRover("F?F", 3); return ok && a == (Rover{}) && empty && b == (Rover{Energy:2}) && !invalid && c == (Rover{Y:1, Energy:2}) }()', 'Distingue transiciones gratuitas, ausencia de comandos y fracaso parcial.', 'No gastes energía al girar y no descartes el progreso anterior a un error.')
    ],
    hints: ['Escribí los cuatro vectores de movimiento en el orden de Facing.', 'Un array [4][2]int permite elegir el delta con un índice.', 'Validá el paso, aplicá el delta y recién después descontá energía.'],
    review: {success: 'Construiste una máquina de estados pequeña: entrada + estado actual determinan el siguiente estado. El indicador de éxito y el estado parcial forman parte del contrato, no son detalles de implementación.', pitfall: 'Reiniciar a cero ante un error perdería la posición real. Tampoco debemos ejecutar comandos posteriores al fallo.'},
    transfer: 'Sumá obstáculos: un F bloqueado no gasta energía y devuelve false. Escribí primero un caso que distinga esa regla.',
    prediction: quiz('Programa RF con energía 1: ¿dónde termina?', ['(1,0), este, energía 0', '(0,1), norte, energía 0', '(0,0), este, energía 0'], 0, 'R gira al este sin gastar; F mueve una unidad en X y consume la batería.'),
    sources: [{title: 'Structs', url: 'https://go.dev/tour/moretypes/2'}, {title: 'Switch', url: 'https://go.dev/ref/spec#Switch_statements'}]
  });

  add(104, {
    title: 'Un byte, dos mandos',
    intro: 'La antena reserva un byte: los tres bits altos guardan el tipo de mensaje y los cinco bajos su prioridad. Un desplazamiento equivocado hace que ambos campos se pisen.',
    why: 'Un byte tiene ocho bits. Al validar cada campo antes de combinarlo, el OR une regiones disjuntas sin perder información. Desplazar cinco posiciones deja libres exactamente los cinco bits bajos.',
    objective: 'PackTag(kind, priority uint8) devuelve kind en los bits 7…5 y priority en 4…0; rechaza kind > 7 o priority > 31.',
    instructions: ['Ante una entrada fuera de rango, devolvé 0 y un error no nil.', 'No recortes silenciosamente valores con una máscara: una entrada inválida debe fallar.', 'Conservá los dos campos al combinarlos.'],
    starter: `func PackTag(kind, priority uint8) (byte, error) {
    if kind > 7 || priority > 31 { return 0, fmt.Errorf("campo fuera de rango") }
    return kind << 3 | priority, nil
}`,
    solution: `func PackTag(kind, priority uint8) (byte, error) {
    if kind > 7 || priority > 31 { return 0, fmt.Errorf("campo fuera de rango") }
    return kind << 5 | priority, nil
}`,
    tests: [
      t('Campos que no se pisan', 'func() bool { tag, err := PackTag(5, 3); return err == nil && tag == 0b10100011 && tag >> 5 == 5 && tag & 31 == 3 }()', 'Comprueba posición y recuperación independiente de cada campo.', 'Los cinco bits bajos pertenecen completos a priority.'),
      t('Extremos válidos', 'func() bool { zero, a := PackTag(0, 0); full, b := PackTag(7, 31); return a == nil && b == nil && zero == 0 && full == 255 }()', 'Verifica límites inclusivos del formato.', 'Tres bits representan 0…7 y cinco representan 0…31.'),
      t('No truncar entradas inválidas', 'func() bool { a, e1 := PackTag(8, 0); b, e2 := PackTag(0, 32); c, e3 := PackTag(255, 255); return e1 != nil && e2 != nil && e3 != nil && a == 0 && b == 0 && c == 0 }()', 'Impide que overflow o máscaras escondan una entrada imposible.', 'Validá antes del desplazamiento: uint8 no retiene los bits que salen de su rango.')
    ],
    hints: ['Dibujá TTT PPPPP.', 'El campo alto necesita saltar los cinco bits del campo bajo.', 'La combinación es kind << 5 | priority, después de validar.'],
    review: {success: 'Diseñaste una representación reversible dentro de sus rangos. El compilador conoce el tipo byte, pero el significado de sus bits y sus límites pertenecen al protocolo.', pitfall: 'Enmascarar kind con 7 aceptaría un valor inválido como si fuera otro mensaje. Eso cambia el contrato.'},
    transfer: 'Escribí UnpackTag y probá el round trip de los 256 bytes posibles.',
    prediction: quiz('¿Qué byte representa tipo 1 y prioridad 0?', ['00000001', '00001000', '00100000'], 2, 'El tipo ocupa los tres bits altos: 1 se desplaza cinco posiciones.'),
    sources: [{title: 'Operadores enteros y desplazamientos', url: 'https://go.dev/ref/spec#Arithmetic_operators'}]
  });

  add(105, {
    title: 'Detective de bits alterados', imports: ['hash/crc32'],
    intro: 'Un rayo cósmico puede cambiar un bit de la telemetría. El emisor adjunta un CRC-32 IEEE; el receptor lo recalcula y compara. Go ya implementa el algoritmo: tu tarea es aplicar el contrato correcto.',
    why: 'Reutilizar hash/crc32 evita reimplementar tablas y polinomios. Un checksum detecta muchos errores accidentales, pero no demuestra identidad ni impide alteraciones deliberadas.',
    objective: 'CheckPayload devuelve true exactamente cuando crc32.ChecksumIEEE(payload) coincide con want, sin modificar payload.',
    instructions: ['Usá hash/crc32; no conviertas los bytes a texto ni implementes el polinomio a mano.', 'El payload puede contener ceros, bytes no UTF-8 o estar vacío.', 'Compará el resultado con want, no con un valor fijo.'],
    starter: `func CheckPayload(payload []byte, want uint32) bool {
    return crc32.ChecksumIEEE(nil) == want
}`,
    solution: `func CheckPayload(payload []byte, want uint32) bool {
    return crc32.ChecksumIEEE(payload) == want
}`,
    tests: [
      t('Vector conocido de CRC-32 IEEE', 'CheckPayload([]byte("123456789"), 0xcbf43926) && !CheckPayload([]byte("123456789"), 0)', 'Usa un resultado conocido e independiente de tu implementación.', 'La suma se calcula sobre el payload recibido.'),
      t('Mensaje vacío también tiene contrato', 'CheckPayload(nil, 0) && CheckPayload([]byte{}, 0) && !CheckPayload(nil, 1)', 'Distingue un mensaje vacío válido de cualquier checksum aceptado por defecto.', 'El CRC IEEE del mensaje vacío es cero, pero want puede ser incorrecto.'),
      t('Binario intacto y un bit cambiado', 'func() bool { p := []byte{0, 255, 128, 7}; want := crc32.ChecksumIEEE(p); before := fmt.Sprint(p); ok := CheckPayload(p, want); if fmt.Sprint(p) != before { return false }; p[2] ^= 1; return ok && !CheckPayload(p, want) }()', 'Comprueba bytes arbitrarios, ausencia de mutación y una corrupción concreta.', 'Procesá los bytes tal cual están; no hagas normalización de texto.')
    ],
    hints: ['La biblioteca devuelve uint32, el mismo tipo que want.', 'ChecksumIEEE acepta un slice de bytes directamente.', 'Una comparación == produce el bool que necesita la firma.'],
    review: {success: 'Usaste una implementación estándar y dejaste la política de aceptación visible en una línea. La prueba del bit alterado demuestra ese caso concreto; CRC no garantiza detectar toda posible colisión.', pitfall: 'CRC no es criptografía: alguien que modifica el payload también puede recalcular su checksum.'},
    transfer: 'Con crc32.NewIEEE, calculá el mismo resultado escribiendo el payload en varios fragmentos.',
    prediction: quiz('Un atacante cambia el mensaje y recalcula su CRC. ¿Nuestra comprobación lo detecta necesariamente?', ['No; el CRC no autentica el contenido', 'Sí; todo checksum es una firma', 'Sí; uint32 no admite colisiones'], 0, 'Para autenticidad necesitás un mecanismo criptográfico y una política de claves, no solo CRC.'),
    sources: [{title: 'hash/crc32: ChecksumIEEE', url: 'https://pkg.go.dev/hash/crc32#ChecksumIEEE'}]
  });

  const frameBuilder = `// Ayudante provisto: las pruebas solo lo llaman con payloads de hasta 65535 bytes.
func BuildFrame(payload []byte) []byte {
    frame := make([]byte, 7 + len(payload))
    frame[0] = 0x47
    binary.BigEndian.PutUint16(frame[1:3], uint16(len(payload)))
    copy(frame[3:], payload)
    binary.BigEndian.PutUint32(frame[3+len(payload):], crc32.ChecksumIEEE(payload))
    return frame
}
`;
  add(106, {
    title: 'Jefe: abrir el paquete del satélite', imports: ['encoding/binary', 'hash/crc32'], visual: 'memory',
    intro: 'La trama tiene una marca 0x47, dos bytes de longitud big-endian, el payload y cuatro bytes de CRC IEEE big-endian. La antena puede recibir basura: leer posiciones sin validar puede provocar un panic.',
    why: 'Los slices comparten memoria. Después de validar la estructura y el checksum, devolver una copia permite que el llamador use el payload sin modificar el paquete original. encoding/binary resuelve el orden de bytes explícitamente.',
    objective: 'DecodeFrame valida una trama completa y devuelve una copia del payload. Todo paquete inválido devuelve nil y un error no nil.',
    instructions: ['Conservá BuildFrame como ayudante provisto. Formato exacto: [marca:1][longitud:2][payload:N][CRC:4]. CRC cubre solamente el payload.', 'Rechazá marca incorrecta, menos de 7 bytes, longitud inconsistente, bytes sobrantes y CRC incorrecto.', 'El mensaje vacío es válido. Validá antes de indexar y no devuelvas un slice que comparta el buffer de entrada.'],
    starter: frameBuilder + `func DecodeFrame(frame []byte) ([]byte, error) {
    if len(frame) < 7 { return nil, fmt.Errorf("trama corta") }
    return frame[3:len(frame)-4], nil
}`,
    solution: frameBuilder + `func DecodeFrame(frame []byte) ([]byte, error) {
    if len(frame) < 7 { return nil, fmt.Errorf("trama corta") }
    if frame[0] != 0x47 { return nil, fmt.Errorf("marca inválida") }
    size := int(binary.BigEndian.Uint16(frame[1:3]))
    if len(frame) != size + 7 { return nil, fmt.Errorf("longitud inconsistente") }
    payload := frame[3:3+size]
    want := binary.BigEndian.Uint32(frame[3+size:])
    if crc32.ChecksumIEEE(payload) != want { return nil, fmt.Errorf("CRC incorrecto") }
    copyOfPayload := make([]byte, size)
    copy(copyOfPayload, payload)
    return copyOfPayload, nil
}`,
    tests: [
      t('Binario independiente y longitud multibyte', 'func() bool { frame := BuildFrame([]byte{0, 255, 42}); out, err := DecodeFrame(frame); if err != nil || fmt.Sprint(out) != "[0 255 42]" { return false }; out[0] = 9; if frame[3] != 0 { return false }; large := make([]byte, 260); large[259] = 17; decoded, e := DecodeFrame(BuildFrame(large)); return e == nil && len(decoded) == 260 && decoded[259] == 17 }()', 'Comprueba copia y big-endian con longitud mayor que 255.', 'No devuelvas frame[3:…] directamente; la longitud ocupa dos bytes.'),
      t('Estructura inválida sin panic', 'func() bool { for n := 0; n < 7; n++ { p,e := DecodeFrame(make([]byte,n)); if e == nil || p != nil { return false } }; badMagic := BuildFrame(nil); badMagic[0] = 0; badLength := BuildFrame([]byte{1}); badLength[2] = 2; extra := append(BuildFrame(nil), 0); for _, bad := range [][]byte{badMagic,badLength,extra} { p,e := DecodeFrame(bad); if e == nil || p != nil { return false } }; return true }()', 'Rechaza formas estructuralmente imposibles antes de extraer campos.', 'La longitud total debe ser exactamente N + 7, sin tolerar sobrantes.'),
      t('Vacío válido y payload corrompido', 'func() bool { out, err := DecodeFrame(BuildFrame(nil)); bad := BuildFrame([]byte("SOS")); bad[3] ^= 1; rejected, e := DecodeFrame(bad); return err == nil && len(out) == 0 && e != nil && rejected == nil }()', 'Distingue ausencia válida de datos de contenido cuyo checksum ya no coincide.', 'CRC cubre payload; no incluyas cabecera ni el propio checksum.')
    ],
    hints: ['Primero longitud mínima y marca; después leé el uint16.', 'Usá len(frame) == int(size)+7 antes de crear las ventanas.', 'Leé CRC con Uint32, compará y copiá el payload a un slice nuevo.'],
    review: {success: 'Separaste validación estructural, comprobación de contenido y propiedad de memoria. Los tests incluyen corrupción, límites cortos y una longitud de dos bytes; no sustituyen fuzzing de todos los paquetes posibles.', pitfall: 'Un CRC válido no autoriza a ignorar la longitud. Y copiar el slice no es lo mismo que copiar sus bytes.'},
    transfer: 'Fuera del laboratorio, añadí un fuzz test: DecodeFrame nunca debe provocar panic con bytes arbitrarios.',
    prediction: quiz('Si retornás frame[3:3+N], cambiar payload[0] después…', ['Nunca afecta frame', 'También cambia frame[3]', 'Solo cambia la longitud de frame'], 1, 'El slice apunta al mismo array; una copia explícita de bytes rompe ese alias.'),
    sources: [{title: 'encoding/binary: ByteOrder', url: 'https://pkg.go.dev/encoding/binary#ByteOrder'}, {title: 'hash/crc32', url: 'https://pkg.go.dev/hash/crc32'}]
  });

  add(107, {
    title: 'El explorador que se vuelve demasiado pronto', visual: 'collections',
    intro: 'Cada base conoce sus rutas de salida. Tu explorador recuerda qué bases visitó y mantiene una cola, pero declara fracaso antes de explorarla completa. Repará su condición de finalización.',
    why: 'Un map de visitados evita volver a encolar el mismo nodo, incluso si hay ciclos. Agotar la cola prueba que no quedan destinos alcanzables por revisar; examinar solo la base inicial no alcanza.',
    objective: 'Reachable indica si existe un camino dirigido de start a target. Un nodo siempre llega a sí mismo con cero pasos, aunque no figure como clave.',
    instructions: ['Las listas de vecinos representan salidas dirigidas y pueden tener ciclos o repetidos.', 'Conservá la entrada: no borres rutas del map para marcar visitados.', 'Solo devolvé false cuando no queden nodos pendientes.'],
    starter: `func Reachable(graph map[string][]string, start, target string) bool {
    queue := []string{start}
    seen := map[string]bool{start:true}
    for head := 0; head < len(queue); head++ {
        node := queue[head]
        if node == target { return true }
        for _, next := range graph[node] {
            if !seen[next] { seen[next] = true; queue = append(queue, next) }
        }
        return false // ¿terminó la búsqueda o solo una iteración?
    }
    return false
}`,
    solution: `func Reachable(graph map[string][]string, start, target string) bool {
    queue := []string{start}
    seen := map[string]bool{start:true}
    for head := 0; head < len(queue); head++ {
        node := queue[head]
        if node == target { return true }
        for _, next := range graph[node] {
            if !seen[next] { seen[next] = true; queue = append(queue, next) }
        }
    }
    return false
}`,
    tests: [
      t('El destino está dos pasos más allá', 'func() bool { g := map[string][]string{"base":{"puente"}, "puente":{"antena"}}; return Reachable(g,"base","antena") && len(g["base"]) == 1 && g["base"][0] == "puente" }()', 'Detecta el retorno prematuro y una mutación básica de la entrada.', 'La cola ya puede tener vecinos aunque acabes de procesar un solo nodo.'),
      t('Ciclos, repetidos y dirección', 'func() bool { g := map[string][]string{"a":{"b","b"},"b":{"a","c"}}; return Reachable(g,"a","c") && !Reachable(g,"c","a") && !Reachable(g,"a","z") }()', 'Exige terminar ante ciclos y respetar el sentido de las rutas.', 'Marcá al encolar; no inventes rutas de vuelta.'),
      t('Viaje de cero pasos', 'Reachable(nil,"isla","isla") && !Reachable(nil,"isla","otra")', 'Define la identidad y la ausencia completa de rutas.', 'La primera comparación ocurre antes de consultar vecinos.')
    ],
    hints: ['Seguí head y len(queue) después de la primera vuelta.', 'Un return sale de toda la función, no solo de la iteración.', 'El fracaso final pertenece después del for.'],
    review: {success: 'La búsqueda recorre como máximo una vez cada nodo alcanzable y examina sus salidas. seen corta los ciclos; el cursor head evita quitar continuamente el primer elemento del slice.', pitfall: 'Una arista a→b no implica b→a. Tampoco necesitás que un destino sin salidas exista como clave.'},
    transfer: 'Devolvé también cuántos nodos se examinaron para observar cómo crece el trabajo con la red.',
    prediction: quiz('En a→b y b→a, ¿qué evita explorar para siempre?', ['Ordenar los nombres', 'Marcar cada nodo al encolarlo', 'Usar un map para el grafo, sin más'], 1, 'El conjunto seen impide agregar otra vez un nodo ya descubierto.'),
    sources: [{title: 'Maps en Go', url: 'https://go.dev/blog/maps'}, {title: 'For y return', url: 'https://go.dev/ref/spec#Return_statements'}]
  });

  add(108, {
    title: 'La ruta con menos saltos', visual: 'collections',
    intro: 'Saber que una base es alcanzable no alcanza: el piloto necesita el recorrido. Cada ruta cuesta un salto. Una búsqueda por anchura descubre primero los destinos que están más cerca en cantidad de aristas.',
    why: 'Guardar el predecesor al descubrir un nodo permite reconstruir su camino al final. La cola conserva el orden por capas; una pila exploraría en profundidad y no garantizaría el mínimo de saltos.',
    objective: 'ShortestRoute devuelve un camino mínimo incluyendo start y target, o nil,false si no existe. Ante empate, usá el primero descubierto respetando el orden de los slices de vecinos.',
    instructions: ['El grafo es dirigido y sin pesos. start == target devuelve []string{start},true.', 'Marcá visitados al encolar y guardá un solo predecesor por nodo.', 'No modifiques graph. Reconstruí desde target hacia start y luego invertí el resultado.'],
    starter: `func ShortestRoute(graph map[string][]string, start, target string) ([]string, bool) {
    if start == target { return []string{start}, true }
    for _, next := range graph[start] {
        if next == target { return []string{start, target}, true }
    }
    // Falta explorar rutas de más de un salto.
    return nil, false
}`,
    solution: `func ShortestRoute(graph map[string][]string, start, target string) ([]string, bool) {
    queue := []string{start}
    seen := map[string]bool{start:true}
    parent := make(map[string]string)
    for head := 0; head < len(queue); head++ {
        node := queue[head]
        if node == target {
            path := []string{target}
            for node != start { node = parent[node]; path = append(path, node) }
            for i,j := 0,len(path)-1; i<j; i,j = i+1,j-1 { path[i],path[j] = path[j],path[i] }
            return path, true
        }
        for _, next := range graph[node] {
            if !seen[next] {
                seen[next] = true
                parent[next] = node
                queue = append(queue, next)
            }
        }
    }
    return nil, false
}`,
    tests: [
      t('La rama descubierta primero puede ser más larga', 'func() bool { g := map[string][]string{"s":{"a","b"},"a":{"c"},"c":{"t"},"b":{"t"}}; path,ok := ShortestRoute(g,"s","t"); return ok && fmt.Sprint(path) == "[s b t]" && fmt.Sprint(g["s"]) == "[a b]" }()', 'Distingue BFS de una búsqueda que devuelve la primera ruta profunda encontrada.', 'Procesá la cola en orden de inserción.'),
      t('Empate reproducible y ciclo', 'func() bool { g := map[string][]string{"s":{"b","a"},"b":{"s","t"},"a":{"t"}}; path,ok := ShortestRoute(g,"s","t"); return ok && fmt.Sprint(path) == "[s b t]" }()', 'Comprueba el criterio de empate y que el ciclo no sustituye predecesores.', 'El primer descubrimiento fija parent; no lo sobrescribas luego.'),
      t('Identidad y destino imposible', 'func() bool { a,ok := ShortestRoute(nil,"x","x"); b,missing := ShortestRoute(map[string][]string{"x":{"y"}},"y","x"); return ok && fmt.Sprint(a) == "[x]" && !missing && b == nil }()', 'Define casos sin movimiento y sin camino dirigido.', 'No inventes un camino [start,target] solo porque ambos nombres existen.')
    ],
    hints: ['Reutilizá la idea de queue y seen del explorador.', 'Al encolar next, guardá parent[next] = node.', 'Desde target seguí parent hasta start; la secuencia queda inicialmente al revés.'],
    review: {success: 'Recuperaste una ruta mínima en número de aristas sin guardar una copia del camino por cada candidato. El orden de vecinos hace que los empates sean reproducibles.', pitfall: 'BFS no minimiza distancia, combustible o tiempo cuando las aristas tienen pesos distintos.'},
    transfer: 'Permití varias bases de salida: inicializá la cola con todas y buscá la ruta desde la más cercana.',
    prediction: quiz('¿Cuándo conviene fijar parent[next] para preservar el primer camino BFS?', ['Cada vez que otro nodo menciona next', 'Cuando terminan todos los recorridos', 'La primera vez que next se encola'], 2, 'Ese descubrimiento corresponde a una capa mínima; sobrescribirlo puede destruir esa ruta.'),
    sources: [{title: 'Maps y valores ausentes', url: 'https://go.dev/blog/maps'}, {title: 'Slices y append', url: 'https://go.dev/blog/slices-intro'}]
  });

  const taskHeap = `// Adaptador provisto para container/heap: menor nombre primero.
type TaskHeap []string
func (h TaskHeap) Len() int { return len(h) }
func (h TaskHeap) Less(i,j int) bool { return h[i] < h[j] }
func (h TaskHeap) Swap(i,j int) { h[i],h[j] = h[j],h[i] }
func (h *TaskHeap) Push(value any) { *h = append(*h, value.(string)) }
func (h *TaskHeap) Pop() any {
    last := len(*h)-1
    value := (*h)[last]
    (*h)[last] = ""
    *h = (*h)[:last]
    return value
}
`;
  add(109, {
    title: 'Jefe: la secuencia de lanzamiento', imports: ['container/heap'], visual: 'collections',
    intro: 'No podés ensamblar antes de fabricar piezas, ni despegar antes de comprobar motores. Las tareas forman un grafo de dependencias. Cuando varias están listas, la base elige el nombre menor para producir siempre el mismo plan.',
    why: 'El grado de entrada cuenta dependencias pendientes. Completar una tarea libera a sus dependientes; container/heap mantiene eficientemente el menor nombre disponible. Recorrer un map directamente no ofrece un orden estable.',
    objective: 'Plan recibe tarea→dependencias y devuelve un orden válido eligiendo siempre el menor nombre disponible según < de strings. Devuelve nil,error ante ciclos o dependencias no declaradas.',
    instructions: ['Conservá TaskHeap y usá heap.Init, heap.Push y heap.Pop para elegir tareas listas.', 'Todos los nombres de dependencias deben existir como claves. Las listas pueden repetir una dependencia sin cambiar el resultado.', 'El map vacío produce un plan vacío sin error. No modifiques el map ni sus slices; un fracaso no devuelve un plan parcial.'],
    starter: taskHeap + `func Plan(tasks map[string][]string) ([]string,error) {
    ready := &TaskHeap{}
    heap.Init(ready)
    for task := range tasks { heap.Push(ready, task) }
    var order []string
    for ready.Len() > 0 { order = append(order, heap.Pop(ready).(string)) }
    return order,nil // Todavía ignora las dependencias.
}`,
    solution: taskHeap + `func Plan(tasks map[string][]string) ([]string,error) {
    pending := make(map[string]int)
    dependents := make(map[string][]string)
    for task,deps := range tasks {
        pending[task] = len(deps)
        for _,dep := range deps {
            if _,exists := tasks[dep]; !exists { return nil,fmt.Errorf("dependencia inexistente: %s",dep) }
            dependents[dep] = append(dependents[dep],task)
        }
    }
    ready := &TaskHeap{}
    heap.Init(ready)
    for task,count := range pending { if count == 0 { heap.Push(ready,task) } }
    var order []string
    for ready.Len() > 0 {
        task := heap.Pop(ready).(string)
        order = append(order,task)
        for _,next := range dependents[task] {
            pending[next]--
            if pending[next] == 0 { heap.Push(ready,next) }
        }
    }
    if len(order) != len(tasks) { return nil,fmt.Errorf("ciclo de dependencias") }
    return order,nil
}`,
    tests: [
      t('Respetar dependencias y nuevas prioridades', 'func() bool { tasks := map[string][]string{"assemble":{"fetch","test"},"fetch":{},"test":{"fetch"},"docs":{}}; a,e1 := Plan(tasks); b,e2 := Plan(map[string][]string{"a":{"b"},"b":{},"z":{}}); return e1 == nil && fmt.Sprint(a) == "[docs fetch test assemble]" && e2 == nil && fmt.Sprint(b) == "[b a z]" && fmt.Sprint(tasks["assemble"]) == "[fetch test]" }()', 'Una tarea recién liberada puede ganar prioridad sobre otra que ya estaba lista.', 'La selección lexical ocurre en cada paso, no una sola vez al inicio.'),
      t('Ciclo, incluso con tareas independientes', 'func() bool { a,e1 := Plan(map[string][]string{"a":{"b"},"b":{"a"},"free":{}}); b,e2 := Plan(map[string][]string{"self":{"self"}}); return a == nil && e1 != nil && b == nil && e2 != nil }()', 'Evita confundir progreso parcial con completar el grafo.', 'Si no procesaste todas las tareas, no hay un plan completo.'),
      t('Vacío, dependencia ausente y repetida', 'func() bool { a,e1 := Plan(nil); b,e2 := Plan(map[string][]string{"x":{"missing"}}); c,e3 := Plan(map[string][]string{"x":{"base","base"},"base":{}}); return e1 == nil && len(a) == 0 && e2 != nil && b == nil && e3 == nil && fmt.Sprint(c) == "[base x]" }()', 'Comprueba casos de frontera y multiplicidad consistente en los contadores.', 'Si contás dependencias repetidas, también deben aparecer repetidas en la lista inversa; o deduplicá ambas juntas.')
    ],
    hints: ['Construí pending[tarea] y una relación inversa dependencia→dependientes.', 'Solo las tareas con contador cero entran al heap.', 'Al extraer una tarea, descontá sus aristas salientes y encolá los nuevos ceros; al final compará cantidades.'],
    review: {success: 'Creaste un orden topológico reproducible y delegaste el mantenimiento de prioridad en container/heap. El algoritmo puede realizar trabajo antes de descubrir un ciclo, pero su API devuelve error sin publicar un plan parcial.', pitfall: 'Los métodos Push y Pop del adaptador son usados por heap; llamar directamente a ready.Pop no conserva por sí solo la propiedad de prioridad.'},
    transfer: 'Agregá una prioridad numérica y usá el nombre solo para desempatar. Definí antes qué tarea gana.',
    prediction: quiz('Están listas b y z. Ejecutar b libera a. ¿Qué sigue?', ['a', 'z', 'Depende del orden del map'], 0, 'Se vuelve a elegir el menor nombre entre todas las listas: ahora a gana a z.'),
    sources: [{title: 'container/heap y su interfaz', url: 'https://pkg.go.dev/container/heap'}, {title: 'Orden de iteración en maps', url: 'https://go.dev/ref/spec#For_statements'}]
  });

  add(110, {
    title: 'El interruptor que guarda rencor',
    intro: 'La antena se desconecta después de varios fallos consecutivos. Pero el interruptor actual suma fallos separados por éxitos: un éxito debería romper la racha. Repará esta máquina de estados lógica.',
    why: 'Un contador de racha representa información distinta de un total histórico. Los métodos con receptor puntero actualizan el mismo objeto; la transición de abierto a cerrado requiere Reset en este modelo explícito.',
    objective: 'Record abre al alcanzar Limit fallos consecutivos. Un éxito en estado cerrado reinicia Failures. Abierto ignora Record hasta Reset.',
    instructions: ['Limit siempre es positivo y no cambia. No agregues relojes ni goroutines.', 'Al abrirse, Failures queda en Limit. Record no cambia nada mientras Open es true.', 'Reset cierra y pone Failures en cero, conservando Limit. Este modelo no incluye temporizador ni estado half-open.'],
    starter: `type Breaker struct { Limit, Failures int; Open bool }
func (b *Breaker) Record(success bool) {
    if b.Open { return }
    if success { return } // Falta cerrar la racha de fallos.
    b.Failures++
    if b.Failures >= b.Limit { b.Open = true }
}
func (b *Breaker) Reset() { b.Failures = 0; b.Open = false }`,
    solution: `type Breaker struct { Limit, Failures int; Open bool }
func (b *Breaker) Record(success bool) {
    if b.Open { return }
    if success { b.Failures = 0; return }
    b.Failures++
    if b.Failures >= b.Limit { b.Open = true }
}
func (b *Breaker) Reset() { b.Failures = 0; b.Open = false }`,
    tests: [
      t('Un éxito rompe la racha', 'func() bool { b := Breaker{Limit:2}; b.Record(false); b.Record(true); b.Record(false); return !b.Open && b.Failures == 1 }()', 'Distingue fallos consecutivos de fallos acumulados.', 'El éxito debe reiniciar el contador cuando el circuito todavía está cerrado.'),
      t('Abrir exactamente en el umbral', 'func() bool { b := Breaker{Limit:3}; b.Record(false); b.Record(false); if b.Open || b.Failures != 2 { return false }; b.Record(false); single := Breaker{Limit:1}; single.Record(false); return b.Open && b.Failures == 3 && single.Open }()', 'Comprueba ambos lados del umbral y el límite mínimo válido.', 'Abrir con > Limit llega un fallo demasiado tarde.'),
      t('Abierto no se cura solo', 'func() bool { b := Breaker{Limit:2}; b.Record(false); b.Record(false); b.Record(true); b.Record(false); if !b.Open || b.Failures != 2 { return false }; b.Reset(); if b.Open || b.Failures != 0 || b.Limit != 2 { return false }; b.Record(false); return !b.Open && b.Failures == 1 }()', 'Verifica el estado absorbente y la reapertura manual del circuito.', 'Chequeá Open antes de procesar success; solo Reset puede cerrar un circuito abierto.')
    ],
    hints: ['Simulá fallo → éxito → fallo con Limit=2.', 'En estado cerrado, éxito significa que la nueva racha mide cero.', 'La rama success necesita asignar b.Failures = 0 antes de retornar.'],
    review: {success: 'Cada transición ahora responde al estado actual y al evento. Este ejercicio modela únicamente un circuit breaker manual; una biblioteca de producción puede añadir reloj, prueba half-open y sincronización.', pitfall: 'Este struct no es seguro para acceso concurrente sin coordinación. El puntero habilita mutación, no exclusión mutua.'},
    transfer: 'Añadí un estado half-open con un único intento de prueba y describí sus transiciones antes de programarlo.',
    prediction: quiz('Limit=2, eventos fallo/éxito/fallo. ¿Estado correcto?', ['Abierto, Failures=2', 'Cerrado, Failures=0', 'Cerrado, Failures=1'], 2, 'El éxito borra la primera racha; el último fallo inicia una nueva.'),
    sources: [{title: 'Receptores puntero', url: 'https://go.dev/tour/methods/4'}, {title: 'Memoria y sincronización', url: 'https://go.dev/ref/mem'}]
  });

  const permanentError = `var ErrPermanent = errors.New("fallo permanente")
`;
  add(111, {
    title: 'Tres oportunidades, ninguna de más', imports: ['errors'],
    intro: 'Un envío puede fallar transitoriamente o indicar un problema que repetir no resolverá. La política de reintentos recibe una función inyectada: así probamos decisiones sin red, sleeps ni azar.',
    why: 'errors.Is reconoce un error centinela aunque esté envuelto. El contador de intentos forma parte del resultado y permite detectar trabajo extra; el límite debe acotar llamadas, no solo vueltas nominales.',
    objective: 'Retry llama attempt con números 1…limit hasta éxito, error permanente o agotamiento. Devuelve valor, llamadas realizadas y error.',
    instructions: ['Si limit <= 0, devolvé "",0,error sin llamar attempt. En éxito, devolvé su valor y nil inmediatamente.', 'Si errors.Is(err, ErrPermanent), detenete. Si se agota el límite, conservá el último error. En todo fracaso, el valor devuelto es "".', 'No esperes ni cambies el error por uno genérico: las pruebas necesitan reconocer su causa.'],
    starter: permanentError + `func Retry(limit int, attempt func(int) (string,error)) (string,int,error) {
    if limit <= 0 { return "",0,fmt.Errorf("límite inválido") }
    value,err := attempt(1)
    if err != nil { return "",1,err }
    return value,1,nil
}`,
    solution: permanentError + `func Retry(limit int, attempt func(int) (string,error)) (string,int,error) {
    if limit <= 0 { return "",0,fmt.Errorf("límite inválido") }
    var last error
    for offset := 0; offset < limit; offset++ {
        n := offset + 1
        value,err := attempt(n)
        if err == nil { return value,n,nil }
        last = err
        if errors.Is(err,ErrPermanent) { return "",n,err }
    }
    return "",limit,last
}`,
    tests: [
      t('Éxito al tercero y parada inmediata', 'func() bool { var calls []int; value,n,err := Retry(5,func(attempt int)(string,error){ calls = append(calls,attempt); if attempt < 3 { return "parcial",fmt.Errorf("temporal") }; return "entregado",nil }); return err == nil && value == "entregado" && n == 3 && fmt.Sprint(calls) == "[1 2 3]" }()', 'Comprueba numeración, reintentos y ausencia de llamadas después del éxito.', 'El callback debe ejecutarse dentro del bucle; nil termina la política.'),
      t('Permanente envuelto', 'func() bool { calls := 0; value,n,err := Retry(4,func(int)(string,error){ calls++; return "no usar",fmt.Errorf("envío rechazado: %w",ErrPermanent) }); return value == "" && n == 1 && calls == 1 && errors.Is(err,ErrPermanent) }()', 'Impide comparar solo con == o repetir un fallo clasificado como definitivo.', 'Usá errors.Is y conservá el error recibido.'),
      t('Presupuesto agotado e inválido', 'func() bool { transient := errors.New("ocupado"); calls := 0; value,n,err := Retry(2,func(int)(string,error){ calls++; return "parcial",transient }); if value != "" || n != 2 || calls != 2 || !errors.Is(err,transient) { return false }; for _,limit := range []int{0,-1} { value,n,err = Retry(limit,func(int)(string,error){ calls++; return "",nil }); if value != "" || n != 0 || err == nil || calls != 2 { return false } }; return true }()', 'Comprueba el máximo de trabajo y validación antes de efectos.', 'Un límite inválido no autoriza ni siquiera un primer intento.')
    ],
    hints: ['El for empieza en 1 y termina en limit inclusive.', 'Separá tres salidas: éxito, permanente y agotamiento.', 'Guardá el último error para devolverlo al terminar el bucle.'],
    review: {success: 'Separaste la política de la operación externa, lo que vuelve sus decisiones observables y deterministas. En un servicio real también definirías backoff, jitter, cancelación e idempotencia según el caso.', pitfall: 'Un error no garantiza que el efecto externo no ocurrió. Reintentar un cobro, por ejemplo, exige una política de idempotencia.'},
    transfer: 'Inyectá también una función de espera y probá la secuencia de demoras sin dormir realmente.',
    prediction: quiz('El intento 1 devuelve un error que envuelve ErrPermanent y limit=5. ¿Cuántas llamadas corresponden?', ['Una', 'Cinco', 'Cero'], 0, 'El primer intento identifica un fallo permanente; repetirlo contradice la política.'),
    sources: [{title: 'errors.Is', url: 'https://pkg.go.dev/errors#Is'}, {title: 'Errores envueltos en Go', url: 'https://go.dev/blog/go1.13-errors'}]
  });

  const courierTypes = permanentError + `type Sender interface {
    Send(ctx context.Context, message string, attempt int) error
}
type SendFunc func(context.Context,string,int) error
func (f SendFunc) Send(ctx context.Context, message string, attempt int) error {
    return f(ctx,message,attempt)
}
`;
  add(112, {
    title: 'Jefe: el último mensaje a la Tierra', imports: ['context', 'errors'], visual: 'concurrency',
    intro: 'La base debe entregar mensajes en orden con un presupuesto por mensaje. El siguiente no empieza hasta confirmar el actual: el consumidor regula el avance. Una interfaz permite probar el enlace con una simulación y después reemplazarlo por una implementación real.',
    why: 'Un context comunica cancelación cooperativa y debe llegar a la operación que puede bloquear. Mantener la entrega secuencial evita adelantar mensajes; errors.Is conserva la clasificación de fallos sin depender del texto.',
    objective: 'Dispatch devuelve cuántos mensajes confirmó con éxito y el error que detuvo la entrega. Reintenta cada mensaje hasta limit veces, numeradas desde 1, conservando el orden.',
    instructions: ['Conservá Sender, SendFunc y ErrPermanent. ctx y sender siempre son no nil. Validá limit > 0 antes de cualquier llamada; un límite inválido devuelve 0,error incluso con lista vacía.', 'Después de validar, comprobá ctx.Err() al entrar y antes de cada intento. Pasá el mismo ctx a Send. Ante éxito contá el mensaje; ante permanente o agotamiento detenete conservando el error.', 'No lances goroutines ni hagas esperas: modelamos entrega síncrona y sin anticipación. Un Send que ignora ctx no puede ser interrumpido por este bucle.'],
    starter: courierTypes + `func Dispatch(ctx context.Context, messages []string, limit int, sender Sender) (int,error) {
    if limit <= 0 { return 0,fmt.Errorf("límite inválido") }
    if err := ctx.Err(); err != nil { return 0,err }
    delivered := 0
    for _,message := range messages {
        if err := ctx.Err(); err != nil { return delivered,err }
        if err := sender.Send(ctx,message,1); err != nil { return delivered,err }
        delivered++
    }
    return delivered,nil
}`,
    solution: courierTypes + `func Dispatch(ctx context.Context, messages []string, limit int, sender Sender) (int,error) {
    if limit <= 0 { return 0,fmt.Errorf("límite inválido") }
    if err := ctx.Err(); err != nil { return 0,err }
    delivered := 0
    for _,message := range messages {
        var last error
        for offset := 0; offset < limit; offset++ {
            attempt := offset + 1
            if err := ctx.Err(); err != nil { return delivered,err }
            last = sender.Send(ctx,message,attempt)
            if last == nil { delivered++; break }
            if errors.Is(last,ErrPermanent) { return delivered,last }
        }
        if last != nil { return delivered,last }
    }
    return delivered,nil
}`,
    tests: [
      t('Presupuesto por mensaje, contexto y orden', 'func() bool { ctx := context.Background(); var log []string; sender := SendFunc(func(got context.Context,message string,attempt int)error{ if got != ctx { return ErrPermanent }; log = append(log,fmt.Sprintf("%s:%d",message,attempt)); needed := 2; if message == "B" { needed = 3 }; if attempt < needed { return fmt.Errorf("temporal") }; return nil }); n,err := Dispatch(ctx,[]string{"A","B"},3,sender); return err == nil && n == 2 && fmt.Sprint(log) == "[A:1 A:2 B:1 B:2 B:3]" }()', 'Comprueba reintentos independientes y que B espera la confirmación de A.', 'Reiniciá el contador por mensaje; no uses un presupuesto global ni adelantes el siguiente.'),
      t('Permanente o agotado bloquea mensajes posteriores', 'func() bool { var log []string; sender := SendFunc(func(_ context.Context,message string,attempt int)error{ log = append(log,message); if message == "B" { return fmt.Errorf("rechazado: %w",ErrPermanent) }; return nil }); n,err := Dispatch(context.Background(),[]string{"A","B","C"},4,sender); if n != 1 || !errors.Is(err,ErrPermanent) || fmt.Sprint(log) != "[A B]" { return false }; calls := 0; busy := errors.New("ocupado"); n,err = Dispatch(context.Background(),[]string{"A","B"},2,SendFunc(func(context.Context,string,int)error{ calls++; return busy })); return n == 0 && calls == 2 && errors.Is(err,busy) }()', 'Detecta trabajo extra después de un error definitivo y preserva el último error transitorio.', 'El contador solo aumenta después de nil; el fallo del mensaje actual detiene toda la lista.'),
      t('Cancelación entre intentos y entregas; entradas vacías', 'func() bool { for _,successful := range []bool{false,true} { ctx,cancel := context.WithCancel(context.Background()); calls := 0; n,err := Dispatch(ctx,[]string{"A","B"},3,SendFunc(func(got context.Context,_ string,_ int)error{ calls++; cancel(); if successful { return nil }; return fmt.Errorf("temporal") })); cancel(); expected := 0; if successful { expected = 1 }; if n != expected || !errors.Is(err,context.Canceled) || calls != 1 { return false } }; ctx,cancel := context.WithCancel(context.Background()); cancel(); calls := 0; sender := SendFunc(func(context.Context,string,int)error{ calls++; return nil }); n,e1 := Dispatch(ctx,[]string{"A"},2,sender); m,e2 := Dispatch(context.Background(),nil,0,sender); z,e3 := Dispatch(context.Background(),nil,1,sender); return n == 0 && errors.Is(e1,context.Canceled) && m == 0 && e2 != nil && z == 0 && e3 == nil && calls == 0 }()', 'Verifica los puntos cooperativos de cancelación y validación sin efectos.', 'Comprobá ctx antes de cada nuevo intento. Un éxito ya confirmado sigue contando aunque se cancele después.')
    ],
    hints: ['Usá un bucle exterior por mensaje y uno interior por intento.', 'Verificá context antes de llamar Send; en nil aumentá delivered y salí solo del bucle interior.', 'Un error permanente retorna enseguida; al agotarse el bucle interno, devolvé el último error si todavía no hubo éxito.'],
    review: {success: 'Combinaste una interfaz pequeña, clasificación de errores y cancelación cooperativa. Los callbacks observan que no hay anticipación entre mensajes. Si el último Send confirma éxito, ya no queda otro intento donde observar una cancelación posterior.', pitfall: 'Confirmar mensajes localmente no demuestra entrega exactamente una vez. Un intento puede causar un efecto y devolver error; una implementación real necesita idempotencia y límites propios de I/O.'},
    transfer: 'En un proyecto local, implementá Sender con HTTP, una clave de idempotencia y un timeout; mantené estos tests de política con SendFunc.',
    prediction: quiz('A se confirma; el contexto se cancela antes de intentar B. ¿Qué debe devolver el despachador?', ['0,nil', '1,context.Canceled', '2,nil'], 1, 'A ya fue confirmado y se conserva en el contador. B no debe empezar después de observar la cancelación.'),
    sources: [{title: 'Context: cancelación cooperativa', url: 'https://pkg.go.dev/context'}, {title: 'errors.Is y errores envueltos', url: 'https://pkg.go.dev/errors#Is'}]
  });

  window.GO_QUESTS = quests;
})();
