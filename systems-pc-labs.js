/* Integrated memory cores: no host paging or real interrupt instructions. */
window.SYSTEMS_PC_LABS = (() => {
  'use strict';
  const workshop = window.SYSTEMS_PC.workshops[0];
  const common = {
    stage: 49,
    level: workshop.level,
    kind: 'completar',
    minutes: 25,
    visual: 'flow',
    imports: [],
    topic: workshop.title,
    title: 'Núcleo · Una instrucción llega hasta la RAM',
    intro:
      'Ya sabés traducir direcciones. Ahora conectá esa traducción con sus efectos: una instrucción puede completar, necesitar un mapeo y reintento, o terminar por protección. La traza hace visible el recorrido; no usa la MMU de tu computadora.',
    why: 'Una ausencia no debe consumir la instrucción ni confirmar su escritura. El kernel resuelve una causa autorizada, vuelve al mismo acceso y recién entonces la CPU puede retirarlo. Un permiso insuficiente no se arregla concediendo W automáticamente.',
    objective:
      'Simulá accesos secuenciales con páginas de 4 celdas. RAM inicial=[10,11,12,13,20,21,22,23,0,0,0,0]. VPN 0→marco 1 R; VPN 1→marco 0 RW; VPN 2 ausente y demand-zero válida. TLB inicialmente vacía, sin expulsiones. Devolvé (RAM final, acumulador inicialmente 0, accesos retirados, traza). Leer carga el acumulador; escribir lo conserva. Ante dirección fuera de [0,12), agregá range y detené todo. En un miss agregá miss: si la PTE existe agregá walk y cacheala; si falta agregá fault,map,retry, mapeá VPN 2→marco 2 RW con ceros y repetí el MISMO acceso (generará otro miss). En un hit agregá hit. Después comprobá permisos: STORE en R agrega protection y detiene sin escribir ni retirar. Un acceso permitido agrega load o store y se retira una vez. Detener conserva los efectos previos; ignora accesos posteriores.',
    instructions: [
      'Representá tabla y TLB por separado, ambas con marco y permiso de escritura. La entrada ausente no es un marco cero.',
      'Usá un reintento explícito solo para la VPN 2 ausente. Su mapeo se hace una vez; no hay bucle ilimitado.',
      'Validá rango y permiso antes de tocar RAM. Mantené orden exacto de los eventos y no incrementes retiradas en fallos.',
    ],
    hints: [
      'Cada entrada puede ser opcional. Tabla y TLB son tres lugares; el offset es VA % 4.',
      'En el miss de VPN 2, inicializá marco 2, publicá la entrada e iterá otra vez sin avanzar el índice del acceso.',
      'Tras hit/walk: rechazá si es escritura y !write. Si está permitido calculá frame*4+offset, ejecutá, sumá una retirada y salí del bucle interno.',
    ],
    review: {
      success:
        'Los casos comprueban miss→walk→RAM, hit, fault→map→retry y protección que conserva efectos anteriores. La traza prueba el protocolo observable de este contrato; no mide ciclos ni valida una CPU física.',
      pitfall:
        'No confundas TLB miss con page fault. La traza del primer acceso demand-zero tiene DOS misses: uno descubre la ausencia y el reintento vuelve a buscar. Una escritura protegida puede encontrar una traducción válida y aun así no estar autorizada.',
    },
    transfer:
      'En tu proyecto, reemplazá los strings de eventos por un enum/tipo y agregá PC explícito, timer pendiente, trap frame y ACK. Una IRQ entre instrucciones debe guardar la continuación; un fault conserva el acceso fallido.',
    prediction: {
      question:
        'La VPN 2 está ausente. Su primer acceso se resuelve con mapeo, invalidación y reintento, como exige este contrato. ¿Cuántos misses aparecen antes de completar?',
      options: [
        'Cero, el kernel evita la TLB',
        'Uno: el reintento es siempre hit',
        'Dos: primero detecta la ausencia y luego consulta el mapeo nuevo',
      ],
      answer: 2,
      explanation:
        'El mapeo actualiza la tabla, no llena automáticamente la TLB. Reintentar produce miss→walk y después completa. Otras arquitecturas pueden organizar pasos internos de otra manera; este es el protocolo especificado.',
    },
    sources: workshop.sources,
  };
  const test = (id, label, expression, why, failure) => ({ id, label, expression, why, failure });
  const rust = {
    ...common,
    id: 'rust-137',
    language: 'rust',
    topicId: 'rust-systems-pc',
    starter: `fn ejecutar_pc(accesos: &[(u8, Option<u8>)]) -> ([u8; 12], u8, usize, Vec<&'static str>) {
    // None = LOAD; Some(valor) = STORE.
    todo!("conectar TLB, PTE, permisos, RAM y reintento")
}`,
    solution: `fn ejecutar_pc(accesos: &[(u8, Option<u8>)]) -> ([u8; 12], u8, usize, Vec<&'static str>) {
    let mut ram = [10,11,12,13,20,21,22,23,0,0,0,0];
    let mut tabla = [Some((1usize, false)), Some((0usize, true)), None];
    let mut tlb: [Option<(usize, bool)>; 3] = [None; 3];
    let (mut acc, mut retiradas) = (0, 0);
    let mut traza = Vec::new();
    'programa: for &(va, valor) in accesos {
        if va >= 12 { traza.push("range"); break; }
        let pagina = va as usize / 4;
        loop {
            let (marco, escritura) = if let Some(entrada) = tlb[pagina] {
                traza.push("hit"); entrada
            } else {
                traza.push("miss");
                if let Some(entrada) = tabla[pagina] {
                    traza.push("walk"); tlb[pagina] = Some(entrada); entrada
                } else {
                    traza.push("fault");
                    ram[8..12].fill(0);
                    tabla[pagina] = Some((2, true)); tlb[pagina] = None;
                    traza.push("map"); traza.push("retry"); continue;
                }
            };
            if valor.is_some() && !escritura {
                traza.push("protection"); break 'programa;
            }
            let fisica = marco * 4 + va as usize % 4;
            if let Some(nuevo) = valor { ram[fisica] = nuevo; traza.push("store"); }
            else { acc = ram[fisica]; traza.push("load"); }
            retiradas += 1; break;
        }
    }
    (ram, acc, retiradas, traza)
}`,
    tests: [
      test(
        't1',
        'Walk normal y luego hit sin kernel',
        `{ let (ram,acc,n,t)=ejecutar_pc(&[(1,None),(2,None)]); ram==[10,11,12,13,20,21,22,23,0,0,0,0] && acc==22 && n==2 && t==vec!["miss","walk","load","hit","load"] }`,
        'Dos direcciones de una página comparten traducción; ninguna lectura cambia RAM.',
        'No vuelvas a caminar la tabla en un hit ni confundas VA con PA.',
      ),
      test(
        't2',
        'Demand-zero, reintento y escritura posterior',
        `{ let (ram,acc,n,t)=ejecutar_pc(&[(9,None),(10,Some(77)),(10,None)]); ram==[10,11,12,13,20,21,22,23,0,0,77,0] && acc==77 && n==3 && t==vec!["miss","fault","map","retry","miss","walk","load","hit","store","hit","load"] }`,
        'La ausencia no retira una instrucción extra; el mapeo no borra una escritura posterior.',
        'El reintento debe hacer otro miss y luego poblar TLB; mapeá solo al encontrar la PTE ausente.',
      ),
      test(
        't3',
        'Protección conserva efectos previos y corta el programa',
        `{ let (ram,acc,n,t)=ejecutar_pc(&[(5,Some(44)),(1,Some(99)),(5,Some(88))]); let (r,a,k,e)=ejecutar_pc(&[(12,None),(1,None)]); let (_,z,v,q)=ejecutar_pc(&[]); ram==[10,44,12,13,20,21,22,23,0,0,0,0] && acc==0 && n==1 && t==vec!["miss","walk","store","miss","walk","protection"] && r==[10,11,12,13,20,21,22,23,0,0,0,0] && a==0 && k==0 && e==vec!["range"] && z==0 && v==0 && q.is_empty() }`,
        'El rechazo no revierte escrituras válidas anteriores ni ejecuta las posteriores. Rango inválido y entrada vacía tienen salida definida.',
        'La protección termina el bucle externo antes de modificar RAM o sumar una retirada.',
      ),
    ],
  };
  const go = {
    ...common,
    id: 'go-137',
    language: 'go',
    topicId: 'go-systems-pc',
    imports: ['reflect'],
    starter: `type AccesoPC struct { VA int; Escribir bool; Valor byte }

func EjecutarPC(accesos []AccesoPC) ([]byte, byte, int, []string) {
    return nil, 0, 0, nil
}`,
    solution: `type AccesoPC struct { VA int; Escribir bool; Valor byte }

func EjecutarPC(accesos []AccesoPC) ([]byte, byte, int, []string) {
    type entrada struct { marco int; escribir, presente bool }
    ram := []byte{10,11,12,13,20,21,22,23,0,0,0,0}
    tabla := [3]entrada{{1,false,true},{0,true,true},{}}
    tlb := [3]entrada{}
    var acc byte
    retiradas := 0
    traza := []string{}
programa:
    for _, acceso := range accesos {
        if acceso.VA < 0 || acceso.VA >= 12 { traza=append(traza,"range"); break }
        pagina := acceso.VA / 4
        for {
            e := tlb[pagina]
            if e.presente { traza=append(traza,"hit") } else {
                traza=append(traza,"miss")
                e=tabla[pagina]
                if e.presente {
                    traza=append(traza,"walk"); tlb[pagina]=e
                } else {
                    traza=append(traza,"fault")
                    for i:=8; i<12; i++ { ram[i]=0 }
                    tabla[pagina]=entrada{2,true,true}; tlb[pagina]=entrada{}
                    traza=append(traza,"map","retry"); continue
                }
            }
            if acceso.Escribir && !e.escribir {
                traza=append(traza,"protection"); break programa
            }
            fisica:=e.marco*4+acceso.VA%4
            if acceso.Escribir { ram[fisica]=acceso.Valor; traza=append(traza,"store") } else {
                acc=ram[fisica]; traza=append(traza,"load")
            }
            retiradas++; break
        }
    }
    return ram, acc, retiradas, traza
}`,
    tests: [
      test(
        't1',
        'Walk normal y luego hit sin kernel',
        `func() bool { r,a,n,t:=EjecutarPC([]AccesoPC{{VA:1},{VA:2}}); return reflect.DeepEqual(r,[]byte{10,11,12,13,20,21,22,23,0,0,0,0}) && a==22 && n==2 && reflect.DeepEqual(t,[]string{"miss","walk","load","hit","load"}) }()`,
        'Dos direcciones de una página comparten traducción; ninguna lectura cambia RAM.',
        'La dirección física viene del marco, no de la VPN.',
      ),
      test(
        't2',
        'Demand-zero, reintento y escritura posterior',
        `func() bool { r,a,n,t:=EjecutarPC([]AccesoPC{{VA:9},{VA:10,Escribir:true,Valor:77},{VA:10}}); return reflect.DeepEqual(r,[]byte{10,11,12,13,20,21,22,23,0,0,77,0}) && a==77 && n==3 && reflect.DeepEqual(t,[]string{"miss","fault","map","retry","miss","walk","load","hit","store","hit","load"}) }()`,
        'El reintento no suma un acceso retirado; la escritura posterior sobrevive a los hits.',
        'Una entrada válida debe llevar presente=true. No inicialices el marco en cada acceso.',
      ),
      test(
        't3',
        'Protección, rango inválido y vacío',
        `func() bool { r,a,n,t:=EjecutarPC([]AccesoPC{{VA:5,Escribir:true,Valor:44},{VA:1,Escribir:true,Valor:99},{VA:5,Escribir:true,Valor:88}}); if !reflect.DeepEqual(r,[]byte{10,44,12,13,20,21,22,23,0,0,0,0}) || a!=0 || n!=1 || !reflect.DeepEqual(t,[]string{"miss","walk","store","miss","walk","protection"}) { return false }; for _,va:=range []int{-1,12} { r,a,n,t=EjecutarPC([]AccesoPC{{VA:va},{VA:1}}); if !reflect.DeepEqual(r,[]byte{10,11,12,13,20,21,22,23,0,0,0,0}) || a!=0 || n!=0 || !reflect.DeepEqual(t,[]string{"range"}) { return false } }; _,a,n,t=EjecutarPC(nil); return a==0 && n==0 && len(t)==0 }()`,
        'El rechazo conserva efectos previos; rango se valida antes de indexar y nil representa una traza vacía.',
        'El break por protección debe salir del programa entero, no solo del reintento interno.',
      ),
    ],
  };
  return [rust, go];
})();
