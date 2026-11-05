import {
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import {
  CalendarClock,
  Crosshair,
  ExternalLink,
  Search,
  ShieldCheck,
  Sparkles,
  Swords,
} from "lucide-react";
import {
  slotById,
  statById,
  styleById,
  styles,
} from "../../shared/gaming/attachments";
import {
  arsenalPath as gamingPath,
  classById,
  findGame,
  findWeapon,
  games,
  weaponClasses,
  weaponsByClass,
} from "../../shared/gaming/games";
import {
  buildsFor,
  classProfile,
  rankSlot,
  recommend,
} from "../../shared/gaming/engine";
import type {
  Game,
  SlotPick,
  StyleId,
  Weapon,
  WeaponClassId,
} from "../../shared/gaming/types";
import { applyHead } from "./head";
import "./arsenal.css";

export const ARSENAL_PATH = gamingPath();

/** The canonical path plus the playstyle, so every step is a shareable link. */
const arsenalPath = (gameId?: string, weaponId?: string, style?: StyleId) => {
  const path = gamingPath(gameId, weaponId);
  return style ? `${path}?style=${style}` : path;
};

/** Signed, directional figure: the data is a direction, never a percentage. */
const signed = (value: number) =>
  `${value > 0 ? "+" : "−"}${Math.abs(value).toLocaleString("en-US")}`;

function Breadcrumb({ ar, game }: { ar: boolean; game?: Game }) {
  return (
    <nav
      className="tools-crumbs"
      aria-label={ar ? "مسار التنقل" : "Breadcrumb"}
    >
      <a href="/">{ar ? "الرئيسية" : "Home"}</a>
      <span aria-hidden="true">›</span>
      <a href="/tools">{ar ? "الأدوات" : "Tools"}</a>
      <span aria-hidden="true">›</span>
      <a href="/tools/gaming">{ar ? "الألعاب" : "Gaming"}</a>
      <span aria-hidden="true">›</span>
      {game ? (
        <>
          <a href={ARSENAL_PATH}>{ar ? "ترسانة كود" : "COD arsenal"}</a>
          <span aria-hidden="true">›</span>
          <span>{ar ? game.ar : game.short}</span>
        </>
      ) : (
        <span>{ar ? "ترسانة كود" : "COD arsenal"}</span>
      )}
    </nav>
  );
}

/** Step 1 — the game. Titles without a checked dataset say so plainly. */
function GamePicker({
  ar,
  onPick,
}: {
  ar: boolean;
  onPick: (id: string) => void;
}) {
  return (
    <ul className="arsenal-games">
      {games.map((game) => {
        const ready = game.weapons.length > 0;
        return (
          <li key={game.id}>
            <button
              type="button"
              onClick={() => ready && onPick(game.id)}
              disabled={!ready}
              aria-disabled={!ready}
            >
              <span className="arsenal-game-emoji" aria-hidden="true">
                {game.emoji}
              </span>
              <span>
                <strong>{ar ? game.ar : game.name}</strong>
                <small>{ar ? game.blurbAr : game.blurbEn}</small>
                <span className="arsenal-badge">
                  {ready
                    ? ar
                      ? `${game.weapons.length} سلاح · محدّثة ${game.checkedOn}`
                      : `${game.weapons.length} weapons · checked ${game.checkedOn}`
                    : ar
                      ? "لم تُضف بياناتها بعد"
                      : "Dataset not gathered yet"}
                </span>
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Step 2 — the weapon, searchable and grouped by class. */
function WeaponPicker({
  ar,
  game,
  onPick,
}: {
  ar: boolean;
  game: Game;
  onPick: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<WeaponClassId | "all">("all");
  const deferred = useDeferredValue(query).trim().toLowerCase();
  const groups = useMemo(() => weaponsByClass(game), [game]);
  const matches = (weapon: Weapon) =>
    !deferred ||
    weapon.name.toLowerCase().includes(deferred) ||
    weapon.ar.includes(deferred) ||
    weapon.id.includes(deferred);
  const shown = groups
    .filter((group) => tab === "all" || group.class.id === tab)
    .map((group) => ({ ...group, weapons: group.weapons.filter(matches) }))
    .filter((group) => group.weapons.length > 0);

  return (
    <div className="arsenal-weapons">
      <label className="tools-search">
        <Search size={18} aria-hidden="true" />
        <span className="tools-sr">
          {ar ? "ابحث عن سلاح" : "Search weapons"}
        </span>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={
            ar ? "ابحث: هان 86، فولكان، VEL…" : "Search: Han 86, Vulcan, VEL…"
          }
          enterKeyHint="search"
        />
      </label>
      <div
        className="tools-tabs"
        role="tablist"
        aria-label={ar ? "فئات الأسلحة" : "Weapon classes"}
      >
        <button
          type="button"
          role="tab"
          aria-selected={tab === "all"}
          onClick={() => setTab("all")}
        >
          {ar ? "الكل" : "All"} <span>{game.weapons.length}</span>
        </button>
        {weaponClasses
          .filter((c) => game.weapons.some((w) => w.class === c.id))
          .map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={tab === c.id}
              onClick={() => setTab(c.id)}
            >
              {ar ? c.ar : c.en}{" "}
              <span>{game.weapons.filter((w) => w.class === c.id).length}</span>
            </button>
          ))}
      </div>
      {shown.length ? (
        shown.map((group) => (
          <section key={group.class.id}>
            <h3>{ar ? group.class.ar : group.class.en}</h3>
            <ul className="arsenal-weapon-list">
              {group.weapons.map((weapon) => (
                <li key={weapon.id}>
                  <button type="button" onClick={() => onPick(weapon.id)}>
                    <strong dir="ltr">{weapon.name}</strong>
                    <small>{ar ? weapon.roleAr : weapon.roleEn}</small>
                    <span className="arsenal-stats">
                      {weapon.rpm ? (
                        <span>
                          {weapon.rpm} {ar ? "طلقة/دقيقة" : "RPM"}
                        </span>
                      ) : null}
                      {weapon.rounds ? (
                        <span>
                          {weapon.rounds} {ar ? "طلقة" : "rounds"}
                        </span>
                      ) : null}
                      {weapon.unlock ? (
                        <span>
                          {ar
                            ? `يُفتح بالمستوى ${weapon.unlock}`
                            : `Level ${weapon.unlock}`}
                        </span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="tools-empty" role="status">
          {ar
            ? "ما فيه سلاح مطابق. جرّب كلمة أقصر."
            : "No matching weapon. Try a shorter word."}
        </p>
      )}
    </div>
  );
}

/** Step 3 — the playstyle, which drives every attachment score. */
function StylePicker({
  ar,
  active,
  onPick,
}: {
  ar: boolean;
  active?: StyleId;
  onPick: (style: StyleId) => void;
}) {
  return (
    <ul className="arsenal-styles">
      {styles.map((style) => (
        <li key={style.id}>
          <button
            type="button"
            className={active === style.id ? "is-active" : undefined}
            onClick={() => onPick(style.id)}
            aria-pressed={active === style.id}
          >
            <span aria-hidden="true">{style.emoji}</span>
            <strong>{ar ? style.ar : style.en}</strong>
            <small>{ar ? style.blurbAr : style.blurbEn}</small>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Family label, and the exact attachment name only when it adds something. */
function pickLabels(ar: boolean, pick: SlotPick) {
  const family = ar ? pick.type.ar : pick.type.en;
  const name = pick.attachment?.name;
  const level = pick.attachment?.unlock
    ? ar
      ? `مستوى السلاح ${pick.attachment.unlock}`
      : `weapon level ${pick.attachment.unlock}`
    : "";
  if (!name)
    return {
      title: family,
      ltr: false,
      note: ar
        ? "اختر أي إضافة من هذه العائلة في الجنسميث"
        : "Pick any attachment from this family in the Gunsmith",
    };
  const note = [name === family ? "" : family, level].filter(Boolean);
  return { title: name, ltr: true, note: note.join(ar ? " · " : " · ") };
}

function PickRow({ ar, pick }: { ar: boolean; pick: SlotPick }) {
  const slot = slotById[pick.slot];
  const label = pickLabels(ar, pick);
  return (
    <tr>
      <th scope="row">{ar ? slot.ar : slot.en}</th>
      <td>
        <strong dir={label.ltr ? "ltr" : undefined}>{label.title}</strong>
        {label.note ? <small>{label.note}</small> : null}
      </td>
      <td>{ar ? pick.type.doesAr : pick.type.doesEn}</td>
      <td className="arsenal-cost">
        {ar ? pick.type.costAr : pick.type.costEn}
      </td>
    </tr>
  );
}

/** Step 4 — the generated class, the published build and the full slot tables. */
function Result({
  ar,
  game,
  weapon,
  style,
}: {
  ar: boolean;
  game: Game;
  weapon: Weapon;
  style: StyleId;
}) {
  const result = useMemo(
    () => recommend(game, weapon, style),
    [game, weapon, style],
  );
  const profile = useMemo(() => classProfile(result.picks), [result.picks]);
  const published = useMemo(() => buildsFor(weapon, style), [weapon, style]);
  const source = (id: string) => game.sources.find((s) => s.id === id);
  const max = Math.max(1, ...profile.map((row) => Math.abs(row.value)));

  if (!weapon.slots.length)
    return (
      <p className="arsenal-note" role="status">
        {ar
          ? "هذا السلاح ما يقبل إضافات في اللعبة، فما فيه كلاس نركّبه له — تتغيّر مظهره فقط."
          : "This weapon takes no attachments in game, so there is no class to build — appearance only."}
      </p>
    );

  return (
    <div className="arsenal-result">
      <section className="arsenal-class">
        <header>
          <h2>
            {ar ? "الكلاس المقترح" : "Recommended class"} —{" "}
            {ar ? styleById[style].ar : styleById[style].en}
          </h2>
          <p>
            {ar
              ? `أفضل ${result.picks.length} إضافات لهذا السلاح حسب نمط اللعب اللي اخترته، مرتبة من الأقوى أثراً.`
              : `The top ${result.picks.length} attachments for this weapon under the style you chose, strongest first.`}
          </p>
        </header>
        <div className="tools-table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">{ar ? "الخانة" : "Slot"}</th>
                <th scope="col">{ar ? "الإضافة" : "Attachment"}</th>
                <th scope="col">{ar ? "إيش تسوي" : "What it does"}</th>
                <th scope="col">{ar ? "المقابل" : "Trade-off"}</th>
              </tr>
            </thead>
            <tbody>
              {result.picks.map((pick) => (
                <PickRow key={pick.slot} ar={ar} pick={pick} />
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {profile.length ? (
        <section className="arsenal-profile">
          <h2>{ar ? "أثر الكلاس على السلاح" : "What the class changes"}</h2>
          <p className="arsenal-note">
            {ar
              ? "القيم اتجاهية لمقارنة الخيارات، وليست نِسَباً من اللعبة — الأرقام الدقيقة تظهر لك في الجنسميث."
              : "Directional values for comparing options, not in-game percentages — the Gunsmith shows the exact numbers."}
          </p>
          <figure className="tools-chart">
            <ul>
              {profile.map((row) => (
                <li key={row.stat}>
                  <span className="tools-chart-label">
                    {ar ? statById[row.stat].ar : statById[row.stat].en}
                  </span>
                  <span className="tools-chart-track">
                    <span
                      className={`tools-chart-bar${
                        row.value < 0 ? " is-negative" : ""
                      }`}
                      style={{
                        width: `${(Math.abs(row.value) / max) * 100}%`,
                      }}
                    />
                  </span>
                  <span className="tools-chart-value" dir="ltr">
                    {signed(row.value)}
                  </span>
                </li>
              ))}
            </ul>
          </figure>
        </section>
      ) : null}

      <section className="arsenal-perks">
        <h2>{ar ? "البركات لهذا النمط" : "Perks for this style"}</h2>
        <ul>
          {result.perks.map((perk) => (
            <li key={perk.id}>
              <span className="arsenal-badge">
                {ar ? `بركة ${perk.slot}` : `Perk ${perk.slot}`}
                {perk.unlock
                  ? ar
                    ? ` · مستوى ${perk.unlock}`
                    : ` · level ${perk.unlock}`
                  : ""}
              </span>
              <strong dir="ltr">{perk.en}</strong>
              <small>{ar ? perk.doesAr : perk.doesEn}</small>
            </li>
          ))}
        </ul>
      </section>

      {weapon.apex ? (
        <section className="arsenal-apex">
          <h2>
            <Sparkles size={18} aria-hidden="true" />
            {ar ? "إضافة Apex" : "Apex attachment"}
          </h2>
          <p>
            <strong dir="ltr">{weapon.apex.name}</strong> —{" "}
            {ar ? weapon.apex.doesAr : weapon.apex.doesEn}
          </p>
          {weapon.apex.blocks?.length ? (
            <p className="arsenal-note">
              {ar ? "تلغي خانات: " : "Blocks slots: "}
              {weapon.apex.blocks
                .map((slot) => (ar ? slotById[slot].ar : slotById[slot].en))
                .join(ar ? "، " : ", ")}
            </p>
          ) : null}
        </section>
      ) : null}

      {published.length ? (
        <section className="arsenal-published">
          <h2>{ar ? "كلاسات منشورة لهذا السلاح" : "Published builds"}</h2>
          <p className="arsenal-note">
            {ar
              ? "كلاسات نقلناها كما هي من مصادر مؤرّخة، وهي آراء ناشريها وتتغيّر مع تحديثات التوازن."
              : "Builds quoted as published by dated sources — their authors' opinions, and they move with balance patches."}
          </p>
          {published.map((build) => {
            const ref = source(build.sourceId);
            return (
              <article key={`${build.style}-${build.sourceId}`}>
                <h3>
                  {ar ? build.labelAr : build.labelEn}
                  <span className="arsenal-badge">
                    {ar ? styleById[build.style].ar : styleById[build.style].en}
                  </span>
                </h3>
                <ul>
                  {build.picks.map((pick) => (
                    <li key={`${pick.slot}-${pick.name}`}>
                      <span>
                        {ar ? slotById[pick.slot].ar : slotById[pick.slot].en}
                      </span>
                      <strong dir="ltr">{pick.name}</strong>
                    </li>
                  ))}
                </ul>
                {build.perks?.length ? (
                  <p className="arsenal-build-perks" dir="ltr">
                    {build.perks
                      .map(
                        (id) => game.perks.find((p) => p.id === id)?.en ?? id,
                      )
                      .join(" · ")}
                  </p>
                ) : null}
                {ref ? (
                  <a href={ref.url} target="_blank" rel="noopener noreferrer">
                    {ref.label}
                    <ExternalLink size={13} aria-hidden="true" />
                  </a>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : null}

      <section className="arsenal-slots">
        <h2>
          {ar ? "كل خانة وإيش تسوي كل إضافة" : "Every slot, option by option"}
        </h2>
        {weapon.slots.map((slot) => {
          const options = rankSlot(weapon, slot, styleById[style].weights);
          if (!options.length) return null;
          return (
            <details key={slot}>
              <summary>
                {ar ? slotById[slot].ar : slotById[slot].en}
                <span className="arsenal-badge">
                  {options.length} {ar ? "عائلة" : "families"}
                </span>
              </summary>
              <div className="tools-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">{ar ? "العائلة" : "Family"}</th>
                      <th scope="col">{ar ? "إيش تسوي" : "What it does"}</th>
                      <th scope="col">{ar ? "المقابل" : "Trade-off"}</th>
                      <th scope="col">
                        {ar ? "ملاءمة نمطك" : "Fit for your style"}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {options.map((option) => (
                      <tr key={option.type.id}>
                        <th scope="row">
                          {ar ? option.type.ar : option.type.en}
                          {option.attachment &&
                          option.attachment.name !==
                            (ar ? option.type.ar : option.type.en) ? (
                            <small dir="ltr">{option.attachment.name}</small>
                          ) : null}
                        </th>
                        <td>{ar ? option.type.doesAr : option.type.doesEn}</td>
                        <td className="arsenal-cost">
                          {ar ? option.type.costAr : option.type.costEn}
                        </td>
                        <td dir="ltr">{signed(option.score)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          );
        })}
      </section>
    </div>
  );
}

export default function Arsenal({
  lang,
  gameId,
  weaponId,
}: {
  lang: "ar" | "en";
  gameId?: string;
  weaponId?: string;
}) {
  const ar = lang === "ar";
  // The tool owns its own step state and keeps the address bar in step with
  // it, so every step is a shareable link without a router.
  const [path, setPath] = useState<{ game?: string; weapon?: string }>({
    game: gameId,
    weapon: weaponId,
  });
  const [style, setStyle] = useState<StyleId | undefined>(() => {
    const value = new URLSearchParams(location.search).get("style");
    return value && value in styleById ? (value as StyleId) : undefined;
  });
  const game = findGame(path.game);
  const weapon = game ? findWeapon(game, path.weapon) : undefined;

  // Back and forward must walk the steps, not leave the tool stranded.
  useEffect(() => {
    const sync = () => {
      const parts = location.pathname.split("/").filter(Boolean);
      const index = parts.indexOf("arsenal");
      setPath(
        index < 0 ? {} : { game: parts[index + 1], weapon: parts[index + 2] },
      );
      const next = new URLSearchParams(location.search).get("style");
      setStyle(next && next in styleById ? (next as StyleId) : undefined);
    };
    addEventListener("popstate", sync);
    return () => removeEventListener("popstate", sync);
  }, []);

  const go = (nextGame?: string, nextWeapon?: string, nextStyle?: StyleId) => {
    setPath({ game: nextGame, weapon: nextWeapon });
    setStyle(nextStyle);
    history.pushState({}, "", arsenalPath(nextGame, nextWeapon, nextStyle));
    scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const title = weapon
      ? ar
        ? `أفضل إضافات وكلاس ${weapon.name} في ${game?.ar} — 1Shot`
        : `Best ${weapon.name} attachments & class in ${game?.short} — 1Shot`
      : game
        ? ar
          ? `ترسانة ${game.ar}: كل الأسلحة وأفضل الإضافات — 1Shot`
          : `${game.short} arsenal: every weapon and the best attachments — 1Shot`
        : ar
          ? "ترسانة كول أوف ديوتي: الأسلحة والإضافات والكلاسات — 1Shot"
          : "Call of Duty arsenal: weapons, attachments and classes — 1Shot";
    const description = weapon
      ? ar
        ? `اختر نمط لعبك واحصل على أفضل إضافات ${weapon.name} وبركاته وإيش تسوي كل إضافة، مع الكلاسات المنشورة ومصادرها.`
        : `Choose your playstyle and get the best ${weapon.name} attachments, perks and what each one does.`
      : ar
        ? "اختر اللعبة ثم السلاح ثم نمط اللعب، واحصل على أفضل الإضافات والبركات مع شرح أثر كل إضافة ومقابلها."
        : "Pick the game, the weapon and your playstyle to get the best attachments and perks, with each trade-off explained.";
    applyHead({
      title,
      description,
      path: arsenalPath(game?.id, weapon?.id),
      jsonLd: [],
    });
  }, [ar, game, weapon]);

  return (
    <article
      className="tools-page arsenal"
      style={{ "--tool-accent": "#a7c08f" } as CSSProperties}
    >
      <Breadcrumb ar={ar} game={game} />
      <header className="tools-hero">
        <p className="tools-kicker">
          <Swords size={15} aria-hidden="true" />
          {ar ? "⚡ جيمنج · ترسانة كول أوف ديوتي" : "⚡ Gaming · COD arsenal"}
        </p>
        <h1>
          {weapon
            ? ar
              ? `أفضل إضافات وكلاس ${weapon.name}`
              : `Best ${weapon.name} attachments`
            : ar
              ? "ترسانة كول أوف ديوتي: الأسلحة والإضافات والكلاسات"
              : "Call of Duty arsenal: weapons, attachments and classes"}
        </h1>
        <p>
          {ar
            ? "اختر اللعبة، بعدها السلاح، بعدها نمط لعبك: سريع، ثبات وايم، مدى طويل، أو تخفّي. تطلع لك أفضل الإضافات لكل خانة، وإيش تسوي كل واحدة، وإيش تخسر مقابلها، مع البركات المناسبة."
            : "Pick the game, then the weapon, then your style: fast, steady aim, long range or stealth. You get the best attachment per slot, what each one does and what it costs, plus the perks that match."}
        </p>
        {game?.checkedOn ? (
          <p className="tools-privacy">
            <CalendarClock size={15} aria-hidden="true" />
            {ar
              ? `بيانات ${game.ar}: ${game.patch} — راجعناها بتاريخ ${game.checkedOn}. التوازن يتغيّر كل موسم، فراجع الجنسميث قبل ما تعتمد كلاس.`
              : `${game.short} data: ${game.patch} — checked ${game.checkedOn}. Balance changes every season; confirm in the Gunsmith.`}
          </p>
        ) : null}
      </header>

      <ol className="arsenal-steps">
        <li className={game ? "is-done" : "is-active"}>
          <span>1</span>
          {game ? (
            <button type="button" onClick={() => go()}>
              {ar ? game.ar : game.short}
            </button>
          ) : (
            <strong>{ar ? "اللعبة" : "Game"}</strong>
          )}
        </li>
        <li className={weapon ? "is-done" : game ? "is-active" : undefined}>
          <span>2</span>
          {weapon ? (
            <button type="button" dir="ltr" onClick={() => go(game?.id)}>
              {weapon.name}
            </button>
          ) : (
            <strong>{ar ? "السلاح" : "Weapon"}</strong>
          )}
        </li>
        <li
          className={
            weapon && style ? "is-done" : weapon ? "is-active" : undefined
          }
        >
          <span>3</span>
          {weapon && style ? (
            <button type="button" onClick={() => go(game?.id, weapon.id)}>
              {ar ? styleById[style].ar : styleById[style].en}
            </button>
          ) : (
            <strong>{ar ? "نمط اللعب" : "Playstyle"}</strong>
          )}
        </li>
        <li className={weapon && style ? "is-active" : undefined}>
          <span>4</span>
          <strong>{ar ? "الكلاس" : "Class"}</strong>
        </li>
      </ol>

      {!game ? (
        <>
          <h2>{ar ? "١ · اختر اللعبة" : "1 · Pick the game"}</h2>
          <GamePicker ar={ar} onPick={(id) => go(id)} />
        </>
      ) : !weapon ? (
        <>
          <h2>{ar ? "٢ · اختر السلاح" : "2 · Pick the weapon"}</h2>
          <WeaponPicker
            ar={ar}
            game={game}
            onPick={(id) => go(game.id, id, style)}
          />
        </>
      ) : (
        <>
          <section className="arsenal-weapon-head">
            <h2 dir="ltr">
              <Crosshair size={18} aria-hidden="true" />
              {weapon.name}
              <small>{ar ? weapon.ar : classById[weapon.class].en}</small>
            </h2>
            <p>{ar ? weapon.roleAr : weapon.roleEn}</p>
            <p className="arsenal-stats">
              <span>
                {ar ? classById[weapon.class].ar : classById[weapon.class].en}
              </span>
              {weapon.rpm ? (
                <span>
                  {weapon.rpm} {ar ? "طلقة/دقيقة" : "RPM"}
                </span>
              ) : null}
              {weapon.rounds ? (
                <span>
                  {weapon.rounds} {ar ? "طلقة في المخزن" : "rounds"}
                </span>
              ) : null}
              {weapon.unlock ? (
                <span>
                  {ar
                    ? `يُفتح بمستوى اللاعب ${weapon.unlock}`
                    : `Player level ${weapon.unlock}`}
                </span>
              ) : null}
              {weapon.maxLevel ? (
                <span>
                  {ar
                    ? `أعلى مستوى للسلاح ${weapon.maxLevel}`
                    : `Max weapon level ${weapon.maxLevel}`}
                </span>
              ) : null}
            </p>
          </section>
          <h2>
            {style
              ? ar
                ? "نمط اللعب"
                : "Playstyle"
              : ar
                ? "٣ · اختر نمط اللعب"
                : "3 · Pick your playstyle"}
          </h2>
          <StylePicker
            ar={ar}
            active={style}
            onPick={(next) => {
              setStyle(next);
              history.pushState({}, "", arsenalPath(game.id, weapon.id, next));
            }}
          />
          {style ? (
            <Result ar={ar} game={game} weapon={weapon} style={style} />
          ) : (
            <p className="arsenal-note" role="status">
              {ar
                ? "اختر نمط لعبك فوق، ويطلع لك الكلاس المناسب له."
                : "Choose a playstyle above to generate the class."}
            </p>
          )}
        </>
      )}

      <section className="tools-reference">
        <h2>{ar ? "كيف نختار الإضافات" : "How the picks are made"}</h2>
        <p>
          {ar
            ? "كل عائلة إضافات لها اتجاه معروف في اللعبة: الماسورة الطويلة ترفع المدى وسرعة الطلقة وتبطّئ الحركة، والماسورة الخفيفة بالعكس، وبدون أخمص يعطيك أقصى سرعة مقابل ارتداد أعلى. نمط اللعب اللي تختاره يحدّد وزن كل محور، والأداة ترتّب خيارات كل خانة على هذا الأساس وتختار أقواها."
            : "Every attachment family has a known direction in game, and the style you choose sets the weight of each axis; the tool then ranks each slot's options and takes the strongest."}
        </p>
        <p>
          {ar
            ? "الأرقام هنا اتجاهية للمقارنة فقط. النِسَب الحقيقية تختلف من سلاح لسلاح وتتغيّر مع كل تحديث توازن، فالمرجع النهائي دائماً هو الجنسميث داخل اللعبة."
            : "The figures are directional, for comparison only. Real percentages differ per weapon and change with every balance patch; the in-game Gunsmith is the final reference."}
        </p>
        {game?.sources.length ? (
          <>
            <h3>{ar ? "المصادر" : "Sources"}</h3>
            <ul className="tools-related">
              {game.sources.map((s) => (
                <li key={s.id}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer">
                    {s.label} — {s.readOn}
                  </a>
                </li>
              ))}
            </ul>
          </>
        ) : null}
        <p className="tools-privacy">
          <ShieldCheck size={15} aria-hidden="true" />
          {ar
            ? "تعمل بالكامل داخل متصفحك، ولا ترسل أي شيء عن حسابك في اللعبة إلى أي خادم."
            : "Runs entirely in your browser; nothing about your game account is sent anywhere."}
        </p>
      </section>
    </article>
  );
}
