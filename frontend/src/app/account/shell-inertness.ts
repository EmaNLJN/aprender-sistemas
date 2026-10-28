export function setShellInert(inert: boolean): void {
  for (const element of document.querySelectorAll<HTMLElement>('.app-shell, .skip-link')) {
    element.inert = inert;
  }
}
