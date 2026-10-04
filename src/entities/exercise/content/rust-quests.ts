/* Original campaign missions. The separate campaign file defines their story/order. */
import { defineQuest, type QuestCatalog } from '../model/define-quest';
import { prediction as q, source as src, testCase as t } from '../model/builders';
import type { Exercise, QuestDraft } from '../model/types';

const catalog: QuestCatalog = {
  language: 'rust',
  bossMinutes: 20,
  worlds: [
    { topicId: 'rust-quest-robot', topic: 'Estación del robot', level: 'beginner' },
    { topicId: 'rust-quest-signal', topic: 'Puerto de señales', level: 'medium' },
    { topicId: 'rust-quest-routes', topic: 'Archivo de rutas', level: 'advanced' },
    { topicId: 'rust-quest-machine', topic: 'Núcleo de la máquina', level: 'expert' },
  ],
};

const missions: Exercise[] = [];

function add(number: number, draft: QuestDraft): void {
  missions.push(defineQuest(catalog, number, draft));
}

add(101, {
  title: 'Reparación · La brújula cruzada',
  intro:
    'El robot de la estación confunde algunos ejes. Un estado pequeño permite observar cada transición: Este/Oeste cambian x; Norte/Sur cambian y.',
  why: 'Antes de corregir líneas, escribí qué campos pueden cambiar en cada caso. Conservar los campos no afectados es parte de la corrección.',
  objective:
    'Repará paso. N suma uno a y; S resta uno a y; E suma uno a x; O resta uno a x. Otro comando conserva ambos valores. Coordenadas entre -100 y 100.',
  instructions: [
    'Compará cada brazo del match con la regla de su dirección.',
    'Corregí solamente las coordenadas intercambiadas.',
    'Devolvé la nueva pareja sin modificar otros datos.',
  ],
  starter:
    "fn paso(x: i32, y: i32, direccion: char) -> (i32, i32) {\n    match direccion {\n        'N' => (x + 1, y),\n        'S' => (x, y - 1),\n        'E' => (x, y + 1),\n        'O' => (x - 1, y),\n        _ => (x, y),\n    }\n}",
  solution:
    "fn paso(x: i32, y: i32, direccion: char) -> (i32, i32) {\n    match direccion {\n        'N' => (x, y + 1),\n        'S' => (x, y - 1),\n        'E' => (x + 1, y),\n        'O' => (x - 1, y),\n        _ => (x, y),\n    }\n}",
  tests: [
    t(
      'Norte y Este usan ejes diferentes',
      "paso(2, 7, 'N') == (2, 8) && paso(2, 7, 'E') == (3, 7)",
      'Valores iniciales distintos revelan un intercambio de ejes.',
      'N modifica y; E modifica x.',
    ),
    t(
      'Regreso por Sur y Oeste',
      "paso(-2, 3, 'S') == (-2, 2) && paso(-2, 3, 'O') == (-3, 3)",
      'Las direcciones opuestas restan sin cambiar el otro componente.',
      'Conservá la coordenada perpendicular.',
    ),
    t(
      'Orden desconocida',
      "paso(4, 9, '?') == (4, 9) && paso(4, 9, 'n') == (4, 9)",
      'El contrato distingue mayúsculas y define un no-op.',
      'No conviertas letras ni inventes desplazamientos para otros comandos.',
    ),
  ],
  hints: [
    'Leé la pareja como (horizontal, vertical).',
    'Las ramas N y E están intercambiando responsabilidades.',
    'N debe producir (x, y + 1); E debe producir (x + 1, y).',
  ],
  review: {
    success:
      'Las cuatro direcciones y el no-op cumplen sus transiciones. Usar coordenadas diferentes hizo visible un error que empezar siempre en (0,0) podía ocultar.',
    pitfall:
      'Que cada rama compile no prueba que modifique el campo correcto. Los nombres y las pruebas deben expresar el significado de cada posición.',
  },
  transfer: 'Encapsulá x e y en una struct Posicion para evitar depender del orden de una tupla.',
  prediction: q(
    'Desde (2,7), ¿N debe cambiar qué componente?',
    ['x, para quedar (3,7)', 'y, para quedar (2,8)', 'Ambos'],
    1,
    'El norte aumenta la coordenada vertical y según el contrato de esta estación.',
  ),
  sources: [src('Rust Book · match', 'https://doc.rust-lang.org/book/ch06-02-match.html')],
});

add(102, {
  title: 'Kata · El inventario no puede desbordarse',
  visual: 'memory',
  intro:
    'Antes de salir, el robot carga tres clases de repuestos en un array. La posición elige el compartimiento y cada contador cabe en un byte.',
  why: 'Una operación rechazada debe dejar el estado intacto. Validar el índice y el resultado antes de asignar permite ofrecer esa garantía con pocos pasos.',
  objective:
    'agregar suma cantidad al compartimiento indicado de [u8; 3]. Devolvé true si es válido; false si el índice no existe o la suma desborda. Un rechazo no modifica el inventario.',
  instructions: [
    'Usá get_mut para pedir el compartimiento sin indexar a ciegas.',
    'Calculá checked_add antes de escribir el nuevo contador.',
    'Una cantidad cero sobre un compartimiento válido es una operación exitosa.',
  ],
  starter:
    'fn agregar(inventario: &mut [u8; 3], compartimiento: usize, cantidad: u8) -> bool {\n    todo!("validar y cargar")\n}',
  solution:
    'fn agregar(inventario: &mut [u8; 3], compartimiento: usize, cantidad: u8) -> bool {\n    let Some(actual) = inventario.get_mut(compartimiento) else { return false; };\n    let Some(nuevo) = actual.checked_add(cantidad) else { return false; };\n    *actual = nuevo;\n    true\n}',
  tests: [
    t(
      'Carga localizada',
      '{ let mut i = [2, 3, 4]; agregar(&mut i, 1, 5) && i == [2, 8, 4] }',
      'Solo cambia el compartimiento elegido.',
      'Escribí mediante la referencia que devuelve get_mut.',
    ),
    t(
      'Índice inválido sin efectos',
      '{ let mut i = [2, 3, 4]; !agregar(&mut i, 3, 1) && i == [2, 3, 4] }',
      'El primer índice fuera del array no causa panic ni mutación.',
      'get_mut devuelve None si no existe esa posición.',
    ),
    t(
      'Frontera del byte',
      '{ let mut i = [250, 0, 7]; let rechazo = !agregar(&mut i, 0, 6); rechazo && i == [250, 0, 7] && agregar(&mut i, 0, 5) && agregar(&mut i, 2, 0) && i == [255, 0, 7] }',
      'Llegar a 255 es válido; excederlo no, y cero conserva el valor.',
      'No uses wrapping_add si el contrato exige rechazar.',
    ),
  ],
  hints: [
    'let Some(actual) = inventario.get_mut(...) else { return false; }; separa el índice inválido.',
    'checked_add devuelve None ante overflow.',
    'Asigná *actual = nuevo solo cuando ambas validaciones pasaron.',
  ],
  review: {
    success:
      'Los casos verifican ubicación, rango y ausencia de cambios ante errores. El array deja visible que existen exactamente tres compartimientos.',
    pitfall:
      'mut permite escribir, pero no obliga a hacerlo inmediatamente. Preparar el resultado antes de asignar simplifica los fallos sin efectos.',
  },
  transfer:
    'Agregá retirar con checked_sub y mantené la misma garantía de estado intacto si faltan unidades.',
  prediction: q(
    'Si un contador vale 250 y querés agregar 6, ¿qué exige el contrato?',
    ['Quedar en 0', 'Rechazar y conservar 250', 'Saturar en 255'],
    1,
    'La misión pide una operación comprobada, no wrap ni saturación.',
  ),
  sources: [
    src(
      'std · slice::get_mut',
      'https://doc.rust-lang.org/std/primitive.slice.html#method.get_mut',
    ),
    src(
      'std · u8::checked_add',
      'https://doc.rust-lang.org/std/primitive.u8.html#method.checked_add',
    ),
  ],
});

