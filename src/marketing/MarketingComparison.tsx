import { useId, useState } from "react";
import { ArrowUpRight, Globe2, ShieldCheck } from "lucide-react";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { marketingCopy } from "./copy";
import "./marketing.css";

export function MarketingComparison() {
  const { language } = useAppearance();
  const copy = marketingCopy[language];
  const [dimension, setDimension] = useState(0);
  const id = useId();
  const dimensions = [copy.cost, copy.workflow, copy.oversight];
  return (
    <section className="marketing-comparison" aria-labelledby={`${id}-title`}>
      <header className="marketing-heading">
        <div>
          <span className="marketing-eyebrow">{copy.why}</span>
          <h2 id={`${id}-title`}>{copy.comparisonTitle}</h2>
        </div>
        <a className="marketing-link" href={appearanceLink("/workforce")}>
          {copy.team}
          <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </header>
      <p className="marketing-market">
        <Globe2 size={18} aria-hidden="true" />
        {copy.examples}
      </p>
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
          <caption>{dimensions[dimension]}</caption>
          <thead>
            <tr>
              {copy.columns.map((label, index) => (
                <th
                  key={index}
                  scope="col"
                  className={index === 3 ? "marketing-featured" : undefined}
                >
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
        {copy.trustTitles.map((title, index) => (
          <article key={index}>
            <ShieldCheck size={21} aria-hidden="true" />
            <div>
              <h3>{title}</h3>
              <p>{copy.trustBodies[index]}</p>
            </div>
          </article>
        ))}
      </div>
      <p className="marketing-note">{copy.marketNote}</p>
    </section>
  );
}
