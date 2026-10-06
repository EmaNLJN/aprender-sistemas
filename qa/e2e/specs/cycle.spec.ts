import { expect, test } from '../fixtures';
import {
  GO_113,
  RUST_02,
  type CompilerKind,
  type ExerciseUnderTest,
} from '../lib/compiler-results';
import { urls } from '../lib/urls';

const KINDS: CompilerKind[] = ['passed', 'failedTest', 'compileError', 'transportError'];

interface Review {
  heading: string;
  detail: string;
}

// What the student reads for each result. The texts are the Spanish copy of the lab (lab.js:
// reviewHTML and diagnose) and of the exercise (content/<language>/exercises/<id>/exercise.yaml).
const TRANSPORT: Review = {
  heading: 'No pude ejecutar esta vez.',
  detail: 'No se pudo conectar al Playground.',
};
const REVIEW: Record<string, Record<CompilerKind, Review>> = {
  [RUST_02.id]: {
    passed: {
      heading: 'La idea funciona en estos casos.',
      detail: 'Ahora la declaración anticipa las modificaciones.',
    },
    failedTest: {
      heading: '2 de 3: encontramos algo para explorar.',
      detail: 'Inicializá nivel con inicial.',
    },
    compileError: {
      heading: 'El programa nos dejó una pista.',
      detail: 'Estás intentando modificar un binding o acceder con mutabilidad',
    },
    transportError: TRANSPORT,
  },
  [GO_113.id]: {
    passed: {
      heading: 'La idea funciona en estos casos.',
      detail: 'La traza distingue actualización de recencia, expulsión y capacidad cero.',
    },
    failedTest: {
      heading: '2 de 3: encontramos algo para explorar.',
      detail: 'Contá los misses incluso si no insertás.',
    },
    compileError: {
      heading: 'El programa nos dejó una pista.',
      detail: 'Go detectó una variable local o un import que no se usa.',
    },
    transportError: TRANSPORT,
  },
};

function expectedReview(exercise: ExerciseUnderTest, kind: CompilerKind): Review {
  return REVIEW[exercise.id][kind];
}

test.describe('a campaign mission with the Rust Playground simulated', () => {
  for (const kind of KINDS) {
    test(`${kind}: ${kind === 'passed' ? 'the campaign counts it' : 'nothing is marked'}`, async ({
      shell,
      lab,
      campaign,
      compiler,
      pageIssues,
    }) => {
      if (kind === 'transportError')
        pageIssues.expectIssue(
          /Failed to load resource: net::ERR_FAILED/,
          'el doble aborta el pedido a propósito',
        );
      await compiler.answer(RUST_02, kind);
      await shell.goto(urls.campaignMission('rust-world-1', RUST_02.id, 'code'));

      await lab.runCode();

      const review = expectedReview(RUST_02, kind);
      await expect(lab.reviewHeading()).toHaveText(review.heading);
      await expect(lab.review()).toContainText(review.detail);
      expect(compiler.requests).toHaveLength(1);
      if (kind === 'passed')
        await expect(shell.toast).toHaveText('+20 XP. Tu progreso de campaña está actualizado.');

      await lab.contextBackLink().click();
      const mission = campaign.missionCard('Repará el contador inmutable');
      if (kind === 'passed') {
        await expect(mission).toContainText('20/30 XP');
        await expect(mission).toContainText('✓ Pruebas · 20');
      } else {
        await expect(mission).toContainText('0/30 XP');
        await expect(mission).toContainText('○ Pruebas · 20');
      }
    });
  }
});

test.describe('a Systems core with the Go Playground simulated', () => {
  for (const kind of KINDS) {
    test(`${kind}: ${kind === 'passed' ? 'the code seal appears' : 'no seal'}`, async ({
      shell,
      lab,
      systems,
      compiler,
      pageIssues,
    }) => {
      if (kind === 'transportError')
        pageIssues.expectIssue(
          /Failed to load resource: net::ERR_FAILED/,
          'el doble aborta el pedido a propósito',
        );
      await compiler.answer(GO_113, kind);
      await shell.goto(urls.systemsCode('cache', GO_113.id));

      await lab.runCode();

      const review = expectedReview(GO_113, kind);
      await expect(lab.reviewHeading()).toHaveText(review.heading);
      await expect(lab.review()).toContainText(review.detail);
      expect(compiler.requests).toHaveLength(1);

      await lab.contextBackLink().click();
      const codeSeal = systems.seals().locator('span', { hasText: 'Código verificado' });
      if (kind === 'passed') await expect(codeSeal).toContainText('✓');
      else await expect(codeSeal).not.toContainText('✓');
    });
  }
});
