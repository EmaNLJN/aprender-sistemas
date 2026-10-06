import { expect, test } from '../fixtures';
import { RUST_02 } from '../lib/compiler-results';
import { computedStyle } from '../lib/computed-style';
import { urls } from '../lib/urls';

// The nine rules that legacy-map.md §7 lists as crossing sheets, and a tenth (R10) that the map leaves
// out. The values are what the CSS says today (the file and rule are named on each test); F2 moves
// the rules and the values must not change. The widths are the ones where a media query starts or
// stops matching.
const HEIGHT = 900;

test.describe('R1 · .lab-nav-count (lab.css)', () => {
  test('the counter of the menu entry', async ({ shell, page }) => {
    await shell.goto(urls.view('recorrido'));
    expect(
      await computedStyle(page.locator('.lab-nav-count'), [
        'background-color',
        'color',
        'border-radius',
        'padding',
        'opacity',
      ]),
    ).toEqual({
      'background-color': 'rgb(172, 72, 41)',
      color: 'rgb(255, 249, 239)',
      'border-radius': '9px',
      padding: '1px 6px',
      opacity: '1',
    });
  });

  test('the counter of the current entry', async ({ shell, page }) => {
    await shell.goto(urls.view('laboratorio'));
    expect(
      await computedStyle(page.locator('.lab-nav-count'), ['background-color', 'color']),
    ).toEqual({
      'background-color': 'rgb(212, 162, 128)',
      color: 'rgb(34, 43, 35)',
    });
  });
});