add(103, {
  title: 'Boss · Cruzá el hangar con la energía justa',
  intro:
    'La brújula está reparada. Ahora cada orden propone un movimiento, pero el robot solo confirma la transición si queda dentro del hangar y tiene energía.',
  why: 'Separar propuesta, validación y actualización evita gastar recursos en una acción que se rechaza. Un programa de órdenes es una secuencia de estados.',
  objective:
    'Empezá en (0,0) dentro de una grilla con x e y entre 0 y 2. N/S/E/O proponen un paso. Solo un paso válido con batería > 0 consume una unidad. Otros chars y choques no consumen. Devolvé (x,y,batería restante).',
  instructions: [
    'Procesá las órdenes en su orden original.',
    'Calculá primero la posición candidata y comprobá sus dos límites.',
    'Actualizá posición y batería juntas solo al aceptar el movimiento.',
  ],
  starter:
    'fn cruzar_hangar(ordenes: &str, mut bateria: u32) -> (i32, i32, u32) {\n    todo!("simular transiciones")\n}',
  solution:
    "fn cruzar_hangar(ordenes: &str, mut bateria: u32) -> (i32, i32, u32) {\n    let (mut x, mut y) = (0, 0);\n    for orden in ordenes.chars() {\n        let (nx, ny) = match orden {\n            'N' => (x, y + 1), 'S' => (x, y - 1),\n            'E' => (x + 1, y), 'O' => (x - 1, y),\n            _ => continue,\n        };\n        if bateria > 0 && (0..=2).contains(&nx) && (0..=2).contains(&ny) {\n            x = nx; y = ny; bateria -= 1;\n        }\n    }\n    (x, y, bateria)\n}",
  tests: [
    t(
      'Un choque no cobra energía',
      'cruzar_hangar("EEEN", 4) == (2, 1, 1)',
      'El tercer E contra la pared deja posición y batería intactas.',
      'Descontá energía dentro del bloque de aceptación.',
    ),
    t(
      'Se agota en medio del viaje',
      'cruzar_hangar("EENN", 2) == (2, 0, 0)',
      'Las órdenes posteriores no mueven un robot sin energía.',
      'La batería es una condición de cada transición.',
    ),
    t(
      'Ruido, borde inicial y reposo',
      'cruzar_hangar("S?OEN", 3) == (1, 1, 1) && cruzar_hangar("NE", 0) == (0, 0, 0) && cruzar_hangar("", 7) == (0, 0, 7)',
      'Ruido, choques iniciales y programa vacío conservan sus invariantes.',
      'continue sirve para una orden ajena al alfabeto.',
    ),
  ],
  hints: [
    'La posición candidata no tiene que convertirse inmediatamente en la posición real.',
    'El rango inclusivo 0..=2 representa cada eje.',
    'Solo dentro del if válido asigná x, y y restá batería.',
  ],
  review: {
    success:
      'El robot respeta límites y conserva energía ante rechazos. Las pruebas distinguen una propuesta de movimiento de una transición confirmada.',
    pitfall:
      'Este modelo tiene un estado pequeño y determinista: no representa movimiento físico continuo ni entradas en tiempo real.',
  },
  transfer:
    'Agregá estaciones de recarga a la grilla y definí si recargar ocurre al entrar o al recibir una orden específica.',
  prediction: q(
    'Desde x=2, intentar E contra la pared debe…',
    ['Consumir una unidad sin avanzar', 'Conservar posición y batería', 'Volver a x=0'],
    1,
    'El contrato cobra energía solo por movimientos aceptados.',
  ),
  sources: [
    src('Rust Book · Control flow', 'https://doc.rust-lang.org/book/ch03-05-control-flow.html'),
  ],
});

add(104, {
  title: 'Reparación · Dos señales en un byte',
  visual: 'memory',
  intro:
    'El puerto transmite un tipo de mensaje y cuatro banderas en un solo byte. El emisor actual superpone ambos campos y pierde información.',
  why: 'Una representación binaria funciona porque cada campo ocupa posiciones diferentes. Desplazar mueve los bits; OR combina campos que ya no se solapan.',
  objective:
    'Implementá empaquetar: tipo y banderas deben estar entre 0 y 15. El tipo ocupa los cuatro bits altos y las banderas los cuatro bajos. Devolvé None si algún argumento supera 15.',
  instructions: [
    'Conservá la validación de ambos campos.',
    'Mové el tipo cuatro posiciones antes de combinarlo.',
    'Comprobá un caso donde ambos valores sean distintos.',
  ],
  starter:
    'fn empaquetar(tipo: u8, banderas: u8) -> Option<u8> {\n    if tipo > 15 || banderas > 15 { return None; }\n    Some(tipo | banderas)\n}',
  solution:
    'fn empaquetar(tipo: u8, banderas: u8) -> Option<u8> {\n    if tipo > 15 || banderas > 15 { return None; }\n    Some((tipo << 4) | banderas)\n}',
  tests: [
    t(
      'Los campos no se pisan',
      'empaquetar(10, 3) == Some(0xA3) && empaquetar(3, 10) == Some(0x3A)',
      'Intercambiar campos cambia su posición, no su significado.',
      'El operando que debés desplazar es tipo.',
    ),
    t(
      'Extremos de cada mitad',
      'empaquetar(0, 15) == Some(0x0F) && empaquetar(15, 0) == Some(0xF0) && empaquetar(15, 15) == Some(255)',
      'Todos los bits del byte pueden utilizarse sin perder los límites de campo.',
      'Cada mitad tiene cuatro bits: su máximo es 15.',
    ),
    t(
      'Rechazar antes de truncar',
      'empaquetar(16, 0) == None && empaquetar(0, 16) == None && empaquetar(255, 255) == None',
      'La API rechaza datos que no caben; no los oculta con una máscara.',
      'Enmascarar un argumento inválido cambiaría silenciosamente el contrato.',
    ),
  ],
  hints: [
    'Dibujá tttt bbbb: el tipo necesita quedar a la izquierda.',
    'Un desplazamiento de cuatro bits multiplica este tipo validado por 16.',
    'La combinación es (tipo << 4) | banderas.',
  ],
  review: {
    success:
      'Los casos verifican posición y rango de cada campo. El byte resultante conserva ambos valores porque ocupan mitades separadas.',
    pitfall:
      'Que un valor sea u8 no significa que quepa en cualquier campo de un protocolo. Este campo admite cuatro bits, no ocho.',
  },
  transfer:
    'Escribí desempaquetar con byte >> 4 y byte & 0x0F, y comprobá el recorrido de ida y vuelta.',
  prediction: q(
    '¿Qué byte representa tipo=2 y banderas=5?',
    ['0x07', '0x52', '0x25'],
    2,
    'El 2 queda en la mitad alta y el 5 en la baja: 32 + 5 = 37, o 0x25.',
  ),
  sources: [
    src(
      'Rust Reference · Operators',
      'https://doc.rust-lang.org/reference/expressions/operator-expr.html',
    ),
  ],
});

