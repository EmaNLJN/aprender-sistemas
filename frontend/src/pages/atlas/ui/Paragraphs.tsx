import { Fragment } from 'react';

interface ParagraphsProps {
  children: string;
}

const Paragraphs = ({ children }: ParagraphsProps) =>
  children
    .split(/\n\s*\n/)
    .filter(Boolean)
    .map((paragraph, paragraphIndex) => (
      <p key={paragraphIndex}>
        {paragraph.split('\n').map((line, lineIndex) => (
          <Fragment key={lineIndex}>
            {lineIndex > 0 ? <br /> : null}
            {line}
          </Fragment>
        ))}
      </p>
    ));

export default Paragraphs;