test.describe('R2 · .navigation (lab.css, at 850 px and at 590 px)', () => {
  const rows: {
    width: number;
    navigation: Record<string, string>;
    link: Record<string, string>;
    count: string;
    symbol: string;
  }[] = [
    {
      width: 981,
      navigation: { display: 'flex', 'flex-direction': 'column', gap: '8px' },
      link: { 'font-size': '13px', padding: '11px 10px', gap: '12px', 'min-height': 'auto' },
      count: 'block',
      symbol: '20px',
    },
    {
      width: 850,
      navigation: { display: 'flex', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px', gap: '6px', 'min-height': 'auto' },
      count: 'none',
      symbol: '16px',
    },
    {
      width: 650,
      navigation: { display: 'flex', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px', gap: '6px', 'min-height': 'auto' },
      count: 'none',
      symbol: '16px',
    },
    {
      width: 590,
      navigation: { display: 'grid', 'flex-direction': 'row', gap: '3px' },
      link: { 'font-size': '10px', padding: '8px 5px', gap: '5px', 'min-height': '40px' },
      count: 'none',
      symbol: '14px',
    },
  ];
  for (const row of rows) {
    test(`at ${row.width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width: row.width, height: HEIGHT });
      await shell.goto(urls.view('laboratorio'));

      expect(await computedStyle(page.locator('.navigation'), Object.keys(row.navigation))).toEqual(
        row.navigation,
      );
      expect(await computedStyle(page.locator('.navigation a'), Object.keys(row.link))).toEqual(
        row.link,
      );
      expect(await computedStyle(page.locator('.navigation .nav-count'), ['display'])).toEqual({
        display: row.count,
      });
      expect(await computedStyle(page.locator('.navigation .nav-symbol'), ['font-size'])).toEqual({
        'font-size': row.symbol,
      });
      if (row.width === 590) {
        const columns = await computedStyle(page.locator('.navigation'), ['grid-template-columns']);
        expect(columns['grid-template-columns'].split(' ')).toHaveLength(3);
      }
    });
  }
});

test.describe('R3 · .sidebar and .sidebar-bottom (lab.css, from 981 px)', () => {
  test('at 981 px', async ({ shell, page }) => {
    await page.setViewportSize({ width: 981, height: HEIGHT });
    await shell.goto(urls.view('recorrido'));

    expect(await computedStyle(page.locator('.sidebar'), ['overflow-y', 'min-height'])).toEqual({
      'overflow-y': 'auto',
      'min-height': '0px',
    });
    expect(await computedStyle(page.locator('.navigation'), ['flex-shrink'])).toEqual({
      'flex-shrink': '0',
    });
    expect(
      await computedStyle(page.locator('.sidebar-bottom'), ['padding-top', 'display']),
    ).toEqual({ 'padding-top': '30px', display: 'block' });
  });

  test('at 850 px the rules no longer apply', async ({ shell, page }) => {
    await page.setViewportSize({ width: 850, height: HEIGHT });
    await shell.goto(urls.view('recorrido'));

    expect(await computedStyle(page.locator('.sidebar'), ['overflow-y'])).toEqual({
      'overflow-y': 'visible',
    });
    expect(
      await computedStyle(page.locator('.sidebar-bottom'), ['padding-top', 'display']),
    ).toEqual({ 'padding-top': '42px', display: 'none' });
  });
});

test.describe('R4 · touch-action (lab.css, global)', () => {
  test('buttons, links, inputs, selects and summaries', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));
    const touch = ['touch-action'];
    const manipulation = { 'touch-action': 'manipulation' };

    expect(await computedStyle(page.getByRole('button').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('link').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('searchbox'), touch)).toEqual(manipulation);
    expect(await computedStyle(page.getByRole('combobox').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.locator('summary').first(), touch)).toEqual(manipulation);
    expect(await computedStyle(page.locator('main div').first(), touch)).toEqual({
      'touch-action': 'auto',
    });
  });
});

test.describe('R5 · .sr-only (lab.css)', () => {
  test('hides its text from the eye and keeps it for the reader', async ({ shell, page }) => {
    await shell.goto(urls.view('biblioteca'));

    expect(
      await computedStyle(page.locator('.sr-only'), [
        'position',
        'width',
        'height',
        'padding',
        'margin',
        'overflow',
        'clip',
        'white-space',
        'border-top-width',
      ]),
    ).toEqual({
      position: 'absolute',
      width: '1px',
      height: '1px',
      padding: '0px',
      margin: '-1px',
      overflow: 'hidden',
      clip: 'rect(0px, 0px, 0px, 0px)',
      'white-space': 'nowrap',
      'border-top-width': '0px',
    });
  });
});

test.describe('R6 · .quest-banner (campaign.css)', () => {
  const rows: [number, string, string][] = [
    [981, 'flex', '0px'],
    [650, 'block', '14px'],
  ];
  for (const [width, display, buttonMargin] of rows) {
    test(`in the lab map at ${width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.view('laboratorio'));

      expect(
        await computedStyle(page.locator('.quest-banner'), [
          'display',
          'justify-content',
          'align-items',
          'gap',
          'padding',
          'border-radius',
          'margin',
        ]),
      ).toEqual({
        display,
        'justify-content': 'space-between',
        'align-items': 'center',
        gap: '20px',
        padding: '20px 24px',
        'border-radius': '6px',
        margin: '25px 0px',
      });
      expect(
        await computedStyle(page.locator('.quest-banner .button'), ['flex-shrink', 'margin-top']),
      ).toEqual({ 'flex-shrink': '0', 'margin-top': buttonMargin });
    });
  }
});

test.describe('R7 · .quest-lab-context (campaign.css)', () => {
  const rows: [number, string, string, string][] = [
    [981, '13px', '10px', '18px'],
    [650, '8px', '9px', '16.2px'],
  ];
  for (const [width, gap, fontSize, lineHeight] of rows) {
    test(`in a campaign mission at ${width} px`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.campaignMission('rust-world-1', 'rust-02'));

      expect(
        await computedStyle(page.locator('.quest-lab-context'), [
          'display',
          'flex-wrap',
          'gap',
          'justify-content',
          'padding',
          'border-radius',
          'margin',
          'font-size',
          'line-height',
          'background-color',
        ]),
      ).toEqual({
        display: 'flex',
        'flex-wrap': 'wrap',
        gap,
        'justify-content': 'space-between',
        padding: '14px 17px',
        'border-radius': '5px',
        margin: '0px 0px 20px',
        'font-size': fontSize,
        'line-height': lineHeight,
        'background-color': 'rgb(232, 236, 223)',
      });
      expect(
        await computedStyle(page.locator('.quest-lab-context a'), ['color', 'font-weight']),
      ).toEqual({ color: 'rgb(172, 72, 41)', 'font-weight': '600' });
    });
  }
});

test.describe('R8 · .navigation a:last-child (campaign.css, at 650 px; lab.css, at 590 px)', () => {
  // Dead CSS, found by F1: both copies of the rule say `grid-column: auto`, the initial value, and no
  // rule gives the menu links another column. Deleting them changes nothing the student sees, and
  // this test cannot notice it. It fails only if the winning copy (campaign.css, which loads after
  // lab.css) gets another value.
  for (const width of [650, 590]) {
    test(`at ${width} px the last link keeps its automatic column`, async ({ shell, page }) => {
      await page.setViewportSize({ width, height: HEIGHT });
      await shell.goto(urls.view('recorrido'));

      expect(
        await computedStyle(page.locator('.navigation a:last-child'), [
          'grid-column-start',
          'grid-column-end',
        ]),
      ).toEqual({
        'grid-column-start': 'auto',
        'grid-column-end': 'auto',
      });
    });
  }
});

