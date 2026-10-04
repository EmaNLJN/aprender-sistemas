// DOM falso mínimo y sin dependencias para ejecutar fuentes legacy en un contexto vm.
// No parsea HTML: `innerHTML` es sólo una cadena que los checks leen, y las consultas
// devuelven vacío salvo que el check registre sus propios elementos.
export type Handler = (event: FakeEvent) => unknown;
export interface FakeEvent {
  type: string;
  target: FakeElement;
  preventDefault(): void;
  [extra: string]: unknown;
}
export interface FakeFile {
  size: number;
  text(): Promise<string>;
}

export class FakeClassList {
  readonly names = new Set<string>();
  add(name: string): void {
    this.names.add(name);
  }
  remove(name: string): void {
    this.names.delete(name);
  }
  contains(name: string): boolean {
    return this.names.has(name);
  }
  toggle(name: string, force?: boolean): boolean {
    const on = force ?? !this.names.has(name);
    if (on) this.names.add(name);
    else this.names.delete(name);
    return on;
  }
}

// Nodo de texto mínimo para los árboles que construye React.
export class FakeText {
  readonly nodeType = 3;
  readonly nodeName = '#text';
  parentNode: FakeElement | null = null;
  nodeValue: string;

  constructor(text: string) {
    this.nodeValue = text;
  }
  get textContent(): string {
    return this.nodeValue;
  }
  set textContent(text: string) {
    this.nodeValue = text;
  }
  get nextSibling(): FakeNode | null {
    return siblingAfter(this);
  }
  remove(): void {
    this.parentNode?.removeChild(this);
  }
}

export type FakeNode = FakeElement | FakeText;

function siblingAfter(node: FakeNode): FakeNode | null {
  const siblings = node.parentNode?.childNodes ?? [];
  return siblings[siblings.indexOf(node) + 1] ?? null;
}

export class FakeElement {
  readonly dataset: Record<string, string> = {};
  readonly classList = new FakeClassList();
  readonly style: Record<string, string> = {};
  readonly attributes = new Map<string, string>();
  readonly listeners = new Map<string, Handler[]>();
  // Árbol real de nodos (lo mínimo que exige react-dom); `innerHTML` sigue siendo una
  // cadena aparte porque este DOM no parsea HTML.
  readonly childNodes: FakeNode[] = [];
  parentNode: FakeElement | null = null;
  ownerDocument: unknown = null;
  readonly nodeType = 1;
  files: FakeFile[] = [];
  innerHTML = '';
  private text = '';
  value = '';
  checked = false;
  selected = false;
  defaultSelected = false;
  multiple = false;
  hidden = false;
  open = false;
  href = '';
  download = '';
  max = 0;
  isConnected = true;
  clicks = 0;
  focused = 0;

  readonly tag: string;
  readonly id: string;
  readonly nodeName: string;
  readonly tagName: string;

  constructor(tag: string, id = '') {
    this.tag = tag;
    this.id = id;
    this.nodeName = tag.toUpperCase();
    this.tagName = this.nodeName;
  }

  get textContent(): string {
    return this.text;
  }
  // Asignar texto reemplaza a los hijos, como en un elemento real.
  set textContent(text: string) {
    this.text = text;
    for (const child of this.childNodes) child.parentNode = null;
    this.childNodes.length = 0;
  }
  get children(): FakeElement[] {
    return this.childNodes.filter((node): node is FakeElement => node instanceof FakeElement);
  }
  // `<select>`: react-dom lee `options` para fijar el valor seleccionado.
  get options(): FakeElement[] {
    return this.children.filter((child) => child.tag === 'option');
  }
  get firstChild(): FakeNode | null {
    return this.childNodes[0] ?? null;
  }
  get lastChild(): FakeNode | null {
    return this.childNodes.at(-1) ?? null;
  }
  get nextSibling(): FakeNode | null {
    return siblingAfter(this);
  }

  addEventListener(type: string, handler: Handler): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), handler]);
  }
  removeEventListener(type: string, handler: Handler): void {
    this.listeners.set(
      type,
      (this.listeners.get(type) ?? []).filter((item) => item !== handler),
    );
  }
  // Despacha un evento a mano y espera a los manejadores asíncronos.
  async dispatch(type: string, extra: Record<string, unknown> = {}): Promise<void> {
    const event: FakeEvent = { type, target: this, preventDefault: () => undefined, ...extra };
    for (const handler of this.listeners.get(type) ?? []) await handler(event);
  }
  setAttribute(name: string, value: string): void {
    this.attributes.set(name, String(value));
  }
  getAttribute(name: string): string | null {
    return this.attributes.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attributes.delete(name);
  }
  toggleAttribute(name: string, force?: boolean): boolean {
    const on = force ?? !this.attributes.has(name);
    if (on) this.attributes.set(name, '');
    else this.attributes.delete(name);
    return on;
  }
  focus(): void {
    this.focused++;
  }
  click(): void {
    this.clicks++;
    void this.dispatch('click');
  }
  closest(): FakeElement | null {
    return null;
  }
  querySelector(): FakeElement | null {
    return null;
  }
  querySelectorAll(): FakeElement[] {
    return [];
  }
  appendChild<T extends FakeNode>(child: T): T {
    return this.insertBefore(child, null);
  }
  insertBefore<T extends FakeNode>(child: T, reference: FakeNode | null): T {
    child.parentNode?.removeChild(child);
    const index = reference ? this.childNodes.indexOf(reference) : -1;
    if (index < 0) this.childNodes.push(child);
    else this.childNodes.splice(index, 0, child);
    child.parentNode = this;
    return child;
  }
  removeChild<T extends FakeNode>(child: T): T {
    const index = this.childNodes.indexOf(child);
    if (index >= 0) this.childNodes.splice(index, 1);
    child.parentNode = null;
    return child;
  }
  remove(): void {
    this.isConnected = false;
    this.parentNode?.removeChild(this);
  }
  scrollIntoView(): void {}
  select(): void {}
  showModal(): void {
    this.open = true;
  }
  close(): void {
    this.open = false;
    void this.dispatch('close');
  }
}

export class FakeBlob {
  readonly parts: string[];
  readonly options: { type?: string };
  readonly text: string;

  constructor(parts: string[], options: { type?: string } = {}) {
    this.parts = parts;
    this.options = options;
    this.text = parts.join('');
  }
}
