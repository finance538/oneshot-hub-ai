import { ArrowUpRight, Building2, Globe2, MessageSquare } from "lucide-react";
import { appearanceLink, useAppearance } from "../storefront/i18n";
import { marketingCopy } from "./copy";
import "./marketing.css";

export function MarketingMarket() {
  const { language } = useAppearance();
  const copy = marketingCopy[language];
  return (
    <div className="marketing-market" lang={language}>
      <Globe2 size={17} aria-hidden="true" />
      <div>
        <strong>{copy.marketLabel}</strong>
        <p>{copy.examples}</p>
      </div>
    </div>
  );
}

export function MarketingModes() {
  const { language } = useAppearance();
  const copy = marketingCopy[language];
  const modes = [
    {
      id: "chat",
      Icon: MessageSquare,
      title: copy.chatTitle,
      body: copy.chatBody,
    },
    {
      id: "headquarters",
      Icon: Building2,
      title: copy.officeTitle,
      body: copy.officeBody,
    },
  ];
  return (
    <aside
      className="marketing-modes"
      aria-label={copy.modesTitle}
      lang={language}
    >
      <header>
        <span className="marketing-wordmark" dir="ltr">
          one<span>Shot</span>
        </span>
        <h2>{copy.modesTitle}</h2>
      </header>
      {modes.map(({ id, Icon, title, body }, index) => (
        <a
          key={id}
          className="marketing-mode"
          href={appearanceLink(`/workforce?view=office&mode=${id}`)}
        >
          <span className="marketing-mode-icon">
            <Icon size={26} strokeWidth={1.4} aria-hidden="true" />
          </span>
          <div>
            <span className="marketing-mode-number" aria-hidden="true">
              0{index + 1}
            </span>
            <h3>{title}</h3>
            <p>{body}</p>
          </div>
          <ArrowUpRight
            className="marketing-mode-arrow"
            size={19}
            aria-hidden="true"
          />
        </a>
      ))}
      <p className="marketing-mode-note">{copy.modeAction}</p>
    </aside>
  );
}
