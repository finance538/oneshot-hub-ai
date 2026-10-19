import { useState } from "react";
import { ArrowUpRight, RotateCcw, TrendingUp, Clock3 } from "lucide-react";
import { useAppearance } from "../storefront/i18n";

export default function ROICalculator({ onEnter }: { onEnter: () => void }) {
  const { tr, number } = useAppearance();
  const initial = {
    traditional: 12000,
    digital: 2400,
    hours: 80,
    reduction: 50,
  };
  const [values, setValues] = useState(initial);
  const saved = values.traditional - values.digital,
    hours = (values.hours * values.reduction) / 100;
  const ratio = values.traditional ? (saved / values.traditional) * 100 : null;
  const fields = [
    [
      "traditional",
      tr("تكلفتك الحالية شهرياً", "Current monthly cost"),
      100000,
      100,
      "SAR",
    ],
    [
      "digital",
      tr("ميزانيتك الرقمية شهرياً", "Monthly digital budget"),
      100000,
      100,
      "SAR",
    ],
    [
      "hours",
      tr("ساعات العمل المتكرر شهرياً", "Repetitive work hours / month"),
      744,
      1,
      tr("ساعة", "hours"),
    ],
    [
      "reduction",
      tr("نسبة الوقت المتوقع اختصاره", "Expected time reduction"),
      100,
      1,
      "%",
    ],
  ] as const;
  return (
    <section id="comparison" className="lux-roi hub-wrap hub-section">
      <div className="lux-section-heading">
        <div>
          <span className="hub-kicker">03 / YOUR TIME IS YOUR CAPITAL</span>
          <h2>
            {tr("الأرقام تتحدث. القرار لك.", "The numbers speak. You decide.")}
          </h2>
        </div>
        <span className="lux-pill">
          {tr("حاسبة تقديرية تفاعلية", "Interactive estimate")}
        </span>
      </div>
      <div className="lux-roi-grid">
        <div className="lux-roi-controls">
          <p>
            {tr(
              "غيّر الافتراضات لتكتشف ما قد تستعيده من وقت وميزانية. الأرقام الأولية مثال توضيحي وليست أسعار باقات.",
              "Adjust the assumptions to explore potential savings. Initial values illustrate a scenario; they are not package prices.",
            )}
          </p>
          {fields.map(([key, label, max, step, unit]) => (
            <div className="lux-range-field" key={key}>
              <label htmlFor={`roi-${key}`}>{label}</label>
              <div>
                <input
                  id={`roi-${key}`}
                  type="number"
                  min="0"
                  max={max}
                  step={step}
                  value={values[key]}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [key]: Math.max(
                        0,
                        Math.min(max, Number(e.target.value) || 0),
                      ),
                    })
                  }
                />
                <span>{unit}</span>
              </div>
              <input
                aria-label={label}
                type="range"
                min="0"
                max={max}
                step={step}
                value={values[key]}
                onChange={(e) =>
                  setValues({ ...values, [key]: Number(e.target.value) })
                }
              />
            </div>
          ))}
          <button className="hub-text-link" onClick={() => setValues(initial)}>
            <RotateCcw size={14} />
            {tr("إعادة المثال", "Reset example")}
          </button>
        </div>
        <div className="lux-roi-result" aria-live="polite" aria-atomic="true">
          <span className="hub-kicker">
            {tr(
              "فارق الميزانية المحتمل / شهر",
              "POTENTIAL BUDGET DIFFERENCE / MONTH",
            )}
          </span>
          <div className="lux-roi-number" dir="ltr">
            {number(saved)} <small>SAR</small>
          </div>
          <p>
            {saved < 0
              ? tr(
                  "الميزانية الرقمية أعلى في هذا السيناريو.",
                  "The digital budget is higher in this scenario.",
                )
              : tr(
                  "ميزانية يمكنك إعادة توجيهها إلى نمو أعمالك.",
                  "Budget you could redirect toward growing your business.",
                )}
          </p>
          <div className="lux-roi-stat">
            <span>
              <TrendingUp size={18} />
              {tr("فارق التكلفة", "Cost difference")}
            </span>
            <strong dir="ltr">
              {ratio === null ? "—" : `${number(Math.round(ratio))}%`}
            </strong>
          </div>
          <div className="lux-roi-stat">
            <span>
              <Clock3 size={18} />
              {tr("وقت متوقع استعادته", "Potential time recovered")}
            </span>
            <strong>
              {number(Math.round(hours * 10) / 10)}{" "}
              {tr("ساعة / شهر", "h / month")}
            </strong>
          </div>
          <button className="hub-button hub-primary" onClick={onEnter}>
            {tr(
              "ناقش خطتك مع فريقك الذكي",
              "Discuss your plan with your AI team",
            )}
            <ArrowUpRight size={17} />
          </button>
          <small>
            {tr(
              "الفارق = التكلفة الحالية − الميزانية الرقمية. الوقت = الساعات × نسبة الاختصار. لا يشمل ضرائب أو إعداداً أو تكاليف إضافية، ولا يضمن نتائج متكافئة أو وفراً فعلياً.",
              "Difference = current cost − digital budget. Time = hours × reduction. Excludes taxes, setup and additional costs; equivalent outputs and actual savings are not guaranteed.",
            )}
          </small>
        </div>
      </div>
    </section>
  );
}
