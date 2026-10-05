// Downloads a Blob through a temporary anchor and releases the URL one second later.
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