add(105, {
  title: 'Kata · Una huella que recuerda el orden',
  visual: 'memory',
  intro:
    'La señal necesita una comprobación pequeña para detectar algunas alteraciones. Vas a combinar una rotación de bits con XOR y observar por qué el orden importa.',
  why: 'Rotar desplaza todos los bits y devuelve al otro extremo los que salen. XOR mezcla el nuevo byte con el acumulador. Esta huella tiene solo 256 resultados: puede tener colisiones y no autentica mensajes.',
  objective:
    'checksum empieza en 0. Por cada byte, en orden, reemplazá el acumulador por acumulador.rotate_left(1) ^ byte. Devolvé el u8 final; una entrada vacía produce 0.',
  instructions: [
    'Usá un acumulador de tipo u8 para fijar una rotación de ocho bits.',
    'Rotá antes de aplicar XOR en cada iteración.',
    'Compará dos secuencias que solo difieran en el orden.',
  ],
  starter: 'fn checksum(datos: &[u8]) -> u8 {\n    todo!("rotar y mezclar cada byte")\n}',
  solution:
    'fn checksum(datos: &[u8]) -> u8 {\n    datos.iter().fold(0u8, |acumulado, &byte| acumulado.rotate_left(1) ^ byte)\n}',
  tests: [
    t(
      'Base y un solo byte',
      'checksum(&[]) == 0 && checksum(&[255]) == 255',
      'El estado inicial no agrega información inexistente.',
      'El acumulador inicial debe ser 0u8.',
    ),
    t(
      'Importa el orden',
      'checksum(&[1, 2, 3]) == 3 && checksum(&[1, 3, 2]) == 0',
      'La rotación entre bytes distingue estas dos permutaciones.',
      'Rotar una sola vez al final no equivale a rotar en cada paso.',
    ),
    t(
      'El bit alto vuelve por abajo',
      'checksum(&[128, 0]) == 1 && checksum(&[128, 1]) == 0',
      'El bit 7 no se descarta como en un desplazamiento ordinario.',
      'Usá rotate_left: 128 rotado una posición es 1.',
    ),
  ],
  hints: [
    'Un for sobre datos también sirve: el algoritmo no exige fold.',
    'Si recorrés referencias, desreferenciá byte o usá el patrón &byte.',
    'La actualización completa es acumulado = acumulado.rotate_left(1) ^ byte.',
  ],
  review: {
    success:
      'La huella sigue el orden de procesamiento y conserva el bit que cruza el borde. Los casos verifican exactamente esta regla, no una propiedad criptográfica.',
    pitfall:
      'Dos mensajes distintos pueden producir el mismo checksum. No lo uses para contraseñas, firmas ni para probar ausencia total de corrupción.',
  },
  transfer:
    'Buscá dos mensajes distintos con la misma huella y explicá por qué es inevitable cuando hay más de 256 mensajes posibles.',
  prediction: q(
    '¿Qué aporta rotate_left frente a desplazar un u8 a la izquierda?',
    [
      'Conserva el bit que sale y lo reintroduce por abajo',
      'Impide todas las colisiones',
      'Convierte el resultado en u16',
    ],
    0,
    'La rotación opera sobre los mismos ocho bits. Conserva los bits del acumulador, pero no vuelve inyectiva la combinación de mensajes.',
  ),
  sources: [
    src(
      'std · u8::rotate_left',
      'https://doc.rust-lang.org/std/primitive.u8.html#method.rotate_left',
    ),
  ],
});

add(106, {
  title: 'Boss · Abrí la compuerta del protocolo',
  intro:
    'El puerto recibe paquetes completos en memoria. Tu compuerta debe aceptar solo los que coincidan con la versión, el tamaño declarado y la huella esperada.',
  why: 'Un parser confiable establece el orden de sus validaciones antes de indexar o extraer datos. Diferenciar causas de rechazo ayuda a diagnosticar el protocolo sin recurrir a panics.',
  objective:
    'Formato: [cabecera, largo_payload, payload..., checksum]. La mitad alta de cabecera debe valer 1; la baja son banderas. Debe haber exactamente largo_payload+3 bytes. El checksum usa todos los bytes menos el último. Devolvé (banderas, payload propio). Precedencia de errores: menos de 3 bytes → "largo"; versión distinta de 1 → "version"; tamaño inexacto → "largo"; huella distinta → "checksum".',
  instructions: [
    'La función checksum ya está provista: reutilizala.',
    'Validá mínimo, versión y largo exacto en ese orden.',
    'Comprobá la huella antes de copiar el payload al Vec del resultado.',
  ],
  starter:
    'fn checksum(datos: &[u8]) -> u8 {\n    datos.iter().fold(0u8, |a, &b| a.rotate_left(1) ^ b)\n}\nfn abrir_paquete(datos: &[u8]) -> Result<(u8, Vec<u8>), &\'static str> {\n    todo!("validar y abrir el paquete")\n}',
  solution:
    'fn checksum(datos: &[u8]) -> u8 {\n    datos.iter().fold(0u8, |a, &b| a.rotate_left(1) ^ b)\n}\nfn abrir_paquete(datos: &[u8]) -> Result<(u8, Vec<u8>), &\'static str> {\n    if datos.len() < 3 { return Err("largo"); }\n    if datos[0] >> 4 != 1 { return Err("version"); }\n    if datos.len() != usize::from(datos[1]) + 3 { return Err("largo"); }\n    let fin = datos.len() - 1;\n    if checksum(&datos[..fin]) != datos[fin] { return Err("checksum"); }\n    Ok((datos[0] & 0x0F, datos[2..fin].to_vec()))\n}',
  tests: [
    t(
      'Payload y banderas correctos',
      'abrir_paquete(&[0x13, 2, 4, 8, 0x90]) == Ok((3, vec![4, 8]))',
      'Cabecera, largo y huella se combinan para devolver el contenido útil.',
      'El checksum incluye cabecera y largo, pero excluye el último byte.',
    ),
    t(
      'Vacío válido y tamaño exacto',
      'abrir_paquete(&[0x10, 0, 0x20]) == Ok((0, vec![])) && abrir_paquete(&[0x10, 1, 0x20]) == Err("largo") && abrir_paquete(&[0x10, 0, 0x20, 0]) == Err("largo")',
      'Un payload vacío es válido; un byte faltante o sobrante no lo es.',
      'Compará igualdad de longitudes: no alcanza con tener al menos lo declarado.',
    ),
    t(
      'Causas y orden de rechazo',
      'abrir_paquete(&[0x13, 2, 4, 8, 0]) == Err("checksum") && abrir_paquete(&[0x20, 9, 0]) == Err("version") && abrir_paquete(&[]) == Err("largo")',
      'La precedencia produce diagnósticos previsibles aun si un paquete tiene varios problemas.',
      'No inspecciones cabecera sin verificar primero el mínimo de tres bytes.',
    ),
  ],
  hints: [
    'Después de verificar len >= 3, datos[0] y datos[1] existen.',
    'El último byte está en len - 1; el payload ocupa 2..len-1.',
    'La versión se obtiene con >> 4 y las banderas con & 0x0F.',
  ],
  review: {
    success:
      'Los casos distinguen paquetes válidos, truncados, extendidos y alterados. El parser devuelve errores explícitos y solo crea el payload al validar el formato.',
    pitfall:
      'Este parser recibe una trama completa. Una conexión real puede entregarla fragmentada y requiere además buffering y límites de entrada; la huella sigue sin autenticar al emisor.',
  },
  transfer:
    'Diseñá un decodificador incremental que reciba fragmentos y diga si falta información, sin confundirlo con un paquete inválido.',
  prediction: q(
    'Un paquete de 3 bytes declara versión 2 y payload de 9 bytes. ¿Qué error corresponde?',
    ['checksum', 'largo', 'version'],
    2,
    'Pasa el mínimo de tres bytes y falla la versión, que el contrato valida antes del tamaño declarado.',
  ),
  sources: [
    src(
      'Rust Book · Recoverable errors',
      'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html',
    ),
    src('std · Slice methods', 'https://doc.rust-lang.org/std/primitive.slice.html'),
  ],
});

