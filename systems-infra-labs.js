/* Núcleos originales de infraestructura, ejecutables sin red ni disco. */
(() => {
  'use strict';
  const labs = [];
  const topics = ['wal', 'lsm', 'quorum', 'clocks', 'network', 'backpressure', 'balancing', 'sharding'];
  const levels = ['advanced', 'expert', 'expert', 'advanced', 'advanced', 'medium', 'advanced', 'advanced'];
  const t = (label, expression, why, failure) => ({label, expression, why, failure});
  const q = (question, options, answer, explanation) => ({question, options, answer, explanation});
  function pair(number, common, rust, go) {
    const index = number - 121;
    for (const [language, specific] of [['rust', rust], ['go', go]]) {
      const exercise = {...common, ...specific};
      labs.push({id: language + '-' + number, language, topicId: language + '-systems-' + topics[index], topic: 'Infraestructura · ' + common.topic,
        workshopId: topics[index], stage: 33 + index, level: levels[index], kind: 'completar', challengeType: 'kata', minutes: 20, visual: 'flow', imports: [], ...exercise,
        tests: exercise.tests.map((test, i) => ({id: 't' + (i + 1), ...test}))});
    }
  }
  const rustWalTypes = `use std::collections::BTreeMap;
enum Record { Put { tx: u32, key: String, value: i32 }, Commit(u32) }
fn put(tx: u32, key: &str, value: i32) -> Record { Record::Put { tx, key: key.into(), value } }
`;
  const goWalTypes = `type Record struct { Tx int; Key string; Value int; Commit bool }
`;
  pair(121, {
    topic: 'WAL y recuperación', title: 'Recuperar solo transacciones completas',
    intro: 'El disco simulado conserva solo los primeros durable registros. Las transacciones pueden intercalarse; cada COMMIT publica todos los PUT pendientes de su ID, en ese punto del log.',
    why: 'Un PUT durable pero sin su COMMIT no es una transacción recuperable. Los buffers por ID separan preparación de publicación y evitan mezclar transacciones intercaladas.',
    objective: 'Reconstruí clave→entero desde el prefijo durable. Cada PUT reemplaza la escritura pendiente de esa clave para su transacción; cada COMMIT aplica y vacía ese buffer. Un COMMIT sin pendientes no cambia nada.',
    instructions: ['Rechazá durable fuera de 0…len(log). Ignorá completamente el sufijo perdido.', 'Las claves pueden estar vacías y los valores pueden ser cero. No uses esos valores como sentinelas.', 'No modifiques el log. Reutilizar un ID después de un commit empieza otro buffer; aquí no modelamos IDs persistentes globales.'],
    hints: ['Necesitás un map de transacción→map de escrituras pendientes, más el estado confirmado.', 'PUT cambia el buffer de su ID; COMMIT transfiere ese buffer al estado.', 'Al confirmar, eliminá el buffer de la transacción para que un commit repetido no reaplique datos viejos.'],
    review: {success: 'El replay distingue log presente de transacción comprometida. Los tests observan recuperación del prefijo dado; no prueban fsync, formato binario, atomicidad de disco ni protección contra corrupción.', pitfall: 'Aplicar PUT de inmediato publicaría transacciones incompletas; acumular todas las transacciones en un solo buffer confunde intercalados.'},
    transfer: 'Agregá registros binarios con longitud y checksum; ante un registro truncado, recuperá solo el prefijo válido.',
    prediction: q('El prefijo durable contiene PUT(tx=1,x=9), pero no COMMIT(1). ¿Qué recuperás para x?', ['9', 'Ningún valor confirmado por esa transacción', '0 obligatoriamente'], 1, 'Durabilidad del registro y compromiso de la transacción son condiciones distintas.'),
    sources: [{title: 'SQLite · mecanismo WAL', url: 'https://sqlite.org/wal.html'}]
  }, {
    starter: rustWalTypes + `fn recover_wal(log: &[Record], durable: usize) -> Result<BTreeMap<String,i32>, &'static str> {
    let prefix = log.get(..durable).ok_or("durable inválido")?;
    let mut state = BTreeMap::new();
    for record in prefix { if let Record::Put { key, value, .. } = record { state.insert(key.clone(), *value); } }
    Ok(state)
}`,
    solution: rustWalTypes + `fn recover_wal(log: &[Record], durable: usize) -> Result<BTreeMap<String,i32>, &'static str> {
    let prefix = log.get(..durable).ok_or("durable inválido")?;
    let mut state = BTreeMap::new();
    let mut pending: BTreeMap<u32,BTreeMap<String,i32>> = BTreeMap::new();
    for record in prefix {
        match record {
            Record::Put { tx, key, value } => { pending.entry(*tx).or_default().insert(key.clone(), *value); }
            Record::Commit(tx) => { if let Some(changes) = pending.remove(tx) { state.extend(changes); } }
        }
    }
    Ok(state)
}`,
    tests: [t('PUT sin commit no se publica', '{ let log = [put(1,"x",9),Record::Commit(1)]; recover_wal(&log,1).unwrap().is_empty() && recover_wal(&log,2).unwrap().get("x") == Some(&9) }', 'Distingue el corte antes y después del commit.', 'Publicá cambios solo al leer Commit dentro del prefijo.'), t('Intercalados y orden de commit', '{ let log = [put(1,"x",1),put(2,"x",2),Record::Commit(2),Record::Commit(1),put(3,"y",7)]; let out = recover_wal(&log,5).unwrap(); out.len() == 1 && out.get("x") == Some(&1) }', 'El orden de publicación es el orden de commit, no el último PUT global.', 'Cada transacción necesita su propio buffer.'), t('Cero, ID reutilizado y frontera inválida', '{ let log = [put(1,"",4),put(1,"",0),Record::Commit(1),put(2,"",8),Record::Commit(2),Record::Commit(1)]; recover_wal(&log,6).unwrap().get("") == Some(&8) && recover_wal(&log,0).unwrap().is_empty() && recover_wal(&log,7).is_err() }', 'Verifica vaciado tras commit, valores válidos vacíos y límites.', 'Un commit repetido no debe reaplicar escrituras ya confirmadas.')]
  }, {
    starter: goWalTypes + `func RecoverWAL(log []Record, durable int) (map[string]int,error) {
    if durable < 0 || durable > len(log) { return nil,fmt.Errorf("durable inválido") }
    state := make(map[string]int)
    for _,record := range log[:durable] { if !record.Commit { state[record.Key] = record.Value } }
    return state,nil
}`,
    solution: goWalTypes + `func RecoverWAL(log []Record, durable int) (map[string]int,error) {
    if durable < 0 || durable > len(log) { return nil,fmt.Errorf("durable inválido") }
    state := make(map[string]int)
    pending := make(map[int]map[string]int)
    for _,record := range log[:durable] {
        if record.Commit {
            for key,value := range pending[record.Tx] { state[key] = value }
            delete(pending,record.Tx)
        } else {
            if pending[record.Tx] == nil { pending[record.Tx] = make(map[string]int) }
            pending[record.Tx][record.Key] = record.Value
        }
    }
    return state,nil
}`,
    tests: [t('PUT sin commit no se publica', 'func() bool { log:=[]Record{{Tx:1,Key:"x",Value:9},{Tx:1,Commit:true}}; a,e1:=RecoverWAL(log,1); b,e2:=RecoverWAL(log,2); return e1==nil && len(a)==0 && e2==nil && b["x"]==9 }()', 'Distingue el corte antes y después del commit.', 'Publicá cambios solo al leer Commit dentro del prefijo.'), t('Intercalados y orden de commit', 'func() bool { log:=[]Record{{Tx:1,Key:"x",Value:1},{Tx:2,Key:"x",Value:2},{Tx:2,Commit:true},{Tx:1,Commit:true},{Tx:3,Key:"y",Value:7}}; out,err:=RecoverWAL(log,5); return err==nil && len(out)==1 && out["x"]==1 }()', 'El orden de publicación es el orden de commit, no el último PUT global.', 'Cada transacción necesita su propio buffer.'), t('Cero, commit repetido y frontera inválida', 'func() bool { log:=[]Record{{Tx:1,Key:"",Value:4},{Tx:1,Key:"",Value:0},{Tx:1,Commit:true},{Tx:2,Key:"",Value:8},{Tx:2,Commit:true},{Tx:1,Commit:true}}; a,e:=RecoverWAL(log,3); v,ok:=a[""]; b,e2:=RecoverWAL(log,6); empty,e3:=RecoverWAL(log,0); _,bad:=RecoverWAL(log,7); _,negative:=RecoverWAL(log,-1); return e==nil && ok && v==0 && e2==nil && b[""]==8 && e3==nil && len(empty)==0 && bad!=nil && negative!=nil }()', 'Verifica vaciado tras commit, valores válidos vacíos y límites.', 'Un commit repetido no debe reaplicar escrituras ya confirmadas.')]
  });

  const rustEntry = `use std::collections::BTreeMap;
#[derive(Clone,Debug,PartialEq)]
struct Entry { key: String, seq: u64, value: Option<String> }
fn entry(key:&str,seq:u64,value:Option<&str>) -> Entry { Entry { key:key.into(), seq, value:value.map(String::from) } }
`;
  const goEntry = `type Entry struct { Key string; Seq uint64; Value string; Deleted bool }
`;
  pair(122, {
    topic: 'LSM y tombstones', title: 'Compactar sin resucitar una clave',
    intro: 'Recibís entradas de varias tablas. Para cada clave gana la secuencia mayor; en un empate se conserva la primera entrada del slice. La salida queda ordenada por clave.',
    why: 'El tombstone más reciente debe ganar sobre un valor antiguo. El permiso de retirarlo viene del planificador: esta función no puede adivinar si hay versiones o snapshots fuera de su entrada.',
    objective: 'Compactá a una entrada por clave. Si drop_tombstones/dropTombstones es false, conservá los tombstones ganadores; si es true, retiralos después de elegir la versión más nueva.',
    instructions: ['La bandera true presupone que el llamador incluyó todas las versiones relevantes y que no hay snapshots que las necesiten.', 'No elimines tombstones antes de comparar secuencias: eso revelaría un valor anterior.', 'Conservá valores vacíos válidos y no modifiques el slice de entrada.'],
    hints: ['Elegí primero el ganador por clave, comparando secuencias con >.', 'Filtrá los ganadores borrados solo al final y solo con permiso.', 'BTreeMap en Rust o claves ordenadas en Go producen salida reproducible.'],
    review: {success: 'Separaste selección de versión y descarte autorizado. El test demuestra la lógica de merge bajo el contrato; no puede comprobar que el llamador haya incluido todas las SST o gestionado snapshots correctamente.', pitfall: 'Filtrar un tombstone antes del merge hace que la versión vieja vuelva a ganar.'},
    transfer: 'Reemplazá la entrada completa por iteradores de SST ordenadas y medí memoria sin cambiar el contrato.',
    prediction: q('Valor seq=4 y tombstone seq=9; no hay permiso para descartar. ¿Qué queda?', ['Valor seq=4', 'Nada', 'Tombstone seq=9'], 2, 'El borrado gana por secuencia y sigue siendo necesario para ocultar versiones externas.'),
    sources: [{title: 'RocksDB · Compaction', url: 'https://github.com/facebook/rocksdb/wiki/Compaction'}]
  }, {
    starter: rustEntry + `fn compact(entries:&[Entry], drop_tombstones:bool) -> Vec<Entry> {
    let mut latest = BTreeMap::new();
    for e in entries { if !drop_tombstones || e.value.is_some() { latest.insert(e.key.clone(),e.clone()); } }
    latest.into_values().collect()
}`,
    solution: rustEntry + `fn compact(entries:&[Entry], drop_tombstones:bool) -> Vec<Entry> {
    let mut latest: BTreeMap<String,Entry> = BTreeMap::new();
    for e in entries {
        if latest.get(&e.key).map_or(true, |old| e.seq > old.seq) { latest.insert(e.key.clone(),e.clone()); }
    }
    latest.into_values().filter(|e| !drop_tombstones || e.value.is_some()).collect()
}`,
    tests: [t('Mayor secuencia, no último elemento', '{ let input=[entry("z",9,Some("nuevo")),entry("a",2,Some("")),entry("z",1,Some("viejo"))]; compact(&input,false)==vec![entry("a",2,Some("")),entry("z",9,Some("nuevo"))] }', 'Fuerza orden estable y comparación de versiones.', 'El slice no necesariamente está ordenado por secuencia.'), t('El tombstone se filtra al final', '{ let input=[entry("x",3,Some("viejo")),entry("x",7,None)]; compact(&input,false)==vec![entry("x",7,None)] && compact(&input,true).is_empty() }', 'Evita revelar versiones antiguas al retirar el marcador.', 'Primero elegí seq7; recién después decidí si debe conservarse.'), t('Empates, vacío e independencia', '{ let input=[entry("x",5,Some("primero")),entry("x",5,Some("segundo"))]; let mut out=compact(&input,false); out[0].key.push_str("!"); compact(&[],true).is_empty() && input[0].key=="x" && out[0].value.as_deref()==Some("primero") }', 'Define empate e independencia de la salida.', 'Solo una secuencia estrictamente mayor reemplaza al ganador.')]
  }, {
    imports: ['sort'],
    starter: goEntry + `func Compact(entries []Entry, dropTombstones bool) []Entry {
    latest:=make(map[string]Entry)
    for _,e:=range entries { if !dropTombstones || !e.Deleted { latest[e.Key]=e } }
    keys:=make([]string,0,len(latest)); for key:=range latest { keys=append(keys,key) }; sort.Strings(keys)
    out:=make([]Entry,0,len(keys)); for _,key:=range keys { out=append(out,latest[key]) }; return out
}`,
    solution: goEntry + `func Compact(entries []Entry, dropTombstones bool) []Entry {
    latest:=make(map[string]Entry)
    for _,e:=range entries { old,exists:=latest[e.Key]; if !exists || e.Seq>old.Seq { latest[e.Key]=e } }
    keys:=make([]string,0,len(latest)); for key:=range latest { keys=append(keys,key) }; sort.Strings(keys)
    out:=make([]Entry,0,len(keys)); for _,key:=range keys { e:=latest[key]; if !dropTombstones || !e.Deleted { out=append(out,e) } }; return out
}`,
    tests: [t('Mayor secuencia, no último elemento', 'func() bool { input:=[]Entry{{Key:"z",Seq:9,Value:"nuevo"},{Key:"a",Seq:2,Value:""},{Key:"z",Seq:1,Value:"viejo"}}; out:=Compact(input,false); return len(out)==2 && out[0]==input[1] && out[1]==input[0] }()', 'Fuerza orden estable y comparación de versiones.', 'El slice no necesariamente está ordenado por secuencia.'), t('El tombstone se filtra al final', 'func() bool { input:=[]Entry{{Key:"x",Seq:3,Value:"viejo"},{Key:"x",Seq:7,Deleted:true}}; kept:=Compact(input,false); return len(kept)==1 && kept[0].Deleted && kept[0].Seq==7 && len(Compact(input,true))==0 }()', 'Evita revelar versiones antiguas al retirar el marcador.', 'Primero elegí seq7; recién después decidí si debe conservarse.'), t('Empates, vacío e independencia', 'func() bool { input:=[]Entry{{Key:"x",Seq:5,Value:"primero"},{Key:"x",Seq:5,Value:"segundo"}}; out:=Compact(input,false); if len(out)!=1 { return false }; out[0].Key="otro"; return out[0].Value=="primero" && input[0].Key=="x" && len(Compact(nil,true))==0 }()', 'Define empate e independencia de la salida.', 'Solo una secuencia estrictamente mayor reemplaza al ganador.')]
  });

  pair(123, {
    topic: 'Quórums e intersección', title: 'Lo que un quórum sí demuestra',
    intro: 'Antes de simular réplicas, comprobá la propiedad matemática que necesitás. Para membresía fija de N nodos, conjuntos de tamaños W y R deben intersectarse si W+R>N.',
    why: 'La desigualdad estricta deja afuera conjuntos disjuntos que justo suman N. Además, sumar enteros sin cuidado puede desbordar y cambiar una condición verdadera a falsa.',
    objective: 'Validá N>0 y 1≤W,R≤N. Devolvé si TODOS los conjuntos de esos tamaños deben intersectarse. Una configuración inválida devuelve error.',
    instructions: ['Trabajá con uint64/u64, incluyendo su máximo representable.', 'Evitá calcular W+R directamente: después de validar podés comparar W>N-R.', 'No presentes true como consenso o linealizabilidad: solo verifica intersección de conjuntos fijos.'],
    hints: ['Si W+R=N, todavía pueden ser dos conjuntos disjuntos.', 'Con R≤N, la resta N-R es segura.', 'La condición equivalente es W>N-R.'],
    review: {success: 'La función separa configuración inválida, falta de garantía de intersección e intersección garantizada. No evalúa versiones, escritores concurrentes, quórums flexibles ni protocolos de consenso.', pitfall: 'Intersección no elige un líder ni prueba que el valor seleccionado sea el más reciente.'},
    transfer: 'Enumerá todos los subconjuntos para N pequeño y verificá la fórmula contra una comprobación exhaustiva.',
    prediction: q('N=4, W=2, R=2: ¿la intersección está garantizada?', ['No: {A,B} y {C,D} son disjuntos', 'Sí, ambos son mayoría', 'Solo si los nodos usan Rust'], 0, 'Dos de cuatro no es mayoría estricta; la suma es N, no mayor que N.'),
    sources: [{title: 'Dynamo · quórums y replicación', url: 'https://www.allthingsdistributed.com/files/amazon-dynamo-sosp2007.pdf'}]
  }, {
    starter: `fn quorums_intersect(n:u64,w:u64,r:u64)->Result<bool,&'static str> {
    if n==0 || w==0 || r==0 || w>n || r>n { return Err("configuración inválida"); }
    Ok(w.saturating_add(r)>=n)
}`,
    solution: `fn quorums_intersect(n:u64,w:u64,r:u64)->Result<bool,&'static str> {
    if n==0 || w==0 || r==0 || w>n || r>n { return Err("configuración inválida"); }
    Ok(w>n-r)
}`,
    tests: [t('Intersección estricta', 'quorums_intersect(3,2,2)==Ok(true) && quorums_intersect(4,2,2)==Ok(false) && quorums_intersect(5,4,1)==Ok(false)', 'Detecta la frontera > frente a >=.', 'Sumar exactamente N no obliga a compartir un nodo.'), t('Configuraciones imposibles', 'quorums_intersect(0,0,0).is_err() && quorums_intersect(3,0,1).is_err() && quorums_intersect(3,1,0).is_err() && quorums_intersect(3,4,1).is_err() && quorums_intersect(3,1,4).is_err()', 'Requiere validar ambos tamaños y N.', 'Las precondiciones también hacen segura la resta.'), t('Sin overflow al máximo', 'quorums_intersect(u64::MAX,u64::MAX,u64::MAX)==Ok(true) && quorums_intersect(u64::MAX,1,u64::MAX)==Ok(true) && quorums_intersect(u64::MAX,1,u64::MAX-1)==Ok(false)', 'Comprueba la propiedad más allá de sumas representables.', 'No dependas de wrapping ni de saturación para decidir la desigualdad.')]
  }, {
    starter: `func QuorumsIntersect(n,w,r uint64)(bool,error) {
    if n==0 || w==0 || r==0 || w>n || r>n { return false,fmt.Errorf("configuración inválida") }
    return w+r>=n,nil
}`,
    solution: `func QuorumsIntersect(n,w,r uint64)(bool,error) {
    if n==0 || w==0 || r==0 || w>n || r>n { return false,fmt.Errorf("configuración inválida") }
    return w>n-r,nil
}`,
    tests: [t('Intersección estricta', 'func() bool { a,e1:=QuorumsIntersect(3,2,2); b,e2:=QuorumsIntersect(4,2,2); c,e3:=QuorumsIntersect(5,4,1); return e1==nil && a && e2==nil && !b && e3==nil && !c }()', 'Detecta la frontera > frente a >=.', 'Sumar exactamente N no obliga a compartir un nodo.'), t('Configuraciones imposibles', 'func() bool { for _,v:=range [][3]uint64{{0,0,0},{3,0,1},{3,1,0},{3,4,1},{3,1,4}} { _,e:=QuorumsIntersect(v[0],v[1],v[2]); if e==nil { return false } }; return true }()', 'Requiere validar ambos tamaños y N.', 'Las precondiciones también hacen segura la resta.'), t('Sin overflow al máximo', 'func() bool { max:=^uint64(0); a,e1:=QuorumsIntersect(max,max,max); b,e2:=QuorumsIntersect(max,1,max); c,e3:=QuorumsIntersect(max,1,max-1); return e1==nil && a && e2==nil && b && e3==nil && !c }()', 'Comprueba la propiedad más allá de sumas representables.', 'No dependas de wrapping para decidir la desigualdad.')]
  });

  pair(124, {
    topic: 'Relojes Lamport', title: 'El sello que nunca debe retroceder',
    intro: 'Un evento local incrementa el contador. Una recepción debe quedar después tanto del estado local como del sello recibido. Ninguno de estos números representa segundos.',
    why: 'Tomar solo remoto+1 puede hacer retroceder a un nodo adelantado. Permitir overflow también rompe la monotonía; rechazarlo forma parte del contrato.',
    objective: 'Para evento local devolvé local+1; para recepción, max(local,remoto)+1. Si no entra en 64 bits sin signo, devolvé ausencia/error.',
    instructions: ['En Rust, None como parámetro remoto significa evento local; en Go, isReceive=false significa que remote debe ignorarse.', 'Una recepción con sello igual también incrementa.', 'La función es pura: el llamador solo actualiza su reloj si recibió un resultado válido.'],
    hints: ['Elegí primero la base: local o el máximo.', 'Detectá el máximo representable antes de sumar.', 'Rust ofrece checked_add; en Go compará con ^uint64(0).'],
    review: {success: 'La transición conserva la monotonía bajo el rango del contador. Un sello menor no demuestra causalidad inversa; hacen falta vínculos de mensajes para interpretar una traza.', pitfall: 'No uses estos sellos para TTL, tiempos de espera ni leases. No miden duración física.'},
    transfer: 'Agregá ID de nodo para desempatar un orden total y explicá qué causalidad adicional no aparece por eso.',
    prediction: q('Local=12 y llega sello 4. ¿Resultado?', ['5', '12', '13'], 2, 'max(12,4)+1 preserva que la recepción sucede después del estado local y del envío.'),
    sources: [{title: 'Lamport · Time, Clocks, and the Ordering of Events', url: 'https://lamport.azurewebsites.net/pubs/time-clocks.pdf'}]
  }, {
    starter: `fn lamport(local:u64,remote:Option<u64>)->Option<u64> {
    remote.unwrap_or(local).checked_add(1)
}`,
    solution: `fn lamport(local:u64,remote:Option<u64>)->Option<u64> {
    let base=remote.map_or(local,|received|local.max(received));
    base.checked_add(1)
}`,
    tests: [t('Evento local', 'lamport(0,None)==Some(1) && lamport(8,None)==Some(9)', 'Define el incremento local sin recepción.', 'None es ausencia de mensaje, no sello cero.'), t('Remoto menor, mayor e igual', 'lamport(12,Some(4))==Some(13) && lamport(2,Some(9))==Some(10) && lamport(5,Some(5))==Some(6)', 'La base debe incorporar ambos valores.', 'Usá max antes de sumar uno.'), t('Límite sin wrap', 'lamport(u64::MAX,None)==None && lamport(0,Some(u64::MAX))==None && lamport(u64::MAX,Some(0))==None && lamport(u64::MAX-1,None)==Some(u64::MAX)', 'Evita que un contador máximo vuelva a cero.', 'El error depende del máximo de ambos contadores, no solo del remoto.')]
  }, {
    starter: `func Lamport(local,remote uint64,isReceive bool)(uint64,error) {
    if isReceive { local=remote }
    if local==^uint64(0) { return 0,fmt.Errorf("overflow") }
    return local+1,nil
}`,
    solution: `func Lamport(local,remote uint64,isReceive bool)(uint64,error) {
    if isReceive && remote>local { local=remote }
    if local==^uint64(0) { return 0,fmt.Errorf("overflow") }
    return local+1,nil
}`,
    tests: [t('Evento local ignora remote', 'func() bool { a,e1:=Lamport(0,0,false); b,e2:=Lamport(8,^uint64(0),false); return e1==nil && a==1 && e2==nil && b==9 }()', 'Define el incremento local sin recepción.', 'remote no participa si isReceive es false.'), t('Remoto menor, mayor e igual', 'func() bool { a,e1:=Lamport(12,4,true); b,e2:=Lamport(2,9,true); c,e3:=Lamport(5,5,true); return e1==nil && a==13 && e2==nil && b==10 && e3==nil && c==6 }()', 'La base debe incorporar ambos valores.', 'Usá max antes de sumar uno.'), t('Límite sin wrap', 'func() bool { max:=^uint64(0); _,a:=Lamport(max,0,false); _,b:=Lamport(0,max,true); _,c:=Lamport(max,0,true); d,e:=Lamport(max-1,0,false); return a!=nil && b!=nil && c!=nil && e==nil && d==max }()', 'Evita que un contador máximo vuelva a cero.', 'El error depende del máximo de ambos contadores, no solo del remoto.')]
  });

  const rustFragments = `struct Fragment { index: usize, data: Vec<u8> }
fn fragment(index:usize,data:&[u8])->Fragment { Fragment { index, data:data.to_vec() } }
`;
  const goFragments = `type Fragment struct { Index int; Data []byte }
`;
  pair(125, {
    topic: 'Reensamblado de mensajes', title: 'Un mensaje, aunque llegue dos veces',
    intro: 'Recibís fragmentos de un único mensaje con índices 0…total-1. Pueden llegar en cualquier orden, faltar o repetirse. Un fragmento vacío también cuenta como recibido.',
    why: 'Presencia y contenido son datos diferentes. Guardar por índice permite detectar huecos, no duplicar bytes y verificar si una repetición realmente contiene la misma información.',
    objective: 'Reensamblá en orden de índice. Devolvé completo solo si están todos; un índice inválido, total >1024 o duplicado con bytes distintos devuelve error.',
    instructions: ['En Rust devolvé Ok(None) si faltan fragmentos y Ok(Some(bytes)) si está completo. En Go devolvé nil,false,nil si falta alguno; ante error devolvé nil,false,error.', 'total=0 con lista vacía es un mensaje completo vacío. En Go total negativo también es inválido.', 'Aceptá duplicados idénticos sin contarlos dos veces. No modifiques ni compartas el buffer de salida con los datos de entrada.'],
    hints: ['Reservá total slots y representá explícitamente si cada uno llegó.', 'Si un slot ya está ocupado, compará sus bytes antes de ignorar el duplicado.', 'Solo concatená después de validar todos los fragmentos y confirmar que no quedan huecos.'],
    review: {success: 'El resultado depende de identidades y contenido, no del orden ni cantidad bruta de paquetes. El límite de slots acota esta tabla; un servicio real también debe acotar bytes totales, mensajes simultáneos y su vida.', pitfall: 'len(fragmentos)==total no prueba completitud: puede haber duplicados y huecos. Un fragmento vacío no es un hueco.'},
    transfer: 'Agregá message_id y presupuesto de bytes; descartá mensajes incompletos mediante un reloj monotónico inyectado.',
    prediction: q('total=2; recibís #0=GO dos veces. ¿Está completo?', ['Sí, llegaron dos paquetes', 'No, todavía falta #1', 'Sí, el contenido es GOGO'], 1, 'La completitud depende de cubrir los índices, no de contar recepciones.'),
    sources: [{title: 'RFC 9000 · retransmisión de información', url: 'https://datatracker.ietf.org/doc/html/rfc9000#section-13.3'}]
  }, {
    starter: rustFragments + `fn assemble(total:usize,parts:&[Fragment])->Result<Option<Vec<u8>>,&'static str> {
    if total>1024 || parts.iter().any(|p|p.index>=total) { return Err("índice o total inválido"); }
    if parts.len()<total { return Ok(None); }
    Ok(Some(parts.iter().flat_map(|p|p.data.iter().copied()).collect()))
}`,
    solution: rustFragments + `fn assemble(total:usize,parts:&[Fragment])->Result<Option<Vec<u8>>,&'static str> {
    if total>1024 { return Err("total inválido"); }
    let mut slots:Vec<Option<Vec<u8>>>=vec![None;total];
    for part in parts {
        let slot=slots.get_mut(part.index).ok_or("índice inválido")?;
        if let Some(previous)=slot { if previous.as_slice()!=part.data.as_slice() { return Err("duplicado contradictorio"); } }
        else { *slot=Some(part.data.clone()); }
    }
    if slots.iter().any(Option::is_none) { return Ok(None); }
    let mut result=Vec::new();
    for slot in slots { result.extend(slot.unwrap()); }
    Ok(Some(result))
}`,
    tests: [t('Desorden, duplicado e independencia', '{ let parts=[fragment(2,b"ER"),fragment(0,b"GO"),fragment(1,b"PH"),fragment(0,b"GO")]; let mut out=assemble(3,&parts).unwrap().unwrap(); let correct=out==b"GOPHER"; out[0]=b\'X\'; correct && parts[1].data==b"GO" }', 'Comprueba orden, deduplicación y propiedad del resultado.', 'Guardá por índice antes de concatenar.'), t('Huecos y fragmentos vacíos', 'assemble(2,&[fragment(0,b"GO"),fragment(0,b"GO")])==Ok(None) && assemble(2,&[fragment(1,b""),fragment(0,&[0,255])])==Ok(Some(vec![0,255])) && assemble(0,&[])==Ok(Some(vec![]))', 'Distingue un slot vacío de un slot ausente.', 'Option representa presencia aunque el Vec de datos tenga longitud cero.'), t('Conflictos y límites', 'assemble(1,&[fragment(0,b"A"),fragment(0,b"B")]).is_err() && assemble(1,&[fragment(1,b"A")]).is_err() && assemble(0,&[fragment(0,b"")]).is_err() && assemble(1025,&[]).is_err()', 'Rechaza ambigüedad y tamaños fuera del presupuesto.', 'No sobrescribas un duplicado distinto ni reserves una tabla arbitrariamente grande.')]
  }, {
    starter: goFragments + `func Assemble(total int,parts []Fragment)([]byte,bool,error) {
    if total<0 || total>1024 { return nil,false,fmt.Errorf("total inválido") }
    for _,part:=range parts { if part.Index<0 || part.Index>=total { return nil,false,fmt.Errorf("índice inválido") } }
    if len(parts)<total { return nil,false,nil }
    var out []byte; for _,part:=range parts { out=append(out,part.Data...) }; return out,true,nil
}`,
    solution: goFragments + `func Assemble(total int,parts []Fragment)([]byte,bool,error) {
    if total<0 || total>1024 { return nil,false,fmt.Errorf("total inválido") }
    slots:=make([][]byte,total); seen:=make([]bool,total)
    for _,part:=range parts {
        if part.Index<0 || part.Index>=total { return nil,false,fmt.Errorf("índice inválido") }
        if seen[part.Index] {
            if string(slots[part.Index])!=string(part.Data) { return nil,false,fmt.Errorf("duplicado contradictorio") }
        } else { slots[part.Index]=part.Data; seen[part.Index]=true }
    }
    for _,present:=range seen { if !present { return nil,false,nil } }
    var out []byte; for _,part:=range slots { out=append(out,part...) }; return out,true,nil
}`,
    tests: [t('Desorden, duplicado e independencia', 'func() bool { parts:=[]Fragment{{2,[]byte("ER")},{0,[]byte("GO")},{1,[]byte("PH")},{0,[]byte("GO")}}; out,ok,err:=Assemble(3,parts); if err!=nil || !ok || string(out)!="GOPHER" { return false }; out[0]=88; return string(parts[1].Data)=="GO" }()', 'Comprueba orden, deduplicación y propiedad del resultado.', 'Guardá por índice antes de concatenar.'), t('Huecos y fragmentos vacíos', 'func() bool { a,ok,e:=Assemble(2,[]Fragment{{0,[]byte("GO")},{0,[]byte("GO")}}); b,ready,e2:=Assemble(2,[]Fragment{{1,nil},{0,[]byte{0,255}}}); c,empty,e3:=Assemble(0,nil); return e==nil && !ok && a==nil && e2==nil && ready && fmt.Sprint(b)=="[0 255]" && e3==nil && empty && len(c)==0 }()', 'Distingue un slot vacío de un slot ausente.', 'Usá un registro de presencia separado de los bytes.'), t('Conflictos y límites', 'func() bool { cases:=[]struct{n int;p []Fragment}{{1,[]Fragment{{0,[]byte("A")},{0,[]byte("B")}}},{1,[]Fragment{{1,nil}}},{1,[]Fragment{{-1,nil}}},{0,[]Fragment{{0,nil}}},{1025,nil},{-1,nil}}; for _,c:=range cases { out,ok,e:=Assemble(c.n,c.p); if e==nil || ok || out!=nil { return false } }; return true }()', 'Rechaza ambigüedad y tamaños fuera del presupuesto.', 'No sobrescribas un duplicado distinto ni reserves una tabla arbitrariamente grande.')]
  });

  const rustRing = `struct Ring { data:Vec<i32>, head:usize, len:usize }
impl Ring {
    fn new(capacity:usize)->Self { Self { data:vec![0;capacity],head:0,len:0 } }
    fn push(&mut self,value:i32)->bool {
        if self.len==self.data.len() { return false; }
        let index=(self.head+self.len)%self.data.len(); self.data[index]=value; self.len+=1; true
    }
`;
  const goRing = `type Ring struct { data []int; head,size int }
func NewRing(capacity int)*Ring { return &Ring{data:make([]int,capacity)} }
func(r *Ring)Push(value int)bool {
    if r.size==len(r.data) { return false }
    index:=(r.head+r.size)%len(r.data); r.data[index]=value; r.size++; return true
}
`;
  pair(126, {
    topic: 'Backpressure y buffers circulares', title: 'Una cola que reutiliza sus huecos',
    intro: 'La capacidad ya está reservada. Push rechaza cuando está lleno y Pop retira el elemento más antiguo. Un índice circular permite volver al inicio sin desplazar todos los valores.',
    why: 'head y longitud describen qué parte del almacenamiento contiene elementos válidos. El cero almacenado es un dato como cualquier otro, no un indicador de slot vacío.',
    objective: 'Repará Pop/pop para mantener FIFO, liberar un slot y devolver ausencia al estar vacío. Conservá NewRing/new y Push/push provistos.',
    kind: 'reparar',
    instructions: ['Capacidad no negativa; cero es válida y siempre rechaza Push. Una operación rechazada no modifica la cola.', 'Pop lee en head, avanza head con módulo y reduce longitud, solo si había un elemento.', 'El núcleo es local y no concurrente: no afirma seguridad entre threads o goroutines.'],
    hints: ['La última posición insertada corresponde a una pila, no una cola.', 'El elemento más antiguo está en head.', 'Después de leer, head=(head+1)%capacidad; comprobá vacío antes del módulo.'],
    review: {success: 'La cola conserva FIFO a través del wrap-around y mantiene el límite sin crecer. Rechazar una inserción comunica saturación; el llamador todavía debe decidir esperar, reintentar o descartar explícitamente.', pitfall: 'Capacidad acotada no significa que todo el pipeline use esa misma cantidad de memoria: también hay trabajo activo y productores con datos pendientes.'},
    transfer: 'Generalizá el buffer sin exigir que sus valores sean Copy y definí cómo se liberan recursos al retirar elementos.',
    prediction: q('Capacidad2: push1,push2,pop,push3. ¿Qué queda en orden?', ['3,2', '2,3', '1,3'], 1, 'Pop retira1; el slot liberado se reutiliza para3, pero2 sigue siendo el más antiguo.'),
    sources: [{title: 'Go · pipelines y coordinación', url: 'https://go.dev/blog/pipelines'}]
  }, {
    starter: rustRing + `    fn pop(&mut self)->Option<i32> {
        if self.len==0 { return None; }
        let index=(self.head+self.len-1)%self.data.len(); let value=self.data[index]; self.len-=1; Some(value)
    }
}`,
    solution: rustRing + `    fn pop(&mut self)->Option<i32> {
        if self.len==0 { return None; }
        let value=self.data[self.head]; self.head=(self.head+1)%self.data.len(); self.len-=1; Some(value)
    }
}`,
    tests: [t('FIFO a través del wrap', '{ let mut r=Ring::new(2); r.push(1) && r.push(2) && r.pop()==Some(1) && r.push(3) && r.pop()==Some(2) && r.pop()==Some(3) && r.pop()==None }', 'La reutilización física no cambia el orden lógico.', 'Pop debe avanzar head, no leer el último insertado.'), t('Rechazo conserva lo anterior', '{ let mut r=Ring::new(2); r.push(0) && r.push(-7) && !r.push(99) && r.pop()==Some(0) && r.pop()==Some(-7) && r.pop()==None }', 'Un Push fallido no sobrescribe elementos ni confunde cero con vacío.', 'La longitud define presencia, no el valor de una celda.'), t('Capacidades cero y uno', '{ let mut zero=Ring::new(0); let mut one=Ring::new(1); !zero.push(1) && zero.pop()==None && one.push(4) && !one.push(8) && one.pop()==Some(4) && one.push(8) && one.pop()==Some(8) }', 'Prueba guardas antes de módulo y reutilización mínima.', 'No calcules un módulo por cero cuando la cola no tiene capacidad.')]
  }, {
    starter: goRing + `func(r *Ring)Pop()(int,bool) {
    if r.size==0 { return 0,false }
    index:=(r.head+r.size-1)%len(r.data); value:=r.data[index]; r.size--; return value,true
}`,
    solution: goRing + `func(r *Ring)Pop()(int,bool) {
    if r.size==0 { return 0,false }
    value:=r.data[r.head]; r.head=(r.head+1)%len(r.data); r.size--; return value,true
}`,
    tests: [t('FIFO a través del wrap', 'func() bool { r:=NewRing(2); if !r.Push(1)||!r.Push(2) { return false }; a,ok:=r.Pop(); if !ok||a!=1||!r.Push(3) { return false }; b,x:=r.Pop(); c,y:=r.Pop(); _,z:=r.Pop(); return x&&y&&!z&&b==2&&c==3 }()', 'La reutilización física no cambia el orden lógico.', 'Pop debe avanzar head, no leer el último insertado.'), t('Rechazo conserva lo anterior', 'func() bool { r:=NewRing(2); if !r.Push(0)||!r.Push(-7)||r.Push(99) { return false }; a,x:=r.Pop(); b,y:=r.Pop(); _,z:=r.Pop(); return x&&y&&!z&&a==0&&b==-7 }()', 'Un Push fallido no sobrescribe elementos ni confunde cero con vacío.', 'La longitud define presencia, no el valor de una celda.'), t('Capacidades cero y uno', 'func() bool { zero:=NewRing(0); if zero.Push(1) { return false }; _,ok:=zero.Pop(); if ok { return false }; one:=NewRing(1); if !one.Push(4)||one.Push(8) { return false }; a,x:=one.Pop(); if !x||a!=4||!one.Push(8) { return false }; b,y:=one.Pop(); return y&&b==8 }()', 'Prueba guardas antes de módulo y reutilización mínima.', 'No calcules un módulo por cero cuando la cola no tiene capacidad.')]
  });

  const rustBackend = `struct Backend { name:String, healthy:bool, open:bool, inflight:usize, limit:usize }
fn backend(name:&str,healthy:bool,open:bool,inflight:usize,limit:usize)->Backend { Backend { name:name.into(),healthy,open,inflight,limit } }
`;
  const goBackend = `type Backend struct { Name string; Healthy,Open bool; Inflight,Limit int }
`;
  pair(127, {
    topic: 'Balanceo y elegibilidad', title: 'Elegí un destino que sí puede trabajar',
    intro: 'La selección recibe una foto de los backends. Primero filtra nodos sanos, con circuito cerrado y cupo; después elige menor cantidad de peticiones activas, con desempate por nombre.',
    why: 'Elegir la carga mínima de todos los nodos puede dirigir trabajo a un servidor caído. Separar selección pura y reserva de cupo permite probar la política, aunque la reserva concurrente requiera coordinación.',
    objective: 'Devolvé el nombre del backend elegible con menor inflight. Ante empate elegí el nombre lexicalmente menor; si no hay candidato, devolvé ausencia.',
    instructions: ['Elegible significa healthy, !open, limit>0 e inflight<limit. En Go inflight negativo también debe excluirse.', 'Los nombres son únicos y no vacíos. Compará carga absoluta, no proporción respecto del límite.', 'No modifiques los backends ni incrementes inflight: esta función solo decide.'],
    hints: ['Mantené un candidato opcional y descartá antes los no elegibles.', 'Reemplazalo por carga menor o por nombre menor si hay empate.', 'El orden del slice no es una regla de desempate.'],
    review: {success: 'La decisión es reproducible y respeta tres filtros distintos. Los tests no prueban que dos llamadas concurrentes no elijan el mismo cupo; la reserva debe coordinarse con la selección en un sistema real.', pitfall: 'Un health check sano no garantiza que la próxima petición funcione. Un circuit breaker tampoco reemplaza límites de recursos o métricas.'},
    transfer: 'Implementá selección+reserva atómica y medí cómo se comporta una política de menor carga frente a cargas largas y cortas.',
    prediction: q('A está sano pero lleno; B está sano y libre; C tiene carga cero pero circuito abierto. ¿Quién entra?', ['A', 'B', 'C'], 1, 'Solo B cumple todas las condiciones antes de comparar cargas.'),
    sources: [{title: 'Envoy · load balancing', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/overview'}, {title: 'Envoy · circuit breaking y cupos', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/circuit_breaking'}]
  }, {
    starter: rustBackend + `fn pick_backend(nodes:&[Backend])->Option<String> {
    nodes.iter().min_by_key(|n|n.inflight).map(|n|n.name.clone())
}`,
    solution: rustBackend + `fn pick_backend(nodes:&[Backend])->Option<String> {
    let mut best:Option<&Backend>=None;
    for node in nodes {
        if !node.healthy || node.open || node.limit==0 || node.inflight>=node.limit { continue; }
        if best.map_or(true,|old|node.inflight<old.inflight || (node.inflight==old.inflight && node.name<old.name)) { best=Some(node); }
    }
    best.map(|n|n.name.clone())
}`,
    tests: [t('Filtrar antes de elegir', 'pick_backend(&[backend("A",false,false,0,4),backend("B",true,false,1,4),backend("C",true,true,0,4)])==Some("B".into())', 'Impide que carga baja oculte un backend no elegible.', 'Salud y circuito se revisan antes de la comparación.'), t('Menor carga y empate por nombre', '{ let nodes=[backend("Z",true,false,1,10),backend("A",true,false,1,2),backend("M",true,false,2,9)]; pick_backend(&nodes)==Some("A".into()) && nodes[1].inflight==1 && pick_backend(&[backend("A",true,false,2,9),backend("Z",true,false,1,2)])==Some("Z".into()) }', 'Comprueba desempate estable, carga absoluta y ausencia de mutación.', 'El nombre desempata solo cuando las cargas son iguales.'), t('Sin capacidad ni nodos', 'pick_backend(&[])==None && pick_backend(&[backend("A",true,false,2,2),backend("B",true,false,0,0),backend("C",true,false,3,2)])==None', 'Define ausencia de candidatos y límites inclusivos.', 'Estar exactamente al límite significa no tener cupo.')]
  }, {
    starter: goBackend + `func PickBackend(nodes []Backend)(string,bool) {
    if len(nodes)==0 { return "",false }; best:=nodes[0]
    for _,node:=range nodes[1:] { if node.Inflight<best.Inflight { best=node } }; return best.Name,true
}`,
    solution: goBackend + `func PickBackend(nodes []Backend)(string,bool) {
    var best Backend; found:=false
    for _,node:=range nodes {
        if !node.Healthy || node.Open || node.Limit<=0 || node.Inflight<0 || node.Inflight>=node.Limit { continue }
        if !found || node.Inflight<best.Inflight || (node.Inflight==best.Inflight && node.Name<best.Name) { best=node; found=true }
    }
    return best.Name,found
}`,
    tests: [t('Filtrar antes de elegir', 'func() bool { name,ok:=PickBackend([]Backend{{"A",false,false,0,4},{"B",true,false,1,4},{"C",true,true,0,4}}); return ok&&name=="B" }()', 'Impide que carga baja oculte un backend no elegible.', 'Salud y circuito se revisan antes de la comparación.'), t('Menor carga y empate por nombre', 'func() bool { nodes:=[]Backend{{"Z",true,false,1,10},{"A",true,false,1,2},{"M",true,false,2,9}}; a,x:=PickBackend(nodes); b,y:=PickBackend([]Backend{{"A",true,false,2,9},{"Z",true,false,1,2}}); return x&&a=="A"&&nodes[1].Inflight==1&&y&&b=="Z" }()', 'Comprueba desempate estable, carga absoluta y ausencia de mutación.', 'El nombre desempata solo cuando las cargas son iguales.'), t('Sin capacidad ni nodos', 'func() bool { a,x:=PickBackend(nil); b,y:=PickBackend([]Backend{{"A",true,false,2,2},{"B",true,false,0,0},{"C",true,false,3,2},{"D",true,false,-1,2}}); return !x&&a==""&&!y&&b=="" }()', 'Define ausencia de candidatos y límites inclusivos.', 'Estar exactamente al límite significa no tener cupo.')]
  });

  const rustTokens = `#[derive(Clone)]
struct Token { position:u32, node:String }
fn token(position:u32,node:&str)->Token { Token { position,node:node.into() } }
`;
  const goTokens = `type Token struct { Position uint32; Node string }
`;
  pair(128, {
    topic: 'Anillo de hash consistente', title: 'Buscá al dueño después del último token',
    intro: 'Los hashes ya están calculados. Cada token posee los hashes mayores que el token anterior y menores o iguales al propio; después del último token, el anillo vuelve al primero.',
    why: 'Ordenar una copia conserva la configuración del llamador. Rechazar posiciones duplicadas evita que el dueño de un hash dependa accidentalmente del orden de entrada.',
    objective: 'Devolvé el nodo del primer token con posición ≥ hash; si no existe, el del token mínimo. Rechazá anillo vacío, posiciones duplicadas o nombres vacíos.',
    instructions: ['La entrada puede estar desordenada y no debe modificarse.', 'Un mismo nodo puede tener varios tokens distintos; eso permite virtual nodes. Una posición repetida es inválida aunque repita el nodo.', 'Validá todo el anillo antes de devolver, incluso si el primer candidato ya parece suficiente.'],
    hints: ['Cloná los tokens y ordenalos por posición.', 'Buscá posiciones repetidas en vecinos y validá nombres.', 'Si no encontrás posición ≥ hash, elegí la primera de la copia ordenada.'],
    review: {success: 'La propiedad queda definida en las fronteras y no depende del orden del slice. Esto calcula destinos, no migra valores, replica datos ni demuestra distribución uniforme de carga.', pitfall: 'Agregar un nodo cambia un dueño lógico; los bytes todavía pueden estar en el servidor anterior. La transición de membresía requiere un protocolo adicional.'},
    transfer: 'Agregá virtual nodes y compará dispersión de carga sobre una muestra grande de hashes reproducibles.',
    prediction: q('Tokens 10/A,40/B,70/C. ¿Hash 40 pertenece a…?', ['A', 'B', 'C'], 1, 'El límite derecho es inclusivo: el primer token ≥40 es 40/B.'),
    sources: [{title: 'Envoy · Ring hash', url: 'https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers#ring-hash'}]
  }, {
    starter: rustTokens + `fn owner(ring:&[Token],hash:u32)->Result<String,&'static str> {
    let mut sorted=ring.to_vec(); sorted.sort_by_key(|t|t.position);
    let _=hash; sorted.first().map(|t|t.node.clone()).ok_or("anillo vacío")
}`,
    solution: rustTokens + `fn owner(ring:&[Token],hash:u32)->Result<String,&'static str> {
    if ring.is_empty() { return Err("anillo vacío"); }
    let mut sorted=ring.to_vec(); sorted.sort_by_key(|t|t.position);
    if sorted.iter().any(|t|t.node.is_empty()) || sorted.windows(2).any(|w|w[0].position==w[1].position) { return Err("anillo ambiguo"); }
    Ok(sorted.iter().find(|t|t.position>=hash).unwrap_or(&sorted[0]).node.clone())
}`,
    tests: [t('Fronteras, desorden y vuelta', '{ let ring=[token(70,"C"),token(10,"A"),token(40,"B")]; owner(&ring,10)==Ok("A".into()) && owner(&ring,11)==Ok("B".into()) && owner(&ring,40)==Ok("B".into()) && owner(&ring,71)==Ok("A".into()) && ring[0].position==70 }', 'Comprueba límite inclusivo, wrap e independencia del orden.', 'Elegí >=; cuando no existe, volvé al mínimo.'), t('Validar todo el anillo', 'owner(&[],0).is_err() && owner(&[token(1,"A"),token(9,"B"),token(9,"C")],0).is_err() && owner(&[token(1,"A"),token(9,"")],0).is_err()', 'Un candidato temprano no autoriza a ignorar ambigüedades posteriores.', 'Validá duplicados y nombres antes de buscar el dueño.'), t('Nuevo intervalo y virtual nodes', '{ let ring=[token(10,"A"),token(25,"D"),token(40,"B"),token(70,"C")]; owner(&ring,15)==Ok("D".into()) && owner(&ring,30)==Ok("B".into()) && owner(&ring,5)==Ok("A".into()) && owner(&[token(10,"A"),token(90,"A")],80)==Ok("A".into()) }', 'Agregar un token cambia su intervalo; repetir nodo en otro token sí es válido.', 'Distinguí duplicar posición de asignar varias posiciones al mismo nodo.')]
  }, {
    imports: ['sort'],
    starter: goTokens + `func Owner(ring []Token,hash uint32)(string,error) {
    if len(ring)==0 { return "",fmt.Errorf("anillo vacío") }
    sorted:=append([]Token(nil),ring...); sort.Slice(sorted,func(i,j int)bool{return sorted[i].Position<sorted[j].Position})
    return sorted[0].Node,nil
}`,
    solution: goTokens + `func Owner(ring []Token,hash uint32)(string,error) {
    if len(ring)==0 { return "",fmt.Errorf("anillo vacío") }
    sorted:=append([]Token(nil),ring...); sort.Slice(sorted,func(i,j int)bool{return sorted[i].Position<sorted[j].Position})
    for i,t:=range sorted { if t.Node=="" || (i>0 && sorted[i-1].Position==t.Position) { return "",fmt.Errorf("anillo ambiguo") } }
    for _,t:=range sorted { if t.Position>=hash { return t.Node,nil } }
    return sorted[0].Node,nil
}`,
    tests: [t('Fronteras, desorden y vuelta', 'func() bool { ring:=[]Token{{70,"C"},{10,"A"},{40,"B"}}; for _,c:=range []struct{h uint32;want string}{{10,"A"},{11,"B"},{40,"B"},{71,"A"}} { got,e:=Owner(ring,c.h); if e!=nil||got!=c.want { return false } }; return ring[0].Position==70 }()', 'Comprueba límite inclusivo, wrap e independencia del orden.', 'Elegí >=; cuando no existe, volvé al mínimo.'), t('Validar todo el anillo', 'func() bool { for _,ring:=range [][]Token{nil,{{1,"A"},{9,"B"},{9,"C"}},{{1,"A"},{9,""}}} { got,e:=Owner(ring,0); if e==nil||got!="" { return false } }; return true }()', 'Un candidato temprano no autoriza a ignorar ambigüedades posteriores.', 'Validá duplicados y nombres antes de buscar el dueño.'), t('Nuevo intervalo y virtual nodes', 'func() bool { ring:=[]Token{{10,"A"},{25,"D"},{40,"B"},{70,"C"}}; for _,c:=range []struct{h uint32;want string}{{15,"D"},{30,"B"},{5,"A"}} { got,e:=Owner(ring,c.h); if e!=nil||got!=c.want { return false } }; name,e:=Owner([]Token{{10,"A"},{90,"A"}},80); return e==nil&&name=="A" }()', 'Agregar un token cambia su intervalo; repetir nodo en otro token sí es válido.', 'Distinguí duplicar posición de asignar varias posiciones al mismo nodo.')]
  });

  window.SYSTEMS_INFRA_LABS = labs;
})();
