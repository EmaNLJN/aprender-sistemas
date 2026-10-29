import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useStore } from 'zustand';
import { systemsEngine } from '../../../entities/systems-workshop';
import type { WorkshopPart } from '../../../shared/config/url-grammar';
import type { SystemsPageProps } from '../model/types';
import useWorkshopSelection from '../model/useWorkshopSelection';
import { workshopViews } from '../model/workshop-views';
import BuildPart from './BuildPart';
import ExplorePart from './ExplorePart';
import ShipPart from './ShipPart';
import SystemsCatalog from './SystemsCatalog';
import WorkshopDetail from './WorkshopDetail';

const selectRevision = (state: { revision: number }) => state.revision;

const SystemsPage = ({
  language,
  models,
  exercises,
  notify,
  downloadKit,
  scrollToTop,
}: SystemsPageProps) => {
  useStore(systemsEngine.changes, selectRevision);
  const selection = useWorkshopSelection(language);
  const [returnFocusTo, setReturnFocusTo] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);
  const workshops = workshopViews(language);
  const workshop = workshops.find((item) => item.id === selection.workshopId);

  const openWorkshop = (workshopId: string) => {
    // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- the heading has to exist before it takes the focus
    flushSync(() => selection.open(workshopId));
    headingRef.current?.focus();
    scrollToTop();
  };

  if (!workshop)
    return (
      <SystemsCatalog
        language={language}
        workshops={workshops}
        returnFocusTo={returnFocusTo}
        onOpen={openWorkshop}
      />
    );

  const backToCatalog = () => {
    // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- the catalog has to exist before the focus returns to it
    flushSync(() => {
      setReturnFocusTo(workshop.id);
      selection.close();
    });
    scrollToTop();
  };

  const changePart = (part: WorkshopPart) => {
    // eslint-disable-next-line @eslint-react/dom-no-flush-sync -- the pressed tab has to exist before it takes the focus
    flushSync(() => selection.changePart(workshop.id, part));
    tabsRef.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus({ preventScroll: true });
    tabsRef.current?.scrollIntoView({ block: 'start' });
  };

  return (
    <WorkshopDetail
      workshop={workshop}
      language={language}
      part={selection.part}
      headingRef={headingRef}
      tabsRef={tabsRef}
      onBack={backToCatalog}
      onPartChange={changePart}
    >
      {selection.part === 'explore' ? (
        <ExplorePart
          workshop={workshop}
          language={language}
          model={models[workshop.model]}
          notify={notify}
          onPartChange={changePart}
        />
      ) : null}
      {selection.part === 'build' ? (
        <BuildPart
          workshop={workshop}
          language={language}
          exercises={exercises}
          onPartChange={changePart}
        />
      ) : null}
      {selection.part === 'ship' ? (
        <ShipPart
          workshop={workshop}
          language={language}
          notify={notify}
          downloadKit={downloadKit}
        />
      ) : null}
    </WorkshopDetail>
  );
};

export default SystemsPage;
