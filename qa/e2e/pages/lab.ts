import type { Locator, Page } from '@playwright/test';
import type { Language } from '../lib/curriculum';
import type { Phase } from '../lib/urls';

const TAB_NAME: Record<Phase, RegExp> = {
  learn: /Descubrí/,
  code: /Experimentá/,
  reflect: /Explicá/,
};
const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

export class LabPage {
  constructor(readonly page: Page) {}

  tab(phase: Phase): Locator {
    return this.page.getByRole('tab', { name: TAB_NAME[phase] });
  }

  exerciseTitle(): Locator {
    return this.page.getByRole('heading', { level: 1 });
  }

  startButton(): Locator {
    return this.page.getByRole('button', { name: /Entrar al laboratorio|Seguir aprendiendo/ });
  }

  editor(language: Language): Locator {
    return this.page.getByRole('textbox', { name: `Editor de código ${LANGUAGE_NAME[language]}` });
  }

  async writeDraft(language: Language, text: string): Promise<void> {
    await this.editor(language).click();
    await this.page.keyboard.press('ControlOrMeta+A');
    await this.page.keyboard.insertText(text);
  }

  runButton(): Locator {
    return this.page.getByRole('button', { name: /Ejecutar y revisar/ });
  }

  async runCode(): Promise<void> {
    await this.runButton().click();
  }

  review(): Locator {
    return this.page.getByRole('complementary', { name: 'Revisión del ejercicio' });
  }

  reviewHeading(): Locator {
    return this.review().getByRole('heading', { level: 3 }).first();
  }

  // Bridge block without role or name: the class is its contract.
  contextBlock(): Locator {
    return this.page.locator('.quest-lab-context');
  }

  contextBackLink(): Locator {
    return this.contextBlock().getByRole('link', { name: /^←/ });
  }

  campaignLockHeading(): Locator {
    return this.page.getByRole('heading', { name: /Primero, las piezas/ });
  }

  campaignLockMapLink(): Locator {
    return this.page.getByRole('link', { name: /Ver mi mapa/ });
  }

  position(): Locator {
    return this.page.getByText(/^\d+ \/ \d+$/);
  }

  nextButton(): Locator {
    return this.page.getByRole('button', { name: 'Ejercicio siguiente' });
  }

  previousButton(): Locator {
    return this.page.getByRole('button', { name: 'Ejercicio anterior' });
  }

  backButton(): Locator {
    return this.page.getByRole('button', { name: /^← Volver al/ });
  }
}
