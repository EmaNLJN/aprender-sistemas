let stored: unknown;
let hasContent = false;

export function storeContent(content: unknown): void {
  if (hasContent) throw new Error('El contenido ya se publicó.');
  stored = content;
  hasContent = true;
}

export function readStoredContent(): unknown {
  if (!hasContent) {
    throw new Error(
      'El contenido todavía no se publicó: se lee después de la compuerta de arranque.',
    );
  }
  return stored;
}
