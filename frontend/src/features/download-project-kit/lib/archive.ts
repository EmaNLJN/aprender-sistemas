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
import { zipSync, strToU8 } from 'fflate';
import type { Kit } from '../model/kit-files';

export interface KitArchive {
  name: string;
  bytes: Uint8Array<ArrayBuffer>;
}

export function zipKit(project: Kit): KitArchive {
  return {
    name: project.name + '.zip',
    // fflate asigna un ArrayBuffer propio; el tipo genérico lo declara más ancho.
    bytes: zipSync(
      Object.fromEntries(
        Object.entries(project.files).map(([name, text]) => [
          project.name + '/' + name,
          strToU8(text),
        ]),
      ),
      { level: 6 },
    ) as Uint8Array<ArrayBuffer>,
  };
}
