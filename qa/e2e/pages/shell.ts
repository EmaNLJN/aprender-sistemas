import type { Locator, Page } from '@playwright/test';
import type { Language } from '../lib/curriculum';
import type { View } from '../lib/urls';

const MENU_NAME: Record<View, RegExp> = {
  recorrido: /^Mi recorrido/,
  campana: /^Campaña/,
  sistemas: /^Sistemas/,
  atlas: /^Atlas del lenguaje/,
  laboratorio: /^Laboratorio/,
  biblioteca: /^Biblioteca/,
  proyecto: /^Mi proyecto/,
  metodo: /^Método y notas/,
};

const HEADING: Record<View, RegExp> = {
  recorrido: /Entendé lo que\s*pasa por dentro\./,
  campana: /El próximo nivel\s*lo construís vos\./,
  sistemas: /Abrí la caja\.\s*Construí lo que hay adentro\./,
  atlas: /Entender el porqué\./,
  laboratorio: /Aprendé tocando\.\s*Entendé probando\./,
  biblioteca: /Una biblioteca\.\s*Tu propia ruta\./,
  proyecto: /De una función\s*a tu propio sistema\./,
  metodo: /Menos inercia\.\s*Más curiosidad\./,
};

const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

export class ShellPage {
  readonly menu: Locator;
  readonly languages: Locator;
  readonly toast: Locator;
  readonly body: Locator;

  constructor(readonly page: Page) {
    this.menu = page.getByRole('navigation', { name: 'Navegación principal' });
    this.languages = page.getByRole('group', { name: 'Lenguaje del recorrido' });
    // No accessible name and other status regions exist: the id is the toast contract.
    this.toast = page.locator('#toast');
    this.body = page.locator('body');
  }

  async goto(url: string): Promise<void> {
    await this.page.goto(url);
    await this.page.locator('#main > :not([data-content-gate="loading"])').first().waitFor();
  }

  menuLink(view: View): Locator {
    return this.menu.getByRole('link', { name: MENU_NAME[view] });
  }

  async openFromMenu(view: View): Promise<void> {
    await this.menuLink(view).click();
  }

  heading(view: View): Locator {
    return this.page.getByRole('heading', { level: 1, name: HEADING[view] });
  }

  languageButton(language: Language): Locator {
    return this.languages.getByRole('button', { name: LANGUAGE_NAME[language], exact: true });
  }

  async switchLanguage(language: Language): Promise<void> {
    await this.languageButton(language).click();
  }

  saveStatus(text: 'Guardado en este navegador' | 'Exportá para conservar tu avance'): Locator {
    return this.page.getByText(text, { exact: true });
  }
}