test.describe('R9 · .lab-empty (lab.css, used by Systems)', () => {
  test('the empty state of the catalog', async ({ shell, systems, page }) => {
    await shell.goto(urls.workshop('rust'));
    await systems.search().fill('zzzz');
    await expect(systems.emptyCatalog()).toBeVisible();

    expect(
      await computedStyle(page.locator('.lab-empty'), [
        'grid-column-start',
        'grid-column-end',
        'text-align',
        'padding',
        'border-top-style',
        'border-top-width',
        'border-top-left-radius',
      ]),
    ).toEqual({
      'grid-column-start': '1',
      'grid-column-end': '-1',
      'text-align': 'center',
      padding: '40px',
      'border-top-style': 'dashed',
      'border-top-width': '1px',
      'border-top-left-radius': '5px',
    });
    expect(await computedStyle(page.locator('.lab-empty h2'), ['font-size'])).toEqual({
      'font-size': '23px',
    });
    expect(await computedStyle(page.locator('.lab-empty p'), ['font-size'])).toEqual({
      'font-size': '12px',
    });
  });
});

test.describe('R10 · .quest-direct-lock (campaign.css, drawn inside the lab)', () => {
  // legacy-map.md §7 leaves this rule out: campaign.css styles it and the lab draws it. Deleting
  // campaign.css (F6) before the lab drops the lock bridge (F7) would unstyle it without any notice.
  test('the lock of a mission that is not open yet', async ({ shell, lab, page }) => {
    await shell.goto(urls.campaignMission('rust-world-1', 'rust-103'));
    await expect(lab.campaignLockHeading()).toBeVisible();

    expect(
      await computedStyle(page.locator('.quest-direct-lock h1'), [
        'font-size',
        'letter-spacing',
        'line-height',
      ]),
    ).toEqual({ 'font-size': '40px', 'letter-spacing': '-1.4px', 'line-height': '44px' });
    expect(
      await computedStyle(page.locator('.quest-direct-lock h1 em'), [
        'font-family',
        'font-weight',
        'color',
      ]),
    ).toEqual({
      'font-family': 'Georgia, "Times New Roman", serif',
      'font-weight': '400',
      color: 'rgb(172, 72, 41)',
    });
    for (const text of ['p', 'li']) {
      expect(
        await computedStyle(page.locator(`.quest-direct-lock ${text}`), [
          'font-size',
          'line-height',
        ]),
      ).toEqual({ 'font-size': '13px', 'line-height': '24.7px' });
    }
    expect(await computedStyle(page.locator('.quest-direct-lock ul'), ['margin'])).toEqual({
      margin: '25px 0px',
    });
  });
});

test.describe('reduced motion (styles.css)', () => {
  test.describe('when the student asks for it', () => {
    test.use({ reducedMotion: 'reduce' });

    test('transitions and smooth scrolling are off', async ({ shell, page }) => {
      await shell.goto(urls.view('campana'));

      expect(await computedStyle(page.locator('html'), ['scroll-behavior'])).toEqual({
        'scroll-behavior': 'auto',
      });
      expect(
        await computedStyle(page.locator('.button').first(), [
          'transition-property',
          'transition-duration',
        ]),
      ).toEqual({ 'transition-property': 'none', 'transition-duration': '0s' });
      expect(await computedStyle(page.locator('.world-node'), ['transition-property'])).toEqual({
        'transition-property': 'none',
      });
    });
  });

  test.describe('when the student does not', () => {
    test.use({ reducedMotion: 'no-preference' });

    test('the page scrolls smoothly and the buttons and world nodes have their transitions', async ({
      shell,
      page,
    }) => {
      await shell.goto(urls.view('campana'));

      expect(await computedStyle(page.locator('html'), ['scroll-behavior'])).toEqual({
        'scroll-behavior': 'smooth',
      });
      expect(await computedStyle(page.locator('.button').first(), ['transition-property'])).toEqual(
        { 'transition-property': 'background' },
      );
      expect(
        await computedStyle(page.locator('.world-node').first(), ['transition-property']),
      ).toEqual({ 'transition-property': 'transform, box-shadow' });
    });
  });
});

test.describe('reduced motion and the run indicator (lab.css)', () => {
  const rows: ['reduce' | 'no-preference', string][] = [
    ['reduce', 'none'],
    ['no-preference', 'lab-spin'],
  ];
  for (const [motion, animation] of rows) {
    test.describe(`with ${motion}`, () => {
      test.use({ reducedMotion: motion });

      test(`the spinner animation is ${animation}`, async ({ shell, lab, compiler, page }) => {
        await compiler.hold(RUST_02);
        await shell.goto(urls.exercise(RUST_02.id, 'code'));

        await lab.runCode();

        await expect(page.locator('.lab-spinner').first()).toBeVisible();
        expect(
          await computedStyle(page.locator('.lab-spinner').first(), ['animation-name']),
        ).toEqual({
          'animation-name': animation,
        });
      });
    });
  }
});
