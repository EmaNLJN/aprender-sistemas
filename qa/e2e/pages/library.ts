import type { Locator, Page } from '@playwright/test';

export type LibraryCategoryName = 'Todos' | 'Ejercicios' | 'Proyectos' | 'Lectura' | 'Herramientas';
export type LibraryLanguageLabel = 'Todos los lenguajes' | 'Rust' | 'Go';
export type LibraryCostLabel = 'Cualquier acceso' | 'Acceso gratuito' | 'Gratis + pago';

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export class LibraryPage {
  readonly search: Locator;
  readonly languageFilter: Locator;
  readonly costFilter: Locator;
  readonly categories: Locator;
  readonly favoritesOnly: Locator;
  readonly results: Locator;
  readonly cards: Locator;
  readonly cardTitles: Locator;
  readonly emptyHeading: Locator;
  readonly clearFilters: Locator;

  constructor(readonly page: Page) {
    this.search = page.getByRole('searchbox', { name: 'Buscar recursos' });
    this.languageFilter = page.getByRole('combobox', { name: 'Filtrar por lenguaje' });
    this.costFilter = page.getByRole('combobox', { name: 'Filtrar por acceso' });
    this.categories = page.getByRole('group', { name: 'Tipo de recurso' });
    this.favoritesOnly = page.getByRole('checkbox', { name: 'Solo mis favoritos' });
    this.results = page
      .getByRole('status')
      .filter({ hasText: 'recursos · abrí cada uno a tu ritmo' });
    this.cards = page.getByRole('main').getByRole('article');
    this.cardTitles = this.cards.getByRole('heading', { level: 2 });
    this.emptyHeading = page.getByRole('heading', {
      level: 2,
      name: 'Ningún recurso con esos filtros.',
    });
    this.clearFilters = page.getByRole('button', { name: 'Limpiar filtros' });
  }

  category(name: LibraryCategoryName): Locator {
    return this.categories.getByRole('button', { name, exact: true });
  }

  card(title: string): Locator {
    return this.cards.filter({
      has: this.page.getByRole('heading', { level: 2, name: title, exact: true }),
    });
  }

  favoriteButton(title: string): Locator {
    return this.page.getByRole('button', {
      name: new RegExp(`^(Guardar en|Quitar de) favoritos: ${escapeRegExp(title)}$`),
    });
  }

  detail(title: string): Locator {
    return this.card(title).locator('details');
  }

  detailSummary(title: string): Locator {
    return this.card(title).getByText('Antes de empezar', { exact: true });
  }

  link(title: string): Locator {
    return this.card(title).getByRole('link', { name: 'Explorar recurso' });
  }

  async searchFor(text: string): Promise<void> {
    await this.search.clear();
    await this.search.pressSequentially(text);
  }

  async chooseLanguage(label: LibraryLanguageLabel): Promise<void> {
    await this.languageFilter.selectOption({ label });
  }

  async chooseCost(label: LibraryCostLabel): Promise<void> {
    await this.costFilter.selectOption({ label });
  }

  async chooseCategory(name: LibraryCategoryName): Promise<void> {
    await this.category(name).click();
  }

  async toggleFavorite(title: string): Promise<void> {
    await this.favoriteButton(title).click();
  }
}
