/*!
 * CodeMirror 6, its Rust/Go modes, Lezer, style-mod, w3c-keyname, find-cluster-break.
 * MIT License
 * Copyright (C) 2016 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * Copyright (C) 2024 by Marijn Haverbeke <marijn@haverbeke.berlin> and others
 * crelt: Copyright (C) 2020 by Marijn Haverbeke <marijn@haverbeke.berlin>
 * find-cluster-break: Copyright (C) 2024 by Marijn Haverbeke <marijn@haverbeke.berlin>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
import { basicSetup } from 'codemirror';
import { EditorState, Prec, type Extension } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import type { CompletionSource } from '@codemirror/autocomplete';
import { indentWithTab } from '@codemirror/commands';
import {
  autocompletion,
  completeFromList,
  snippetCompletion,
  closeCompletion,
  hasNextSnippetField,
  nextSnippetField,
  hasPrevSnippetField,
  prevSnippetField,
} from '@codemirror/autocomplete';
import { HighlightStyle, syntaxHighlighting, indentUnit } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { rust } from '@codemirror/lang-rust';
import { go } from '@codemirror/lang-go';

export type EditorLanguage = 'rust' | 'go';

export interface CodeEditorOptions {
  language?: string;
  onRun?: () => void;
  onEscape?: () => void;
}

export interface CodeEditorController {
  view: EditorView;
  focus(): void;
  destroy(): void;
}

type SnippetEntry = readonly [label: string, template: string, detail: string];

const DEFAULT_MAX_LENGTH = 30000;
const active = new WeakMap<HTMLTextAreaElement, CodeEditorController>();
const keywords: Record<EditorLanguage, string[]> = {
  rust: 'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while'.split(
    ' ',
  ),
  go: 'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var true false nil'.split(
    ' ',
  ),
};
const snippets: Record<EditorLanguage, SnippetEntry[]> = {
  rust: [
    ['fn', 'fn ${nombre}(${argumentos}) -> ${tipo} \\{\n\t${todo!()}\n\\}', 'declarar una función'],
    ['if', 'if ${condicion} \\{\n\t${}\n\\}', 'bifurcación'],
    ['for', 'for ${elemento} in ${coleccion} \\{\n\t${}\n\\}', 'recorrer una colección'],
    [
      'match',
      'match ${valor} \\{\n\t${patron} => ${resultado},\n\t_ => ${alternativa},\n\\}',
      'patrones exhaustivos',
    ],
    ['println!', 'println!("${mensaje}");', 'mostrar una línea'],
    ['assert_eq!', 'assert_eq!(${actual}, ${esperado});', 'comparar dos valores'],
    ['struct', 'struct ${Nombre} \\{\n\t${campo}: ${tipo},\n\\}', 'datos con campos'],
    ['impl', 'impl ${Tipo} \\{\n\t${}\n\\}', 'métodos de un tipo'],
  ],
  go: [
    ['func', 'func ${Nombre}(${argumentos}) ${tipo} \\{\n\t${}\n\\}', 'declarar una función'],
    ['if', 'if ${condicion} \\{\n\t${}\n\\}', 'bifurcación'],
    ['for', 'for ${i} := 0; ${i} < ${limite}; ${i}++ \\{\n\t${}\n\\}', 'bucle contado'],
    [
      'range',
      'for ${indice}, ${valor} := range ${coleccion} \\{\n\t${}\n\\}',
      'recorrer una colección',
    ],
    ['iferr', 'if err != nil \\{\n\treturn ${err}\n\\}', 'atender un error'],
    ['goroutine', 'go func() \\{\n\t${}\n\\}()', 'iniciar trabajo concurrente'],
    ['struct', 'type ${Nombre} struct \\{\n\t${Campo} ${Tipo}\n\\}', 'datos con campos'],
    ['select', 'select \\{\ncase ${valor} := <-${canal}:\n\t${}\n\\}', 'operaciones sobre canales'],
  ],
};
function completions(language: EditorLanguage): CompletionSource {
  return completeFromList([
    ...keywords[language].map((label) => ({
      label,
      type: 'keyword',
      detail: 'palabra del lenguaje',
    })),
    ...snippets[language].map(([label, template, detail]) =>
      snippetCompletion(template, { label, type: 'text', detail, boost: 2 }),
    ),
  ]);
}

const theme = EditorView.theme(
  {
    '&': {
      color: '#e9e9d6',
      backgroundColor: '#202a22',
      fontSize: '14px',
      width: '100%',
      minWidth: '0',
      height: '390px',
    },
    '.cm-scroller': {
      fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
      lineHeight: '1.7',
      overflow: 'auto',
    },
    '.cm-content': { padding: '19px 0', caretColor: '#f3a166' },
    '.cm-line': { padding: '0 18px 0 12px' },
    '.cm-gutters': {
      backgroundColor: '#202a22',
      color: '#71816e',
      borderRight: '1px solid #ffffff12',
    },
    '.cm-gutterElement': { padding: '0 8px 0 12px' },
    '.cm-activeLineGutter': { backgroundColor: '#ffffff07', color: '#e0c69a' },
    '.cm-activeLine': { backgroundColor: '#ffffff04' },
    '.cm-cursor, .cm-dropCursor': { borderLeftColor: '#f3a166' },
    '&.cm-focused': { outline: 'none' },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
      backgroundColor: '#66795b66',
    },
    '.cm-matchingBracket': {
      backgroundColor: '#7f99654a',
      outline: '1px solid #a7bc77',
      color: '#faf9df',
    },
    '.cm-nonmatchingBracket': { color: '#ff9a8c', backgroundColor: '#983c3644' },
    '.cm-tooltip': {
      backgroundColor: '#2d382e',
      color: '#e9e9d6',
      border: '1px solid #58634e',
      borderRadius: '7px',
    },
    '.cm-tooltip-autocomplete ul li[aria-selected]': {
      backgroundColor: '#46553b',
      color: '#fff4d9',
    },
    '.cm-completionLabel': { fontFamily: 'inherit' },
    '.cm-completionDetail': {
      color: '#c5c9b0',
      fontStyle: 'normal',
      marginLeft: '12px',
      fontSize: '11px',
    },
    '.cm-panels': { backgroundColor: '#2a342a', color: '#e9e9d6' },
    '.cm-panels.cm-panels-top': { borderBottom: '1px solid #58634e' },
    '.cm-panels.cm-panels-bottom': { borderTop: '1px solid #58634e' },
    '.cm-search': { padding: '10px', fontFamily: 'system-ui,sans-serif', fontSize: '12px' },
    '.cm-textfield': {
      backgroundColor: '#202a22',
      color: '#e9e9d6',
      border: '1px solid #728066',
      borderRadius: '4px',
      padding: '5px',
    },
    '.cm-button': {
      backgroundImage: 'none',
      backgroundColor: '#3a4935',
      color: '#e9e9d6',
      border: '1px solid #728066',
      borderRadius: '4px',
      padding: '4px 8px',
    },
    '.cm-searchMatch': { backgroundColor: '#ba8c414a', outline: '1px solid #ddab66' },
    '.cm-searchMatch.cm-searchMatch-selected': { backgroundColor: '#cb954d7a' },
    '.cm-foldPlaceholder': {
      backgroundColor: '#34402f',
      border: '1px solid #68745d',
      color: '#d8dabb',
    },
    '.cm-tooltip.cm-tooltip-autocomplete > ul': {
      fontFamily: '"SFMono-Regular", Consolas, monospace',
    },
    '@media (max-width: 620px)': { '&': { height: '345px', fontSize: '13px' } },
  },
  { dark: true },
);
const highlighting = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier, tags.controlKeyword], color: '#eaaa76' },
  { tag: [tags.string, tags.special(tags.string)], color: '#c8d994' },
  { tag: [tags.number, tags.bool, tags.null], color: '#c2a8df' },
  { tag: [tags.typeName, tags.className, tags.namespace], color: '#e7d39b' },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: '#a3cecb' },
  { tag: [tags.comment], color: '#9cac8d', fontStyle: 'italic' },
  { tag: [tags.operator, tags.punctuation], color: '#c1c8b1' },
  { tag: [tags.invalid], color: '#ffb2a4', textDecoration: 'underline' },
]);

function createExtensions(
  language: EditorLanguage,
  textarea: HTMLTextAreaElement,
  maximum: number,
  { onRun, onEscape }: CodeEditorOptions,
  onDocChanged: (text: string) => void,
): Extension[] {
  return [
    Prec.highest(
      keymap.of([
        {
          key: 'Mod-Enter',
          run: () => {
            if (onRun) onRun();
            return true;
          },
          preventDefault: true,
        },
        {
          key: 'Escape',
          run: (editor: EditorView) => {
            closeCompletion(editor);
            if (onEscape) onEscape();
            else editor.contentDOM.blur();
            return true;
          },
          preventDefault: true,
        },
        {
          key: 'Tab',
          run: (editor: EditorView) =>
            hasNextSnippetField(editor.state)
              ? nextSnippetField(editor)
              : (indentWithTab.run?.(editor) ?? false),
        },
        {
          key: 'Shift-Tab',
          run: (editor: EditorView) =>
            hasPrevSnippetField(editor.state)
              ? prevSnippetField(editor)
              : (indentWithTab.shift?.(editor) ?? false),
        },
      ]),
    ),
    basicSetup,
    language === 'go' ? go() : rust(),
    autocompletion({
      override: [completions(language)],
      activateOnTyping: true,
      maxRenderedOptions: 12,
    }),
    indentUnit.of(language === 'go' ? '\t' : '    '),
    EditorState.tabSize.of(4),
    EditorState.changeFilter.of(
      (transaction) => !transaction.docChanged || transaction.newDoc.length <= maximum,
    ),
    EditorView.contentAttributes.of({
      'aria-label':
        textarea.getAttribute('aria-label') ||
        'Editor de código ' + (language === 'go' ? 'Go' : 'Rust'),
      'aria-multiline': 'true',
      'data-gramm': 'false',
      spellcheck: 'false',
      autocapitalize: 'off',
    }),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) onDocChanged(update.state.doc.toString());
    }),
    theme,
    syntaxHighlighting(highlighting),
  ];
}

export function mountCodeEditor(
  textarea: HTMLTextAreaElement | null,
  options: CodeEditorOptions = {},
): CodeEditorController {
  if (!textarea || textarea.tagName !== 'TEXTAREA' || !textarea.parentNode)
    throw new Error('TallerEditor.mount necesita un textarea conectado.');
  active.get(textarea)?.destroy();
  const language: EditorLanguage = options.language === 'go' ? 'go' : 'rust';
  const parent = textarea.parentNode as HTMLElement;
  const previous = {
    display: textarea.style.display,
    ariaHidden: textarea.getAttribute('aria-hidden'),
  };
  const maximum = textarea.maxLength > 0 ? textarea.maxLength : DEFAULT_MAX_LENGTH;
  let destroyed = false;
  let syncing = false;
  const view = new EditorView({
    doc: textarea.value,
    extensions: createExtensions(language, textarea, maximum, options, (text) => {
      if (destroyed) return;
      textarea.value = text;
      syncing = true;
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
      syncing = false;
    }),
  });
  parent.insertBefore(view.dom, textarea);
  parent.classList.add('cm-enhanced');
  textarea.style.display = 'none';
  textarea.setAttribute('aria-hidden', 'true');

  // Keep existing reset/import flows compatible if they set and dispatch input
  // on the original textarea instead of rebuilding the workbench.
  const syncExternal = () => {
    if (syncing || destroyed || textarea.value === view.state.doc.toString()) return;
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: textarea.value } });
  };
  textarea.addEventListener('input', syncExternal);
  const controller: CodeEditorController = {
    view,
    focus() {
      if (!destroyed) view.focus();
    },
    destroy() {
      if (destroyed) return;
      textarea.value = view.state.doc.toString();
      destroyed = true;
      textarea.removeEventListener('input', syncExternal);
      view.destroy();
      parent.classList.remove('cm-enhanced');
      textarea.style.display = previous.display;
      if (previous.ariaHidden === null) textarea.removeAttribute('aria-hidden');
      else textarea.setAttribute('aria-hidden', previous.ariaHidden);
      active.delete(textarea);
    },
  };
  active.set(textarea, controller);
  return controller;
}
