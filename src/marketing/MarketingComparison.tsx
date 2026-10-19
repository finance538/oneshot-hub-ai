import { useId, useState } from "react";
import {
  ArrowUpRight,
  Building2,
  MessagesSquare,
  Palette,
  ShieldCheck,
} from "lucide-react";
import { useAppearance } from "../storefront/i18n";
import { marketingCopy } from "./copy";
import "./marketing.css";

const trustIcons = [ShieldCheck, Building2, MessagesSquare];

export function MarketingComparison() {
  const { language } = useAppearance();
  const copy = marketingCopy[language];
  const [dimension, setDimension] = useState(1);
  const id = useId();
  const dimensions = [copy.cost, copy.workflow, copy.oversight];
  return (
    <section
      className="marketing-comparison"
      aria-labelledby={`${id}-title`}
      lang={language}
    >
      <header className="marketing-heading">
        <div>
          <span className="marketing-eyebrow">{copy.why}</span>
          <h2 id={`${id}-title`}>{copy.comparisonTitle}</h2>
        </div>
        <div
          className="marketing-filters"
          role="group"
          aria-label={copy.compareBy}
        >
          {dimensions.map((label, index) => (
            <button
              key={index}
              type="button"
              aria-pressed={dimension === index}
              aria-controls={`${id}-table`}
              onClick={() => setDimension(index)}
            >
              {label}
            </button>
          ))}
        </div>
      </header>
      <p className="marketing-scroll-hint" id={`${id}-scroll`}>
        {copy.scrollHint}
      </p>
      <div
        className="marketing-table-scroll"
        tabIndex={0}
        role="region"
        aria-label={copy.comparisonTitle}
        aria-describedby={`${id}-scroll`}
      >
        <table id={`${id}-table`}>
          <caption aria-live="polite">
            {copy.compareBy}: {dimensions[dimension]}
          </caption>
          <thead>
            <tr>
              {copy.columns.map((label, index) => (
                <th
                  key={index}
                  scope="col"
                  className={index === 3 ? "marketing-featured" : undefined}
                >
                  <span className="marketing-column-number" aria-hidden="true">
                    0{index + 1}
                  </span>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {copy.cells[dimension].map((cell, index) => (
                <td
                  key={index}
                  className={index === 3 ? "marketing-featured" : undefined}
                >
                  {cell}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="marketing-note">{copy.comparisonNote}</p>
      <div className="marketing-trust">
        {copy.trustTitles.map((title, index) => {
          const Icon = trustIcons[index];
          return (
            <article key={index}>
              <Icon size={21} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{copy.trustBodies[index]}</p>
              </div>
            </article>
          );
        })}
      </div>
      <aside className="marketing-brand" aria-label={copy.brandTitle}>
        <Palette size={26} strokeWidth={1.4} aria-hidden="true" />
        <div>
          <h3>{copy.brandTitle}</h3>
          <p>{copy.brandBody}</p>
        </div>
        <a
          className="marketing-link"
          href="https://brand.1shotcam.com/?studio=1"
          target="_blank"
          rel="noopener noreferrer"
        >
          {copy.brandAction}
          <ArrowUpRight size={17} aria-hidden="true" />
        </a>
      </aside>
      <p className="marketing-note">{copy.marketNote}</p>
    </section>
  );
}
