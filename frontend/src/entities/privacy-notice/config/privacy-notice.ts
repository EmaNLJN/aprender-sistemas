export interface PrivacyNoticeSection {
  readonly heading: string;
  readonly paragraphs: readonly string[];
}

export interface PrivacyNotice {
  readonly version: string;
  readonly title: string;
  readonly sections: readonly PrivacyNoticeSection[];
}

export const PRIVACY_NOTICE: PrivacyNotice = {
  version: '2026-10-dev',
  title: 'Aviso de privacidad',
  sections: [
    {
      heading: 'Un texto provisional',
      paragraphs: [
        'Este aviso es provisional y sirve para usar el taller en una computadora propia. Antes de abrir el taller a sus alumnos, quien lo administra lo reemplaza por el aviso definitivo.',
      ],
    },
    {
      heading: 'Qué guarda el taller',
      paragraphs: [
        'Tu nombre, tu email, tu rol, la fecha en que aceptaste este aviso y los datos de tus sesiones. Tu progreso sigue guardado en este navegador.',
      ],
    },
    {
      heading: 'Para qué',
      paragraphs: [
        'Para que ingreses con tu cuenta y para que quien administra el taller pueda invitarte y ayudarte a recuperar el acceso.',
      ],
    },
    {
      heading: 'Tus derechos',
      paragraphs: [
        'Podés pedirle a quien administra el taller una copia de tus datos o que borre tu cuenta (Ley 25.326, artículos 14 y 16).',
      ],
    },
  ],
};
