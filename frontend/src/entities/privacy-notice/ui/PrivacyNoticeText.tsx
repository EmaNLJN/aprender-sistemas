import { PRIVACY_NOTICE } from '../config/privacy-notice';

interface PrivacyNoticeTextProps {
  readonly headingLevel: 2 | 3;
}

const PrivacyNoticeText = ({ headingLevel }: PrivacyNoticeTextProps) => {
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <div className="privacy-notice">
      {PRIVACY_NOTICE.sections.map((section) => (
        <section key={section.heading}>
          <Heading>{section.heading}</Heading>
          {section.paragraphs.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </section>
      ))}
    </div>
  );
};

export default PrivacyNoticeText;
