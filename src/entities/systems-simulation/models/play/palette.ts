// Colores de las escenas de play. Comparte cinco valores hex con la paleta de pc
// (fondo, tinta, verde, dorado y la línea `grid`, que pc llama `muted`) pero cada dominio
// conserva la suya: `muted` nombra colores distintos y los demás no coinciden.
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
