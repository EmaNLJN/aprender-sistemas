import { readFile } from 'node:fs/promises';
import type { Locator, Page } from '@playwright/test';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class RoutePage {
  readonly card: Locator;
  readonly lesson: Locator;

  constructor(readonly page: Page) {
    this.card = page.getByRole('region', { name: 'Sesión de hoy' });
    this.lesson = page.getByRole('dialog');
  }

  nextStepLabel(): Locator {
    return this.card.getByText(/^TU (PRÓXIMO PASO · \d{2} \/ \d+|SIGUIENTE EXPERIMENTO)$/);
  }

  nextStepTitle(): Locator {
    return this.card.getByRole('heading', { level: 2 });
  }

  startSession(): Locator {
    return this.card.getByRole('button', { name: 'Empezar esta sesión' });
  }

  continueProject(): Locator {
    return this.card.getByRole('link', { name: 'Continuar mi proyecto' });
  }

  completedCounter(): Locator {
    return this.page.getByText(/^\d+ DE \d+ COMPLETADOS$/);
  }

  completionBanner(): Locator {
    return this.page.getByText(/^Completaste tu recorrido inicial\./);
  }

  module(title: string): Locator {
    return this.page
      .locator('details.module')
      .filter({ has: this.page.getByText(title, { exact: true }) });
  }

  moduleSummary(title: string): Locator {
    return this.module(title).locator('summary');
  }

  moduleCount(title: string): Locator {
    return this.module(title).getByText(/^\d+\/\d+$/);
  }

  stepCheckbox(title: string): Locator {
    return this.page.getByRole('checkbox', {
      name: `Marcar como completado: ${title}`,
      exact: true,
    });
  }

  stepTitle(title: string): Locator {
    return this.page.getByRole('button', { name: new RegExp(`^${escapeRegExp(title)}`) });
  }

  stepOpen(title: string): Locator {
    return this.page.getByRole('button', { name: `Abrir ${title}`, exact: true });
  }

  lessonLabel(): Locator {
    return this.lesson.getByText(/· UNA SESIÓN ORIENTATIVA$/);
  }

  lessonClose(): Locator {
    return this.lesson.getByRole('button', { name: 'Cerrar sesión' });
  }

  continueLater(): Locator {
    return this.lesson.getByRole('button', { name: 'Seguir después' });
  }

  markDone(): Locator {
    return this.lesson.getByRole('button', { name: 'Marcar como hecho' });
  }

  practiceAgain(): Locator {
    return this.lesson.getByRole('button', { name: 'Volver a practicar' });
  }

  quizOption(text: string): Locator {
    return this.lesson.getByRole('button', { name: new RegExp(`${escapeRegExp(text)}$`) });
  }

  quizFeedback(): Locator {
    return this.lesson.getByRole('status');
  }

  lessonResources(): Locator {
    return this.lesson.getByRole('link');
  }

  timer(): Locator {
    return this.page.getByRole('timer', { name: 'Tiempo restante' });
  }

  duration(minutes: 15 | 25 | 45): Locator {
    return this.page
      .getByRole('group', { name: 'Duración de la sesión' })
      .getByRole('button', { name: `${minutes} min`, exact: true });
  }

  timerButton(label: 'Iniciar foco' | 'Pausar' | 'Continuar'): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  resetTimer(): Locator {
    return this.page.getByRole('button', { name: 'Reiniciar temporizador' });
  }

  codeArt(): Locator {
    return this.page.locator('[aria-label="Ilustración de código, no es un ejercicio ejecutable"]');
  }

  libraryLink(): Locator {
    return this.page.getByRole('link', { name: 'Explorá la biblioteca' });
  }

  sidebarCompleted(): Locator {
    return this.page.locator('#sidebar-completed');
  }

  sidebarPercent(): Locator {
    return this.page.locator('#sidebar-percent');
  }

  async focusMain(): Promise<void> {
    await this.page.locator('#main').focus();
  }

  async scrollY(): Promise<number> {
    return this.page.evaluate(() => window.scrollY);
  }

  async focusIsInsideLessonOrNowhere(): Promise<boolean> {
    return this.page.evaluate(() => {
      const active = document.activeElement;
      return active === null || active === document.body || active.closest('dialog[open]') !== null;
    });
  }

  async exportProgress(): Promise<Record<string, unknown>> {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.getByRole('button', { name: 'Exportar mi progreso' }).click(),
    ]);
    return JSON.parse(await readFile(await download.path(), 'utf8')) as Record<string, unknown>;
  }
}
