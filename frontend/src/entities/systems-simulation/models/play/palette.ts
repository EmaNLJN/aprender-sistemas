// Colors of the play scenes. Shares five hex values with the pc palette
// (background, ink, green, gold and the `grid` line, which pc calls `muted`) but each domain
// keeps its own: `muted` names different colors and the others do not match.
export const PLAY_PALETTE = {
  background: '#14271f',
  grid: '#355044',
  ink: '#f3efdb',
  muted: '#779286',
  gold: '#edb566',
  green: '#81d9a1',
  red: '#f08c85',
  blue: '#83c5e5',
  arena: '#203b2e',
  swamp: '#85634c',
  floor: '#264237',
} as const;
