import type { ReactNode, Ref } from 'react';
import { LEVEL_LABELS } from '../../../shared/config/levels';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import { FAMILY_LABELS, FAMILY_SYMBOLS } from '../model/catalog-filter';
import type { SystemsLanguage, SystemsWorkshopView } from '../model/types';

const PART_TABS: readonly (readonly [WorkshopPart, string])[] = [
  ['explore', 'Manipulá el sistema'],
  ['build', 'Programá su núcleo'],
  ['ship', 'Llevátelo a un proyecto'],
];

interface WorkshopDetailProps {
  workshop: SystemsWorkshopView;
  language: SystemsLanguage;
  part: WorkshopPart;
  headingRef: Ref<HTMLHeadingElement>;
  tabsRef: Ref<HTMLDivElement>;
  onBack: () => void;
  onPartChange: (part: WorkshopPart) => void;
  children: ReactNode;
}

const WorkshopDetail = ({
  workshop,
  language,
  part,
  headingRef,
  tabsRef,
  onBack,
  onPartChange,
  children,
}: WorkshopDetailProps) => {
  const seals: readonly (readonly [boolean, string, string])[] = [
    [workshop.modelDone, '01', 'Modelo explorado'],
    [workshop.progress.code, '02', 'Código verificado'],
    [workshop.progress.predicted, '03', 'Checkpoint razonado'],
  ];
  return (
    <>
      <div className="sys-breadcrumb">
        <button onClick={onBack}>← Todos los talleres</button>
        <span>{`${FAMILY_LABELS[workshop.category]} / ${LEVEL_LABELS[workshop.level]}`}</span>
      </div>
      <header className="sys-detail-heading">
        <div className="eyebrow">
          {FAMILY_SYMBOLS[workshop.category]} {language.toUpperCase()} · {workshop.minutes} MIN
          ORIENTATIVOS
        </div>
        <h1 tabIndex={-1} ref={headingRef}>
          {workshop.title}
        </h1>
        <p>{workshop.story}</p>
      </header>
      <div className="sys-seals" aria-label="Progreso del taller">
        {seals.map(([done, number, label]) => (
          <span key={number} className={done ? 'earned' : ''}>
            <b>{done ? '✓' : number}</b>
            {label}
          </span>
        ))}
      </div>
      {workshop.storageAvailable ? null : (
        <p className="sys-storage" role="status">
          No se pudo guardar el progreso. Exportá una copia antes de cerrar.
        </p>
      )}
      <div className="sys-tabs" role="group" aria-label="Etapas del taller" ref={tabsRef}>
        {PART_TABS.map(([id, label], index) => (
          <button key={id} aria-pressed={part === id} onClick={() => onPartChange(id)}>
            <span>0{index + 1}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="sys-phase">{children}</div>
    </>
  );
};

export default WorkshopDetail;
