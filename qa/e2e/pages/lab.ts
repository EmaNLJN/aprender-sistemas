import type { Locator, Page } from '@playwright/test';
import type { Language } from '../lib/curriculum';
import type { Phase } from '../lib/urls';

const TAB_NAME: Record<Phase, RegExp> = {
  learn: /Descubrí/,
  code: /Experimentá/,
  reflect: /Explicá/,
};
const LANGUAGE_NAME: Record<Language, string> = { rust: 'Rust', go: 'Go' };

function startsWith(text: string): RegExp {
  return new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`);
}

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

  mapEyebrow(): Locator {
    return this.page.locator('.lab-intro .eyebrow');
  }

  mapStamp(): Locator {
    return this.page.locator('.lab-stamp');
  }

  mapMetrics(): Locator {
    return this.page.locator('.lab-metrics');
  }

  todayChallenge(): Locator {
    return this.page.locator('.lab-continue');
  }

  levelButton(label: string): Locator {
    return this.page
      .getByRole('group', { name: 'Nivel de aprendizaje' })
      .getByRole('button', { name: startsWith(label) });
  }

  extrasButton(): Locator {
    return this.page.getByRole('button', { name: /^Clásicos y sistemas · \d+$/ });
  }

  dueButton(): Locator {
    return this.page.getByRole('button', { name: /^(Repasar pendientes|Ver todos)( · \d+)?$/ });
  }

  surpriseButton(): Locator {
    return this.page.getByRole('button', { name: 'Sorprendeme ↗' });
  }

  searchBox(): Locator {
    return this.page.getByRole('searchbox', { name: 'Buscar ejercicios' });
  }

  filterStatus(): Locator {
    return this.page.locator('#lab-filter-status');
  }

  exerciseNode(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  exerciseNodes(): Locator {
    return this.page.locator('.challenge-node');
  }

  emptyMapHeading(): Locator {
    return this.page.locator('.lab-empty h2');
  }

  showAllButton(): Locator {
    return this.page.getByRole('button', { name: 'Ver todos los desafíos' });
  }

  storageWarning(): Locator {
    return this.page.locator('.lab-storage-warning');
  }

  predictionOption(text: string): Locator {
    return this.page.getByRole('button', { name: text, exact: true });
  }

  predictionFeedback(): Locator {
    return this.page.locator('#lab-prediction-feedback');
  }

  editorStatus(): Locator {
    return this.page.locator('#lab-editor-status');
  }

  liveHint(): Locator {
    return this.page.locator('#lab-live-hint');
  }

  programPreviewToggle(): Locator {
    return this.page.getByText('Ver el programa completo y sus pruebas', { exact: true });
  }

  programPreview(): Locator {
    return this.page.getByLabel('Programa completo con pruebas');
  }

  copyProgramButton(): Locator {
    return this.page.getByRole('button', { name: 'Copiar programa completo ↗' });
  }

  restoreStarterButton(): Locator {
    return this.page.getByRole('button', { name: 'Restaurar inicio ↺' });
  }

  hintButton(): Locator {
    return this.page.getByRole('button', { name: /^(Dame una pista|Otra pista)$/ });
  }

  hintCounter(): Locator {
    return this.page.getByText(/^\d\/3 pistas$/);
  }

  hints(): Locator {
    return this.page.locator('.hint-item');
  }

  solutionToggle(): Locator {
    return this.page.getByText('Ver una solución razonada', { exact: true });
  }

  loadSolutionButton(): Locator {
    return this.page.getByRole('button', { name: 'Cargarla y experimentar' });
  }

  confirmDialog(): Locator {
    return this.page.getByRole('dialog');
  }

  keepCodeButton(): Locator {
    return this.confirmDialog().getByRole('button', { name: 'Conservar mi código' });
  }

  continueButton(): Locator {
    return this.confirmDialog().getByRole('button', { name: 'Continuar' });
  }

  testCaseToggle(label: string): Locator {
    return this.page.locator('.test-case summary', { hasText: label });
  }

  inventVariantButton(label: string): Locator {
    return this.page
      .locator('.test-case', { hasText: label })
      .getByRole('button', { name: 'Inventar una variante ↗' });
  }

  customTestToggle(): Locator {
    return this.page.getByText('＋ Inventá tu propio caso', { exact: true });
  }

  customTestBox(language: Language): Locator {
    return this.page.getByRole('textbox', { name: `Tu hipótesis en ${LANGUAGE_NAME[language]}` });
  }

  runningButton(): Locator {
    return this.page.getByRole('button', { name: 'Revisando…' });
  }

  cancelRunButton(): Locator {
    return this.page.getByRole('button', { name: 'Cancelar ejecución' });
  }

  explainButton(): Locator {
    return this.page.getByRole('button', { name: 'Explicar lo que aprendí →' });
  }

  reflectStatus(): Locator {
    return this.page.locator('#lab-reflect-status');
  }

  reflectionBox(): Locator {
    return this.page.getByRole('textbox', { name: 'Tu explicación, en tus palabras' });
  }

  reflectionStatus(): Locator {
    return this.page.locator('#lab-reflection-status');
  }

  confidenceButton(title: string): Locator {
    return this.page.getByRole('button', { name: startsWith(title) });
  }

  nextReview(): Locator {
    return this.page.getByText(/^Próximo repaso: /);
  }

  footerButton(): Locator {
    return this.page.getByRole('button', {
      name: /^(Siguiente experimento|Volver al taller|Volver al mapa) →$/,
    });
  }

  labExplorer(): Locator {
    return this.page.locator('.lab-explorer');
  }

  labExplorerStatus(): Locator {
    return this.labExplorer().getByRole('status');
  }

  questExplorer(): Locator {
    return this.page.getByRole('region', { name: 'Explorador conceptual interactivo' });
  }

  questStatus(): Locator {
    return this.questExplorer().getByRole('status');
  }

  robotHistory(): Locator {
    return this.questExplorer().locator('details.qx-history');
  }

  robotHistoryToggle(): Locator {
    return this.questExplorer().getByText('Traza de decisiones · últimos 6 intentos', {
      exact: true,
    });
  }

  packetVerdict(): Locator {
    return this.questExplorer().locator('.qx-verdict');
  }

  explorerButton(name: string): Locator {
    return this.page.getByRole('button', { name, exact: true });
  }

  explorerSelect(label: string): Locator {
    return this.page.getByRole('combobox', { name: startsWith(label) });
  }
}
