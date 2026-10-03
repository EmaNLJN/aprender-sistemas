import {readFileSync, writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import vm from 'node:vm';
const root=dirname(fileURLToPath(import.meta.url));
const read=name=>readFileSync(join(root,name),'utf8');
const context={window:{}};
vm.createContext(context);
for(const file of ['lab-rust.js','lab-go.js','quests-rust.js','quests-go.js'])vm.runInContext(read(file),context,{timeout:5000});
for(const key of ['RUST_LAB','GO_LAB']){
  const items=context.window[key];
  if(items?.length!==100||new Set(items.map(x=>x.id)).size!==100)throw new Error(`${key}: se esperan 100 desafíos únicos antes de empaquetar.`);
}
for(const key of ['RUST_QUESTS','GO_QUESTS']){
  if(context.window[key]?.length!==12||new Set(context.window[key].map(x=>x.id)).size!==12)throw new Error(`${key}: se esperan12misiones nuevas únicas.`);
}
for(const domain of ['lowlevel','infra','play','pc'])for(const suffix of ['', '-labs'])vm.runInContext(read('systems-'+domain+suffix+'.js'),context,{timeout:5000});
const systemLabs=['LOWLEVEL','INFRA','PLAY','PC'].flatMap(name=>context.window['SYSTEMS_'+name+'_LABS']);
if(systemLabs.length!==50||new Set(systemLabs.map(item=>item.id)).size!==50)throw new Error('Se esperan 50 núcleos de Sistemas.');
vm.runInContext(read('atlas-content.js'),context,{timeout:5000});
for(const lang of ['rust','go']){
  if(context.window.TALLER_ATLAS?.[lang]?.length!==16)throw new Error(`Atlas ${lang}: se esperan 16 conceptos.`);
}
let html=read('page.html');
for(const file of [...html.matchAll(/<link rel="stylesheet" href="([^"]+)">/g)].map(match=>match[1]))html=html.replace(`<link rel="stylesheet" href="${file}">`,()=>`<style>\n${read(file)}\n</style>`);
for(const file of [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(match=>match[1]))html=html.replace(`<script src="${file}"></script>`,()=>`<script>\n${read(file).replace(/<\/script/gi,'<\\/script')}\n</script>`);
writeFileSync(join(root,'index.html'),html);
process.stdout.write(`Taller listo: 274 desafíos, 8 mundos y 25 talleres de Sistemas, ${Buffer.byteLength(html).toLocaleString('es-AR')} bytes.\n`);