add(107, {
  title: 'Reparación · La cola se convirtió en pila',
  visual: 'collections',
  intro:
    'El explorador conoce las conexiones de una estación, pero visita una rama entera antes de volver a los vecinos cercanos. Repará su recorrido por capas.',
  why: 'BFS procesa primero los nodos descubiertos antes: una cola FIFO conserva ese orden. Marcar un nodo al encolarlo evita duplicarlo aunque tenga varios caminos de entrada o ciclos.',
  objective:
    'explorar recibe aristas dirigidas y un inicio. Devolvé los nodos alcanzables en orden BFS, incluyendo el inicio. Recorre vecinos en el orden de las aristas originales y visita cada nodo una sola vez. Un nodo sin aristas produce [inicio].',
  instructions: [
    'Buscá qué extremo de VecDeque se utiliza para extraer.',
    'Conservá el registro de visitados al momento de encolar.',
    'Probá una bifurcación: un camino lineal no revela este bug.',
  ],
  starter:
    'use std::collections::{HashSet, VecDeque};\nfn explorar(aristas: &[(usize, usize)], inicio: usize) -> Vec<usize> {\n    let mut pendientes = VecDeque::from([inicio]);\n    let mut vistos = HashSet::from([inicio]);\n    let mut orden = Vec::new();\n    while let Some(nodo) = pendientes.pop_back() {\n        orden.push(nodo);\n        for &(desde, hasta) in aristas {\n            if desde == nodo && vistos.insert(hasta) { pendientes.push_back(hasta); }\n        }\n    }\n    orden\n}',
  solution:
    'use std::collections::{HashSet, VecDeque};\nfn explorar(aristas: &[(usize, usize)], inicio: usize) -> Vec<usize> {\n    let mut pendientes = VecDeque::from([inicio]);\n    let mut vistos = HashSet::from([inicio]);\n    let mut orden = Vec::new();\n    while let Some(nodo) = pendientes.pop_front() {\n        orden.push(nodo);\n        for &(desde, hasta) in aristas {\n            if desde == nodo && vistos.insert(hasta) { pendientes.push_back(hasta); }\n        }\n    }\n    orden\n}',
  tests: [
    t(
      'Visitar por capas',
      'explorar(&[(0, 1), (0, 2), (1, 3), (2, 4)], 0) == vec![0, 1, 2, 3, 4]',
      'Los vecinos a distancia uno salen antes que los de distancia dos.',
      'Extraer por atrás convierte la estructura en LIFO.',
    ),
    t(
      'Ciclos y entradas repetidas',
      'explorar(&[(0, 1), (1, 0), (0, 1), (1, 2), (2, 2)], 0) == vec![0, 1, 2]',
      'El registro de visitados evita repeticiones y termina en grafos cíclicos.',
      'HashSet::insert devuelve false si el nodo ya estaba registrado.',
    ),
    t(
      'Origen aislado y dirección',
      'explorar(&[], 42) == vec![42] && explorar(&[(0, 1)], 1) == vec![1]',
      'La relación desde→hasta no agrega automáticamente la arista inversa.',
      'El inicio se visita incluso si no aparece como origen de ninguna arista.',
    ),
  ],
  hints: [
    'push_back agrega al final de la fila.',
    'Para respetar llegada primero, extraé por el extremo opuesto.',
    'Cambiá pop_back por pop_front; el resto mantiene la unicidad.',
  ],
  review: {
    success:
      'La bifurcación verifica el orden FIFO, y los ciclos verifican la visita única. Con vecinos tomados del slice, el resultado no depende del orden interno del HashSet.',
    pitfall:
      'Aquí se recorren todas las aristas por nodo: es claro para aprender, pero no tiene la eficiencia de una lista de adyacencia. BFS tampoco resuelve por sí solo caminos con costos diferentes.',
  },
  transfer:
    'Construí una lista de adyacencia una vez y compará cuántas aristas inspeccionás al explorar.',
  prediction: q(
    'Al descubrir A y luego B, ¿cuál debe procesar primero una cola FIFO?',
    ['B, porque llegó después', 'A, porque llegó antes', 'Depende del hash de sus nombres'],
    1,
    'Primero en entrar, primero en salir: push_back combinado con pop_front.',
  ),
  sources: [
    src('std · VecDeque', 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html'),
    src(
      'std · HashSet::insert',
      'https://doc.rust-lang.org/std/collections/struct.HashSet.html#method.insert',
    ),
  ],
});

add(108, {
  title: 'Kata · Seguí el hilo de los predecesores',
  visual: 'collections',
  intro:
    'El explorador guardó quién descubrió cada nodo. Para mostrar el trayecto, necesitás caminar hacia atrás sin quedar atrapado si el registro está incompleto o es cíclico.',
  why: 'Una tabla de predecesores separa la búsqueda del armado del camino. Los índices son datos: Rust evita accesos inválidos, pero vos definís cómo reportar un registro inconsistente.',
  objective:
    'prev[n] contiene el predecesor del nodo n. Devolvé la ruta de inicio a fin, ambos incluidos. Si inicio o fin no existen, falta un enlace antes de llegar a inicio, hay un padre fuera de rango o aparece un ciclo en el tramo recorrido, devolvé None. inicio==fin válido produce [inicio], sin seguir su padre.',
  instructions: [
    'Empezá en fin y acumulá el trayecto al revés.',
    'Limitá el recorrido a prev.len() nodos para detectar un ciclo.',
    'Al alcanzar inicio, invertí el vector y devolvelo.',
  ],
  starter:
    'fn reconstruir_ruta(prev: &[Option<usize>], inicio: usize, fin: usize) -> Option<Vec<usize>> {\n    todo!("reconstruir una ruta con límites")\n}',
  solution:
    'fn reconstruir_ruta(prev: &[Option<usize>], inicio: usize, fin: usize) -> Option<Vec<usize>> {\n    if inicio >= prev.len() || fin >= prev.len() { return None; }\n    let mut actual = fin;\n    let mut ruta = Vec::new();\n    for _ in 0..prev.len() {\n        ruta.push(actual);\n        if actual == inicio { ruta.reverse(); return Some(ruta); }\n        actual = prev.get(actual).copied().flatten()?;\n    }\n    None\n}',
  tests: [
    t(
      'Volver y dar vuelta la ruta',
      'reconstruir_ruta(&[None, Some(0), Some(0), Some(1)], 0, 3) == Some(vec![0, 1, 3])',
      'Se devuelve inicio→fin, aunque los enlaces se recorren en sentido inverso.',
      'reverse se aplica al llegar al origen, no a cada paso.',
    ),
    t(
      'Ruta trivial y enlace ausente',
      'reconstruir_ruta(&[None, None], 0, 0) == Some(vec![0]) && reconstruir_ruta(&[None, None], 0, 1) == None && reconstruir_ruta(&[], 0, 0) == None',
      'Coincidir no vuelve válido un índice inexistente; un origen real no necesita padre.',
      'Validá índices antes del caso inicio==fin.',
    ),
    t(
      'Registro corrupto sin bucle infinito',
      'reconstruir_ruta(&[None, Some(2), Some(1)], 0, 2) == None && reconstruir_ruta(&[None, Some(9)], 0, 1) == None && reconstruir_ruta(&[None], 0, 7) == None',
      'Ciclos e índices ajenos al slice producen None de forma acotada.',
      'Un camino simple no puede visitar más nodos que la longitud de prev.',
    ),
  ],
  hints: [
    'get(actual) devuelve Option<&Option<usize>>: hay una ausencia del índice y otra del padre.',
    'copied().flatten() convierte esas dos capas en Option<usize>.',
    'El operador ? propaga None y el límite del for detecta ciclos sin otro HashSet.',
  ],
  review: {
    success:
      'Los casos verifican orientación, extremos y terminación ante registros inválidos. Solo se exige validar la cadena recorrida: otros componentes pueden contener enlaces ajenos.',
    pitfall:
      'Un predecesor no demuestra por sí mismo que el camino sea mínimo. Esa propiedad depende del algoritmo que construyó la tabla.',
  },
  transfer:
    'Modificá la búsqueda BFS anterior para guardar predecesores y mostrar tanto el orden visitado como la ruta final.',
  prediction: q(
    'Si hay 4 nodos y seguís 4 predecesores sin llegar al inicio ni salir del registro, ¿qué pasó?',
    [
      'Existe un camino mínimo de 5 nodos distintos',
      'Se repitió un nodo de la cadena',
      'Hace falta ordenar el slice',
    ],
    1,
    'Con solo cuatro índices posibles, una cadena más larga repite algún nodo: su enlace determinista forma un ciclo.',
  ),
  sources: [
    src('std · Option', 'https://doc.rust-lang.org/std/option/enum.Option.html'),
    src('std · Slice methods', 'https://doc.rust-lang.org/std/primitive.slice.html'),
  ],
});

add(109, {
  title: 'Boss · Encontrá la salida entre los muros',
  visual: 'collections',
  minutes: 25,
  intro:
    'La estación quedó dividida por muros. Tu robot necesita la cantidad mínima de pasos hasta la salida, y debe reconocer los mapas inválidos o imposibles.',
  why: 'Cuando cada movimiento cuesta lo mismo, BFS descubre una celda por su distancia mínima. Registrar una celda al encolarla impide trabajo repetido y hace finita la exploración.',
  objective:
    'mapa usa true para piso y false para muro; coordenadas (fila,columna). Devolvé la menor cantidad de pasos N/E/S/O entre inicio y fin. Sin diagonales. Devolvé None ante mapa vacío, filas vacías o de distintos largos, extremos fuera del mapa, extremos bloqueados o falta de camino. Misma celda de piso → Some(0). Entradas de hasta 30×30.',
  instructions: [
    'Validá forma rectangular y extremos antes de explorar.',
    'Encolá (fila,columna,distancia) y marcá visitados al agregar.',
    'Expandí cuatro vecinos válidos; la primera llegada al destino da la distancia.',
  ],
  starter:
    'use std::collections::VecDeque;\nfn ruta_corta(mapa: &[Vec<bool>], inicio: (usize, usize), fin: (usize, usize)) -> Option<usize> {\n    todo!("buscar por capas en la grilla")\n}',
  solution:
    'use std::collections::VecDeque;\nfn ruta_corta(mapa: &[Vec<bool>], inicio: (usize, usize), fin: (usize, usize)) -> Option<usize> {\n    let filas = mapa.len();\n    let columnas = mapa.first()?.len();\n    if columnas == 0 || mapa.iter().any(|fila| fila.len() != columnas) { return None; }\n    for (f, c) in [inicio, fin] {\n        if f >= filas || c >= columnas || !mapa[f][c] { return None; }\n    }\n    let mut vistos = vec![vec![false; columnas]; filas];\n    let mut cola = VecDeque::from([(inicio.0, inicio.1, 0usize)]);\n    vistos[inicio.0][inicio.1] = true;\n    while let Some((f, c, distancia)) = cola.pop_front() {\n        if (f, c) == fin { return Some(distancia); }\n        for (df, dc) in [(-1isize, 0isize), (0, 1), (1, 0), (0, -1)] {\n            let Some(nf) = f.checked_add_signed(df) else { continue; };\n            let Some(nc) = c.checked_add_signed(dc) else { continue; };\n            if nf < filas && nc < columnas && mapa[nf][nc] && !vistos[nf][nc] {\n                vistos[nf][nc] = true;\n                cola.push_back((nf, nc, distancia + 1));\n            }\n        }\n    }\n    None\n}',
  tests: [
    t(
      'Rodear un muro por el camino mínimo',
      'ruta_corta(&[vec![true, false, true], vec![true, true, true]], (0, 0), (0, 2)) == Some(4) && ruta_corta(&[vec![true, true], vec![true, true]], (0, 0), (1, 1)) == Some(2)',
      'Se rodean obstáculos y no se toma un atajo diagonal.',
      'Cada vecino debe diferir en exactamente una coordenada por una unidad.',
    ),
    t(
      'Sin ruta o extremo bloqueado',
      'ruta_corta(&[vec![true, false, true]], (0, 0), (0, 2)) == None && ruta_corta(&[vec![false, true]], (0, 0), (0, 1)) == None',
      'Agotar la cola y empezar sobre un muro son dos rechazos diferentes.',
      'Los extremos también deben ser piso.',
    ),
    t(
      'Forma del mapa y distancia cero',
      'ruta_corta(&[vec![true]], (0, 0), (0, 0)) == Some(0) && ruta_corta(&[], (0, 0), (0, 0)) == None && ruta_corta(&[vec![true], vec![true, true]], (0, 0), (1, 0)) == None && ruta_corta(&[vec![true]], (0, 0), (1, 0)) == None && ruta_corta(&[vec![]], (0, 0), (0, 0)) == None',
      'El caso trivial requiere un mapa válido y una celda existente.',
      'Comprobá la forma antes de reservar visitados o indexar filas.',
    ),
  ],
  hints: [
    'Una matriz booleana de visitados evita volver a encolar las mismas celdas.',
    'checked_add_signed permite restar uno a usize sin desbordar en el borde cero.',
    'Guardá distancia+1 con cada vecino; devolver al sacar el destino conserva el orden BFS.',
  ],
  review: {
    success:
      'Los casos verifican distancia, obstáculos y validaciones de entrada. El modelo de cuatro vecinos con costo uniforme justifica resolver por capas.',
    pitfall:
      'Si los terrenos tuvieran costos diferentes, el orden FIFO dejaría de garantizar la distancia de menor costo. Habría que cambiar el algoritmo y el contrato.',
  },
  transfer:
    'Devolvé también las coordenadas del camino usando una tabla de predecesores, y explicá cómo resolvés empates.',
  prediction: q(
    '¿Por qué la primera llegada de BFS sirve como distancia mínima en este mapa?',
    [
      'Cada movimiento cuesta exactamente un paso',
      'HashSet ordena las distancias',
      'Rust elige automáticamente el camino más corto',
    ],
    0,
    'La cola procesa distancias 0, luego 1, luego 2… siempre que cada arista tenga el mismo costo.',
  ),
  sources: [
    src('std · VecDeque', 'https://doc.rust-lang.org/std/collections/struct.VecDeque.html'),
    src(
      'std · usize::checked_add_signed',
      'https://doc.rust-lang.org/std/primitive.usize.html#method.checked_add_signed',
    ),
  ],
});

add(110, {
  title: 'Reparación · El byte que olvidó su signo',
  visual: 'memory',
  intro:
    'Encontraste el bytecode de una máquina diminuta. Su decodificador interpreta el operando 0xFF como 255, aunque el protocolo lo define como −1.',
  why: 'Los bits no incluyen su propia interpretación. Un campo de ocho bits puede representar u8 o i8: la conversión debe seguir el formato. Ampliar el i8 a i32 conserva su signo.',
  objective:
    'Decodificá desde pc y devolvé (Op, pc siguiente). Opcode 0=Fin, tamaño 1; 1=Sumar(operando i8 ampliado a i32), 2=Saltar(destino u8 como usize), 3=SiCero(destino u8 como usize), todos tamaño 2. Errores: pc fuera del slice → "pc"; opcode desconocido → "opcode"; operando faltante de opcode conocido → "operando". Aquí pc y destinos miden bytes.',
  instructions: [
    'Localizá la conversión del operando de Sumar.',
    'Interpretá primero el patrón de ocho bits como i8 y después amplialo a i32.',
    'Conservá los chequeos de formato y los destinos sin signo.',
  ],
  starter:
    '#[derive(Debug, PartialEq)]\nenum Op { Fin, Sumar(i32), Saltar(usize), SiCero(usize) }\nfn decodificar(bytes: &[u8], pc: usize) -> Result<(Op, usize), &\'static str> {\n    let codigo = *bytes.get(pc).ok_or("pc")?;\n    match codigo {\n        0 => Ok((Op::Fin, pc + 1)),\n        1..=3 => {\n            let valor = *bytes.get(pc + 1).ok_or("operando")?;\n            let op = match codigo {\n                1 => Op::Sumar(valor as i32),\n                2 => Op::Saltar(usize::from(valor)),\n                _ => Op::SiCero(usize::from(valor)),\n            };\n            Ok((op, pc + 2))\n        }\n        _ => Err("opcode"),\n    }\n}',
  solution:
    '#[derive(Debug, PartialEq)]\nenum Op { Fin, Sumar(i32), Saltar(usize), SiCero(usize) }\nfn decodificar(bytes: &[u8], pc: usize) -> Result<(Op, usize), &\'static str> {\n    let codigo = *bytes.get(pc).ok_or("pc")?;\n    match codigo {\n        0 => Ok((Op::Fin, pc + 1)),\n        1..=3 => {\n            let valor = *bytes.get(pc + 1).ok_or("operando")?;\n            let op = match codigo {\n                1 => Op::Sumar(valor as i8 as i32),\n                2 => Op::Saltar(usize::from(valor)),\n                _ => Op::SiCero(usize::from(valor)),\n            };\n            Ok((op, pc + 2))\n        }\n        _ => Err("opcode"),\n    }\n}',
  tests: [
    t(
      'El signo depende del campo',
      'decodificar(&[1, 255], 0) == Ok((Op::Sumar(-1), 2)) && decodificar(&[1, 128], 0) == Ok((Op::Sumar(-128), 2)) && decodificar(&[1, 7], 0) == Ok((Op::Sumar(7), 2))',
      'Se conserva el rango firmado de ocho bits al ampliarlo.',
      'u8→i32 nunca convierte 255 en −1: falta interpretar el i8.',
    ),
    t(
      'Tamaños y destinos sin signo',
      'decodificar(&[0], 0) == Ok((Op::Fin, 1)) && decodificar(&[9, 2, 255], 1) == Ok((Op::Saltar(255), 3)) && decodificar(&[3, 4], 0) == Ok((Op::SiCero(4), 2))',
      'El pc siguiente cuenta bytes y los destinos siguen siendo no negativos.',
      'La regla con signo solo corresponde al operando Sumar.',
    ),
    t(
      'Formato incompleto o desconocido',
      'decodificar(&[], 0) == Err("pc") && decodificar(&[1], 0) == Err("operando") && decodificar(&[9], 0) == Err("opcode") && decodificar(&[0], 1) == Err("pc")',
      'Cada error refleja el primer dato que impide decodificar.',
      'Un opcode desconocido no debe intentar leer un operando.',
    ),
  ],
  hints: [
    'El cast entre u8 e i8 de igual tamaño conserva el patrón de bits.',
    'Después, i8→i32 extiende el signo del valor.',
    'Para Sumar usá valor as i8 as i32; los destinos quedan con usize::from(valor).',
  ],
  review: {
    success:
      'Los casos distinguen interpretación firmada, destinos sin signo y tamaño de instrucción. Decodificar transforma bytes en un enum con significado.',
    pitfall:
      'Este decodificador no comprueba si un salto apunta a un comienzo de instrucción. Esa validación pertenece a una etapa posterior; convertir bytes no equivale a ejecutar código.',
  },
  transfer:
    'Construí una tabla de los comienzos de instrucciones y rechazá saltos que caigan en medio de un operando.',
  prediction: q(
    '¿Por qué 0xFF significa −1 solo para Sumar?',
    [
      'Todo byte 255 es siempre negativo',
      'El opcode define la interpretación del campo',
      'Rust detecta que el número debería ser pequeño',
    ],
    1,
    'El formato asigna a ese campo un i8. Para un destino u8, el mismo patrón representa 255.',
  ),
  sources: [
    src(
      'Rust Reference · Numeric casts',
      'https://doc.rust-lang.org/reference/expressions/operator-expr.html#numeric-cast',
    ),
    src('Rust Book · Enums', 'https://doc.rust-lang.org/book/ch06-01-defining-an-enum.html'),
  ],
});

add(111, {
  title: 'Kata · Una instrucción, una transición completa',
  intro:
    'Ahora la máquina opera sobre instrucciones ya decodificadas. Antes de ejecutar programas, necesitás una transición que nunca deje medio actualizado su estado.',
  why: 'Un préstamo mutable da acceso exclusivo, pero no vuelve atómica la lógica de tu función. Calcular sobre una copia y confirmar al final permite conservar el estado ante cualquier error.',
  objective:
    'avanzar recibe Estado e Instruccion. Si detenido ya era true: Ok sin cambios. Sumar suma con checked_add y avanza pc en 1; Saltar reemplaza pc; SiCero salta cuando acumulador==0, si no avanza pc en 1; Fin marca detenido sin mover pc. Overflow de acumulador → Err("overflow"); de pc al incrementarlo → Err("pc"). En errores, conservá TODO el estado. Saltos aceptan cualquier usize: aquí no hay programa que validar. pc mide índices de instrucciones.',
  instructions: [
    'Trabajá sobre una copia de Estado.',
    'Usá checked_add tanto para el acumulador como para avanzar pc.',
    'Asigná la copia al estado original solo después de completar el match.',
  ],
  starter:
    '#[derive(Clone, Copy)]\nenum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }\n#[derive(Debug, Clone, Copy, PartialEq)]\nstruct Estado { pc: usize, acumulador: i32, detenido: bool }\nfn avanzar(estado: &mut Estado, instruccion: Instruccion) -> Result<(), &\'static str> {\n    todo!("preparar y confirmar una transición")\n}',
  solution:
    '#[derive(Clone, Copy)]\nenum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }\n#[derive(Debug, Clone, Copy, PartialEq)]\nstruct Estado { pc: usize, acumulador: i32, detenido: bool }\nfn avanzar(estado: &mut Estado, instruccion: Instruccion) -> Result<(), &\'static str> {\n    if estado.detenido { return Ok(()); }\n    let mut siguiente = *estado;\n    match instruccion {\n        Instruccion::Sumar(n) => {\n            siguiente.acumulador = siguiente.acumulador.checked_add(n).ok_or("overflow")?;\n            siguiente.pc = siguiente.pc.checked_add(1).ok_or("pc")?;\n        }\n        Instruccion::Saltar(destino) => siguiente.pc = destino,\n        Instruccion::SiCero(destino) => {\n            siguiente.pc = if siguiente.acumulador == 0 { destino }\n                else { siguiente.pc.checked_add(1).ok_or("pc")? };\n        }\n        Instruccion::Fin => siguiente.detenido = true,\n    }\n    *estado = siguiente;\n    Ok(())\n}',
  tests: [
    t(
      'Sumar, detener y conservar el reposo',
      '{ let mut e = Estado { pc: 2, acumulador: 7, detenido: false }; let a = avanzar(&mut e, Instruccion::Sumar(-3)); let suma = e == Estado { pc: 3, acumulador: 4, detenido: false }; let b = avanzar(&mut e, Instruccion::Fin); let quieto = e; let c = avanzar(&mut e, Instruccion::Sumar(99)); a == Ok(()) && suma && b == Ok(()) && c == Ok(()) && e == quieto && e.detenido && e.pc == 3 }',
      'Fin conserva pc y un estado detenido no vuelve a ejecutar instrucciones.',
      'La comprobación detenido debe preceder a cualquier transición.',
    ),
    t(
      'Ramas tomadas y no tomadas',
      '{ let mut e = Estado { pc: 1, acumulador: 0, detenido: false }; let a = avanzar(&mut e, Instruccion::SiCero(8)); let salto = e.pc == 8; e.acumulador = 2; let b = avanzar(&mut e, Instruccion::SiCero(3)); let normal = e.pc == 9; let c = avanzar(&mut e, Instruccion::Saltar(4)); a == Ok(()) && b == Ok(()) && c == Ok(()) && salto && normal && e.pc == 4 && e.acumulador == 2 }',
      'Un salto condicional depende del acumulador, y Saltar no lo modifica.',
      'Si la condición es falsa, avanzá desde el pc actual, no desde el destino.',
    ),
    t(
      'Rechazo sin efectos parciales',
      '{ let mut a = Estado { pc: 4, acumulador: i32::MAX, detenido: false }; let antes_a = a; let ra = avanzar(&mut a, Instruccion::Sumar(1)); let mut b = Estado { pc: usize::MAX, acumulador: 2, detenido: false }; let antes_b = b; let rb = avanzar(&mut b, Instruccion::Sumar(3)); ra == Err("overflow") && a == antes_a && rb == Err("pc") && b == antes_b }',
      'Incluso si la suma es válida y después falla pc, no queda una suma aplicada parcialmente.',
      'Mutar una copia evita deshacer manualmente operaciones ante un error posterior.',
    ),
  ],
  hints: [
    'Estado deriva Copy, por lo que let mut siguiente = *estado no mueve el original.',
    'Los ? pueden retornar temprano mientras solo cambiaste la copia.',
    'La única asignación al préstamo original debe ser *estado = siguiente, después del match.',
  ],
  review: {
    success:
      'Los casos verifican semántica de instrucciones, reposo y rechazo sin cambios parciales. La garantía es sobre esta transición y este estado en memoria.',
    pitfall:
      'Esta atomicidad lógica no implica sincronización entre hilos ni revierte efectos externos. Si agregás archivos o mensajes, necesitarás definir otro protocolo de confirmación.',
  },
  transfer:
    'Agregá multiplicación comprobada y una prueba donde falla pc después de calcular un producto válido.',
  prediction: q(
    'La suma puede hacerse, pero avanzar pc desborda. ¿Qué estado debe quedar?',
    [
      'El acumulador nuevo con el pc viejo',
      'El estado original completo',
      'detenido=true automáticamente',
    ],
    1,
    'El contrato de transición rechazada conserva todos los campos, aunque un cálculo intermedio ya haya sido posible.',
  ),
  sources: [
    src(
      'std · i32::checked_add',
      'https://doc.rust-lang.org/std/primitive.i32.html#method.checked_add',
    ),
    src(
      'Rust Book · Recoverable errors',
      'https://doc.rust-lang.org/book/ch09-02-recoverable-errors-with-result.html',
    ),
  ],
});

add(112, {
  title: 'Boss · Encendé una máquina que sabe detenerse',
  minutes: 25,
  intro:
    'La estación vuelve a funcionar cuando su núcleo ejecuta un programa completo. Los programas pueden contener saltos, errores o ciclos: tu VM necesita semántica precisa y un presupuesto finito.',
  why: 'Separar instrucciones de su intérprete permite probar programas como datos. Un presupuesto de instrucciones limita el trabajo de esta VM, incluso si el programa contiene un salto hacia sí mismo.',
  objective:
    'Ejecutá desde pc=0 y acumulador=0. pc y saltos miden índices del slice de Instruccion. Sumar(n) usa checked_add y avanza; Saltar(d) va a d; SiCero(d) salta si acumulador==0, o avanza; Fin devuelve (acumulador, instrucciones ejecutadas). Fin también cuenta. Cada vuelta: 1) buscá instrucción o Err("pc"), 2) si se gastó presupuesto → Err("presupuesto"), 3) contá y ejecutá. Overflow de suma → Err("overflow"). Llegar al final del slice sin ejecutar Fin produce Err("pc").',
  instructions: [
    'Usá get(pc) para obtener la instrucción antes de comprobar el presupuesto.',
    'Contá toda instrucción que efectivamente comience, incluido Fin.',
    'Probá un bucle, una rama que finalmente termina y un salto fuera de programa.',
  ],
  starter:
    '#[derive(Clone, Copy)]\nenum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }\nfn ejecutar_vm(programa: &[Instruccion], presupuesto: usize) -> Result<(i32, usize), &\'static str> {\n    todo!("interpretar sin superar el presupuesto")\n}',
  solution:
    '#[derive(Clone, Copy)]\nenum Instruccion { Sumar(i32), Saltar(usize), SiCero(usize), Fin }\nfn ejecutar_vm(programa: &[Instruccion], presupuesto: usize) -> Result<(i32, usize), &\'static str> {\n    let mut pc = 0usize;\n    let mut acumulador = 0i32;\n    let mut ejecutadas = 0usize;\n    loop {\n        let instruccion = *programa.get(pc).ok_or("pc")?;\n        if ejecutadas == presupuesto { return Err("presupuesto"); }\n        ejecutadas += 1;\n        match instruccion {\n            Instruccion::Sumar(n) => {\n                acumulador = acumulador.checked_add(n).ok_or("overflow")?;\n                pc += 1;\n            }\n            Instruccion::Saltar(destino) => pc = destino,\n            Instruccion::SiCero(destino) => {\n                pc = if acumulador == 0 { destino } else { pc + 1 };\n            }\n            Instruccion::Fin => return Ok((acumulador, ejecutadas)),\n        }\n    }\n}',
  tests: [
    t(
      'Fin es una instrucción ejecutada',
      'ejecutar_vm(&[Instruccion::Sumar(2), Instruccion::Sumar(3), Instruccion::Fin], 3) == Ok((5, 3)) && ejecutar_vm(&[Instruccion::Fin], 1) == Ok((0, 1)) && ejecutar_vm(&[Instruccion::Fin], 0) == Err("presupuesto")',
      'El límite incluye la instrucción de terminación y puede ser exactamente suficiente.',
      'Incrementá ejecutadas antes de despachar Fin.',
    ),
    t(
      'Un bucle que progresa hasta cero',
      '{ let programa = [Instruccion::Sumar(3), Instruccion::Sumar(-1), Instruccion::SiCero(4), Instruccion::Saltar(1), Instruccion::Fin]; ejecutar_vm(&programa, 10) == Ok((0, 10)) && ejecutar_vm(&programa, 9) == Err("presupuesto") }',
      'El control vuelve sobre instrucciones anteriores y toma la rama cuando cambia el estado.',
      'El salto condicional consulta el acumulador actual en cada iteración.',
    ),
    t(
      'Ciclo infinito, direcciones y overflow',
      'ejecutar_vm(&[Instruccion::Saltar(0)], 5) == Err("presupuesto") && ejecutar_vm(&[Instruccion::Saltar(99)], 1) == Err("pc") && ejecutar_vm(&[Instruccion::Sumar(i32::MAX), Instruccion::Sumar(1), Instruccion::Fin], 3) == Err("overflow") && ejecutar_vm(&[], 0) == Err("pc") && ejecutar_vm(&[Instruccion::Sumar(1)], 3) == Err("pc")',
      'El intérprete acota ciclos y distingue agotamiento, memoria de programa ausente y error aritmético.',
      'La búsqueda en programa precede al límite: un pc inexistente siempre reporta pc.',
    ),
  ],
  hints: [
    'Mantené tres variables locales: pc, acumulador y ejecutadas.',
    'Un loop con retorno en Fin y en cada error expresa las salidas posibles.',
    'Buscá la instrucción con get, comprobá ejecutadas==presupuesto y recién después incrementá y hacé match.',
  ],
  review: {
    success:
      'Los casos verifican ejecución lineal, un bucle que termina y rechazos acotados. La VM ejecuta instrucciones del enum y define explícitamente cómo fallan los programas.',
    pitfall:
      'Este presupuesto cuenta instrucciones de una VM sin operaciones externas. No mide tiempo real ni vuelve segura cualquier extensión con I/O, memoria ilimitada o instrucciones de costo variable. El decodificador anterior cuenta bytes: conectar ambas etapas exige traducir destinos.',
  },
  transfer:
    'Agregá un modo de traza que devuelva los estados visitados antes de cada instrucción y un ensamblador con etiquetas para no escribir destinos a mano.',
  prediction: q(
    'Con un programa [Saltar(99)] y presupuesto 1, ¿qué error aparece después del salto?',
    ['presupuesto', 'pc', 'No hay error: salir del slice termina'],
    1,
    'La siguiente vuelta intenta buscar la instrucción primero. El contrato distingue un destino inválido de un programa que necesita más presupuesto.',
  ),
  sources: [
    src('Rust Book · Enums and match', 'https://doc.rust-lang.org/book/ch06-02-match.html'),
    src('Rust Book · Loops', 'https://doc.rust-lang.org/book/ch03-05-control-flow.html'),
  ],
});

export const rustQuests: Exercise[] = missions;
