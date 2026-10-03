/*!
MIT License

Copyright (c) 2026 Arjun Barrett

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import {zipSync,strToU8} from 'fflate';

function files(workshop,language,options={}){
  if(!['rust','go'].includes(language)||!workshop?.code?.[language])throw new Error('Taller desconocido.');
  const item=window.TallerLab.getExercises().find(ex=>ex.id===workshop.code[language]);
  if(!item)throw new Error('No encontré el núcleo del taller.');
  const record=window.TallerLab.exportState().records[item.id]||{};
  const code=options.solution?item.solution:record.draft??item.starter;
  const tests=[...item.tests];
  if(!options.solution&&record.customTest?.trim())tests.push({id:'custom',label:'Tu caso adicional',expression:record.customTest.trim(),why:'Hipótesis añadida en el editor.'});
  const stem=`taller-${workshop.id}-${language}`,result={};
  if(language==='rust'){
    result['Cargo.toml']=`[package]\nname = ${JSON.stringify(stem)}\nversion = "0.1.0"\nedition = "2024"\n\n[dependencies]\n`;
    result['src/lib.rs']=`${code}\n\n// PRUEBAS DEL TALLER — agregá casos sin cambiar el contrato.\n#[cfg(test)]\nmod __taller_checks {\n    use super::*;\n${tests.map((test,index)=>`    // ${test.why.replace(/\n/g,' ')}\n    #[test]\n    fn caso_${index+1}() {\n        assert!(({ ${test.expression} }), "{}", ${JSON.stringify(test.label)});\n    }`).join('\n')}\n}\n`;
    result['reference/solution.rs.txt']=item.solution+'\n';
    result['.gitignore']='/target\n';
  }else{
    result['go.mod']=`module taller.local/${workshop.id}\n\ngo 1.23\n`;
    // The browser harness supplies fmt too. Use it in the test harness so a
    // comment or string mentioning fmt cannot produce an unused Go import.
    const imports=[...new Set(['testing','fmt',...(item.imports||[])])];
    result['exercise_test.go']=`package workshop\n\nimport (\n${imports.map(name=>'    '+JSON.stringify(name)).join('\n')}\n)\n\n${code}\n\n// PRUEBAS DEL TALLER — el núcleo y los tests comparten archivo para sus imports.\n${tests.map((test,index)=>`func TestCaso${index+1}(t *testing.T) {\n    // ${test.why.replace(/\n/g,' ')}\n    if !(${test.expression}) { t.Fatal(fmt.Sprint(${JSON.stringify(test.label)})) }\n}`).join('\n\n')}\n`;
    result['reference/solution.go.txt']=item.solution+'\n';
    result['.gitignore']='*.test\ncoverage.out\n';
  }
  const command=language==='rust'?'cargo test':'go test -v ./...';
  result['README.md']=`# ${workshop.title}\n\nKit del taller en ${language==='rust'?'Rust':'Go'}. Contiene el núcleo del ejercicio ${item.id}, no una implementación completa del sistema descrito.\n\n## Empezar\n\nInstalá ${language==='rust'?'Rust estable con Cargo (edición 2024)':'Go 1.23 o posterior'}. Desde esta carpeta ejecutá:\n\n\`\`\`sh\n${command}\n\`\`\`\n\nEl borrador es el que tenías en el navegador al descargar. Si todavía no lo resolviste, es normal que las pruebas fallen. No necesita dependencias externas. La solución de apoyo está como texto en reference/ para que no se compile automáticamente.\n\n## Contrato del núcleo\n\n${item.objective}\n\n${item.instructions.map(text=>'- '+text).join('\n')}\n\n## Por qué\n\n${item.why}\n\n## Lo que prueban los casos\n\n${tests.map(test=>`- **${test.label}**: ${test.why}`).join('\n')}\n\n## Convertirlo en un proyecto\n\n${workshop.steps.map((step,index)=>`### ${index+1}. ${step.title}\n\n${step.task}\n\nPor qué: ${step.why}\n\nComprobación manual: ${step.done}`).join('\n\n')}\n\n## Límites del modelo\n\n${workshop.limits}\n\n${workshop.bridge[language]}\n\n## Fuentes\n\n${workshop.sources.map(source=>`- [${source.title}](${source.url})`).join('\n')}\n\n## Tu próximo experimento\n\n${workshop.progress?.note||'Escribí una hipótesis y el test que podría refutarla.'}\n`;
  return {name:stem,files:result};
}
function archive(workshop,language,options){const project=files(workshop,language,options);return {name:project.name+'.zip',bytes:zipSync(Object.fromEntries(Object.entries(project.files).map(([name,text])=>[project.name+'/'+name,strToU8(text)])),{level:6})};}
function download(workshop,language){const result=archive(workshop,language),blob=new Blob([result.bytes],{type:'application/zip'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=result.name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
window.TallerProjectKit={files,archive,download};
