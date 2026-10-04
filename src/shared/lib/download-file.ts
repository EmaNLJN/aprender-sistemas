// Descarga un Blob mediante un anchor temporal y libera la URL un segundo después.
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob),
    anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
