/* A deterministic teaching computer. No host memory, devices or native instructions. */
window.SYSTEMS_PC = (() => {
  'use strict';
  const copy = value => JSON.parse(JSON.stringify(value));
  const button = (action, label, value) => ({action, label, ...(value === undefined ? {} : {value: String(value)})});
  const metric = (label, value) => ({label, value: String(value)});
  const cell = (label, value, tone = 'muted') => ({label, value: String(value), tone});
  const log = (s, message) => { s.log = [...s.log, message].slice(-12); return s; };
  const normal = () => [{op:'LOAD',va:1},{op:'LOAD',va:2},{op:'LOAD',va:9},{op:'STORE',va:10,value:77},{op:'LOAD',va:10},{op:'HALT'}];
  const initial = () => ({program:normal(),scenario:'normal',pc:0,acc:0,phase:'fetch',mode:'user',instruction:null,translation:null,physical:null,
    ram:[10,11,12,13,20,21,22,23,0,0,0,0],table:[{frame:1,write:false},{frame:0,write:true},null],tlb:[null,null,null],
    irqPending:false,trap:null,retryPC:null,halted:false,hits:0,misses:0,faults:0,interrupts:0,retired:0,observed:{},log:['CPU lista: empezá con Un paso. Cada pulsación muestra una decisión, no un ciclo de hardware real.']});
  function fault(s, cause) {
    s.trap = {cause,pc:s.pc,acc:s.acc,mapped:false}; s.mode='kernel'; s.phase='fault'; s.faults++;
    if(cause==='protection') s.observed.protection=true;
    return log(s, cause==='absent' ? `PAGE FAULT síncrono en PC ${s.pc}: VPN ${Math.floor(s.instruction.va/4)} no está presente. No retiramos la instrucción ni cambiamos RAM.` : `FAULT de protección en PC ${s.pc}: STORE pidió escritura en una página R. RAM queda intacta, incluso si hubo TLB HIT.`);
  }
  const phaseLabels = {fetch:'CPU · frontera de instrucciones',tlb:'Consultar TLB',walk:'Caminar tabla de páginas',permission:'Comprobar permiso',memory:'Acceder a RAM',fault:'Kernel · resolver excepción',irq:'Kernel · atender timer',halt:'CPU detenida'};
  function architecture(s) {
    const shapes=[], ink='#f3efdb', green='#81d9a1', muted='#355044', gold='#edb566';
    const line=(x1,y1,x2,y2,color=muted)=>shapes.push({type:'line',x1,y1,x2,y2,stroke:color,strokeWidth:2});
    const text=(x,y,value,color=ink)=>shapes.push({type:'text',x,y,text:String(value),fill:color,fontSize:12});
    const box=(x,y,w,name,detail,active)=>{shapes.push({type:'rect',x,y,width:w,height:64,fill:active?'#2a503d':'#1b3327',stroke:active?green:muted,strokeWidth:2});text(x+10,y+23,name,active?green:ink);text(x+10,y+45,detail);};
    const arrow=(x1,y1,x2,y2)=>{line(x1,y1,x2,y2);if(y1===y2)shapes.push({type:'polygon',points:[[x2,y2],[x2-6,y2-4],[x2-6,y2+4]],fill:muted});};
    arrow(110,62,135,62);arrow(235,62,280,62);arrow(405,62,445,62);
    box(10,30,100,'CPU',`PC ${s.pc} · A ${s.acc}`,s.phase==='fetch');
    box(135,30,100,'TLB','traducción',s.phase==='tlb');
    box(280,30,125,'Permisos','LOAD / STORE',s.phase==='permission');
    box(445,30,105,'RAM',s.physical===null?'12 celdas':`PA ${s.physical}`,s.phase==='memory');
    line(185,94,185,145);line(245,145,300,94);text(145,126,'MISS → PTE',green);
    line(355,94,355,145,s.mode==='kernel'?gold:muted);
    box(140,145,115,'Tabla PTE','marco + R/W',s.phase==='walk');
    box(280,145,175,'Kernel educativo',s.trap?`causa: ${s.trap.cause}`:'map / ACK / retorno',s.mode==='kernel');
    box(10,145,115,'Timer',s.irqPending?'pendiente':'sin IRQ',s.irqPending);
    line(65,209,65,223);line(65,223,365,223);line(365,223,365,209);arrow(255,177,280,177);
    text(18,243,'HIT omite la PTE; los permisos se comprueban siempre antes de RAM.',green);
    text(18,263,'Fault: síncrono. IRQ: externa. Las líneas son relaciones lógicas, no buses.',ink);
    return {width:565,height:278,background:'#14271f',alt:`Arquitectura de la PC: ${phaseLabels[s.phase]}. CPU, TLB, tabla/permisos, RAM, timer y kernel.`,shapes};
  }
  const pc = {
    initial,
    act(state, action, value) {
      if(action==='reset') return initial();
      const s=copy(state);
      if(action==='program' && ['normal','protection'].includes(value)) {
        const fresh=initial(); fresh.observed=copy(s.observed); fresh.log=s.log; fresh.scenario=value;
        if(value==='protection') fresh.program=[{op:'STORE',va:1,value:99},{op:'HALT'}];
        return log(fresh, `Programa ${value==='normal'?'normal':'de protección'} cargado. Registros, RAM, TLB y métricas vuelven al inicio; conservamos las observaciones educativas.`);
      }
      if(action==='pulse') {
        if(s.halted) return log(s,'La CPU está detenida: cargá un programa antes de inyectar un timer.');
        if(s.irqPending) return log(s,'La línea del timer ya está pendiente. Este modelo coalesce pulsos: no suma una cola de interrupciones.');
        s.irqPending=true; return log(s,'El timer levantó IRQ. No modifica PC ni RAM: se atenderá en la próxima frontera de instrucciones en modo usuario.');
      }
      if(action==='map' && s.phase==='fault' && s.trap.cause==='absent' && !s.trap.mapped) {
        s.table[2]={frame:2,write:true}; s.tlb[2]=null; s.ram.fill(0,8,12); s.trap.mapped=true;
        return log(s,'Kernel: VPN 2 pertenece a la región demand-zero del programa. Reserva marco 2, lo pone en cero, publica PTE RW e invalida su traducción. PC todavía no avanza.');
      }
      if(action==='ack' && s.phase==='irq') {
        if(s.trap.acked) return log(s,'Ese timer ya fue reconocido; falta volver al programa.');
        s.irqPending=false; s.trap.acked=true; return log(s,'ACK del timer: bajamos la señal pendiente. Atender la causa y volver a usuario son dos acciones distintas.');
      }
      if(action==='return' && s.phase==='irq') {
        if(!s.trap.acked) return log(s,'Retorno bloqueado en este modelo: primero reconocé el timer para evitar una reentrada inmediata.');
        s.pc=s.trap.pc; s.acc=s.trap.acc; s.trap=null; s.mode='user'; s.phase='fetch'; s.observed.interrupt=true;
        return log(s,`Retorno de IRQ: restauramos PC ${s.pc} y A ${s.acc}. Ninguna instrucción del usuario fue ejecutada por el handler.`);
      }
      if(action==='return' && s.phase==='fault' && s.trap.cause==='absent') {
        if(!s.trap.mapped) return log(s,'Todavía no hay mapeo: volver ahora repetiría el mismo page fault. Primero resolvé su causa.');
        s.pc=s.trap.pc; s.acc=s.trap.acc; s.retryPC=s.pc; s.trap=null; s.mode='user'; s.phase='fetch'; s.instruction=null; s.translation=null; s.physical=null;
        return log(s,`Volvemos a PC ${s.pc}, la misma instrucción fallida. Reintentar no significa saltear la operación.`);
      }
      if(action==='abort' && s.phase==='fault' && s.trap.cause==='protection') {
        s.halted=true;s.phase='halt'; return log(s,'Política del kernel de juguete: termina este programa por escritura prohibida. No concede W ni saltea silenciosamente el STORE. Cargá el programa normal para continuar explorando.');
      }
      if(action!=='step' || s.halted || s.mode!=='user') return s;
      if(s.phase==='fetch') {
        if(s.irqPending) {s.trap={cause:'timer',pc:s.pc,acc:s.acc,acked:false};s.mode='kernel';s.phase='irq';s.interrupts++;return log(s,`IRQ asíncrona aceptada antes de PC ${s.pc}: guardamos PC y A. Interrupciones anidadas quedan enmascaradas en el handler.`);}
        const instruction=s.program[s.pc];
        if(!instruction || instruction.op==='HALT') {s.halted=true;s.phase='halt';if(instruction)s.retired++;return log(s,'HALT: terminó el programa. Cargá otro escenario o reiniciá para repetir.');}
        s.instruction=copy(instruction);s.translation=null;s.physical=null;s.phase='tlb';
        return log(s,`CPU decodifica ${instruction.op} VA ${instruction.va}${instruction.op==='STORE'?` ← ${instruction.value}`:''}. VPN=${Math.floor(instruction.va/4)}, offset=${instruction.va%4}. PC queda ${s.pc} hasta completar.`);
      }
      if(s.phase==='tlb') {
        const vpn=Math.floor(s.instruction.va/4), cached=s.tlb[vpn];
        if(cached) {s.hits++;s.observed.hit=true;s.translation=copy(cached);s.phase='permission';return log(s,`TLB HIT en VPN ${vpn}: recuperamos marco y permisos cacheados. Aún hay que comprobar el tipo de acceso.`);}
        s.misses++;s.phase='walk';return log(s,`TLB MISS en VPN ${vpn}: falta la copia rápida. Un miss no es un page fault: ahora consultamos la tabla.`);
      }
      if(s.phase==='walk') {
        const vpn=Math.floor(s.instruction.va/4), entry=s.table[vpn];
        if(!entry) return fault(s,'absent');
        s.translation=copy(entry);s.tlb[vpn]=copy(entry);s.observed.walk=true;s.phase='permission';
        return log(s,`PTE presente: VPN ${vpn} → marco ${entry.frame}, ${entry.write?'RW':'R'}. Llenamos la TLB sin entrar al kernel; esta PC modela page walk por hardware.`);
      }
      if(s.phase==='permission') {
        if(s.instruction.op==='STORE' && !s.translation.write) return fault(s,'protection');
        s.physical=s.translation.frame*4+s.instruction.va%4;s.phase='memory';
        return log(s,`Acceso autorizado: PA=${s.translation.frame}×4+${s.instruction.va%4}=${s.physical}. Solo ahora habilitamos el acceso a RAM.`);
      }
      if(s.phase==='memory') {
        if(s.instruction.op==='LOAD') {s.acc=s.ram[s.physical];log(s,`RAM[${s.physical}]=${s.acc} → acumulador.`);}
        else {s.ram[s.physical]=s.instruction.value;log(s,`RAM[${s.physical}] ← ${s.instruction.value}. La escritura se confirma una sola vez.`);}
        if(s.retryPC===s.pc) {s.observed.recovered=true;s.retryPC=null;log(s,'La instrucción reintentada completó después del mapeo. El fault no había consumido su avance de PC.');}
        s.pc++;s.retired++;s.phase='fetch';return log(s,`Retiramos la instrucción: PC=${s.pc}. Si hay IRQ pendiente, podrá entrar antes de buscar la siguiente.`);
      }
      return s;
    },
    achieved(s) {return [...(s.observed.walk&&s.observed.hit?['translate']:[]),...(s.observed.protection&&s.observed.recovered?['protect-retry']:[]),...(s.observed.interrupt?['interrupt']:[])];},
    view(s) {
      const controls=[];
      if(!s.halted && s.mode==='user') controls.push(button('step',s.phase==='fetch'?'Un paso · CPU':'Un paso · '+phaseLabels[s.phase]));
      if(!s.halted) controls.push(button('pulse','Inyectar IRQ de timer'));
      if(s.phase==='fault' && s.trap.cause==='absent') {if(!s.trap.mapped)controls.push(button('map','Kernel · mapear página ausente'));controls.push(button('return','Retornar y reintentar el mismo PC'));}
      if(s.phase==='fault' && s.trap.cause==='protection') controls.push(button('abort','Kernel · terminar programa prohibido'));
      if(s.phase==='irq') controls.push(button('ack','Reconocer IRQ · ACK'),button('return','Retornar de IRQ'));
      controls.push(button('program','Cargar programa normal','normal'),button('program','Probar escritura prohibida','protection'),button('reset','Reiniciar todo'));
      const rows=[];
      for(let vpn=0;vpn<3;vpn++) {const p=s.table[vpn],t=s.tlb[vpn];rows.push(['PTE',`VPN ${vpn}`,p?`marco ${p.frame}`:'ausente',p?(p.write?'RW':'R'):'—']);rows.push(['TLB',`VPN ${vpn}`,t?`marco ${t.frame}`:'vacía',t?(t.write?'RW':'R'):'—']);}
      for(let frame=0;frame<3;frame++) rows.push(['RAM',`marco ${frame}`,`PA ${frame*4}..${frame*4+3}`,s.ram.slice(frame*4,frame*4+4).join(' · ')]);
      return {title:'PC de bolsillo · seguí un acceso de punta a punta',summary:`${phaseLabels[s.phase]}. Las instrucciones viven en una lista; solo los accesos de datos atraviesan esta MMU.`,
        metrics:[metric('PC',s.pc),metric('Acumulador',s.acc),metric('Modo',s.mode),metric('TLB hit / miss',`${s.hits} / ${s.misses}`),metric('Faults / IRQ',`${s.faults} / ${s.interrupts}`),metric('Instrucciones retiradas',s.retired)],
        cells:s.program.map((i,index)=>cell(`PC ${index}`,i.op==='HALT'?'HALT':`${i.op} ${i.va}${i.op==='STORE'?` ← ${i.value}`:''}`,index===s.pc?'active':index<s.pc?'good':'muted')),
        columns:['Estructura','Índice','Destino','Permiso / contenido'],rows,controls,log:s.log,scene:architecture(s),
        explanation:'Recorrido sugerido: completá LOAD 1 y LOAD 2 para comparar miss/hit. Inyectá timer y hacé ACK + retorno. LOAD 9 provoca ausencia: mapeá y reintentá. Terminá el programa, cargá la escritura prohibida y comprobá que RAM[5] sigue en 21. Las metas observadas se conservan entre programas; Reiniciar todo las borra del simulador.'};
    }
  };
  const sources=[
    {title:'OSTEP · Paging: páginas, marcos y tablas',url:'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-paging.pdf'},
    {title:'OSTEP · TLBs y page walks',url:'https://pages.cs.wisc.edu/~remzi/OSTEP/vm-tlbs.pdf'},
    {title:'xv6 RISC-V · Traps y dispositivos, capítulos 4–5',url:'https://pdos.csail.mit.edu/6.1810/2025/xv6/book-riscv-rev5.pdf'},
    {title:'Nand2Tetris · software y herramientas del curso',url:'https://www.nand2tetris.org/software'},
    {title:'Nand2Tetris · IDE web oficial',url:'https://nand2tetris.github.io/web-ide/'},
    {title:'Ripes · repositorio y alcance del simulador RISC-V',url:'https://github.com/mortbopet/Ripes'},
    {title:'Ripes · acceso web publicado en ripes.me',url:'https://ripes.me/Ripes/'},
    {title:'Ripes · despliegue web experimental enlazado por su README',url:'https://ripes.dk/'}
  ];
  const workshops=[{id:'pc',model:'pc',category:'machine',level:'expert',minutes:75,title:'Construí una PC de bolsillo',subtitle:'CPU, TLB, memoria y kernel: todas las piezas conversan.',
    story:'Sos quien arma una computadora con la tapa transparente. Una carga de memoria recorre ventanillas; el timer interrumpe la atención y el kernel resuelve qué puede continuar. Cada paso tiene una causa visible.',
    what:'Integrás una CPU LOAD/STORE/HALT con traducción virtual, permisos, RAM, page fault recuperable e IRQ de timer. El código enlazado implementa el núcleo de accesos con reintento y eventos verificables.',
    why:'Estudiar componentes separados sirve; conectarlos explica cuándo el CPU puede confirmar una escritura, por qué un miss común no llama al kernel y por qué reintentar un fault exige conservar la instrucción fallida.',
    uses:['Leer trazas de fallos de memoria con contexto','Comprender la frontera entre hardware y kernel','Diseñar máquinas de estados con efectos que se confirman una sola vez'],
    limits:'Es un modelo lógico de un único CPU y proceso, con tres páginas de cuatro celdas y tabla de un nivel. No emula x86, RISC-V ni un sistema arrancable; omite pipeline, cachés de datos, privilegios completos, DMA, multinúcleo y tiempos. El programa se guarda aparte de RAM, sin traducción de instrucciones. La MMU se representa en software y los pulsos se inyectan manualmente. Nand2Tetris desarrolla la máquina Hack y su cadena de herramientas; no equivale a esta MMU. Ripes permite explorar microarquitecturas RISC-V, cachés y MMIO; este taller no afirma que ejecute nuestro kernel. Su README enlaza ripes.dk como versión web experimental.',
    objectives:[{id:'translate',label:'Compará un page walk normal y un TLB hit',why:'Una PTE presente resuelve el miss sin excepción ni kernel.'},{id:'protect-retry',label:'Rechazá una escritura y recuperá una ausencia',why:'Permiso insuficiente y página ausente requieren políticas diferentes; solo la ausencia válida se mapea y reintenta.'},{id:'interrupt',label:'Guardá PC, reconocé el timer y retorná',why:'Una IRQ externa conserva la continuación, mientras un fault conserva la instrucción que debe reintentarse.'}],
    prediction:{question:'LOAD 9 produce TLB miss y luego la tabla indica página ausente. ¿Qué debe hacer el kernel si esa región es demand-zero válida?',options:['Avanzar PC y devolver cualquier dato','Mapear un marco inicializado y reintentar el mismo PC','Convertir todo TLB miss en una interrupción de timer'],answer:1,explanation:'El miss inicia la búsqueda. La ausencia provoca el fault síncrono; el handler resuelve su causa y vuelve a la instrucción que todavía no completó.'},
    steps:[
      {title:'Dibujá estados y contratos',task:'Definí CPU, RAM, PTE, TLB y trap frame. Anotá qué campos puede modificar cada etapa y separá VA de PA.',why:'Los tipos de dirección y los efectos permitidos evitan confundir traducción con acceso real.',done:'Podés trazar LOAD 1 sin cambiar RAM y STORE 1 sin confirmar una escritura.'},
      {title:'Programá el recorrido de memoria',task:'Completá el núcleo enlazado. Registrá hit, miss, fault, mapeo y retiro de cada acceso; no consumas PC al fallar.',why:'La traza convierte decisiones ocultas en un contrato que se prueba.',done:'Pasan los tres casos y un caso propio donde la misma página pasa de miss a hit.'},
      {title:'Agregá interrupciones precisas',task:'En el proyecto descargable, agregá el timer pendiente, trap frame, ACK y retorno entre instrucciones. Conservá PC y acumulador.',why:'Interrumpir un programa exige preservar su continuación; la escritura debe confirmarse como máximo una vez.',done:'Una IRQ inyectada durante un acceso espera al retiro, se reconoce y vuelve al PC siguiente.'},
      {title:'Compará con una máquina mayor',task:'Usá el IDE web de Nand2Tetris para CPU/Hack o Ripes para RISC-V y contrastá sus instrucciones con las tuyas. Leé traps en xv6 y documentá tres diferencias.',why:'Los límites explícitos permiten transferir conceptos sin asumir que todos los simuladores ejecutan el mismo hardware.',done:'Tu README incluye una traza normal, una por protección y una por IRQ, además de tres simplificaciones del modelo.'}
    ],sources,code:{rust:'rust-137',go:'go-137'},related:{rust:['rust-115','rust-116','rust-120'],go:['go-115','go-116','go-120']},
    bridge:{rust:'Exportá a Cargo y modelá instrucciones/traps con enum. Esta simulación usa std y memoria segura. Un kernel real requiere target, bootloader, no_std y reglas de arquitectura fuera del Playground.',go:'Exportá a un módulo Go y separá CPU y bus con tipos pequeños. Go estándar ejecuta sobre runtime/OS; sirve para el simulador. No convierte estas funciones en un kernel bare metal ni en controladores de MMU.'}
  }];
  return {workshops,models:{pc}};
})();
