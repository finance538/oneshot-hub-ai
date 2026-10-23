import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShoppingBag,
  Zap,
  LockKeyhole,
  BriefcaseBusiness,
  Globe2,
  ChevronLeft,
  ArrowUpRight,
  Menu,
  X,
  ReceiptText,
  RefreshCw,
} from "lucide-react";
import type { Module, Product, Health, Order } from "../shared/contracts";
import { endpoints } from "../shared/contracts";
import {
  api,
  callBackendApi,
  money,
  orderLabel,
  clearApiSession,
  isUnconfirmedRequest,
} from "./lib/api";
import { useAuth, type SessionUser } from "./components/auth";
import { Store } from "./components/store";
import { Inspector } from "./components/inspector";
import { Gateway, Vault } from "./components/gateway";
import { appearanceLink } from "./storefront/i18n";
import { Executive } from "./components/executive";
import { AccessGate, Modal, Notice } from "./components/common";
const navigation = [
  {
    id: "store" as Module,
    title: "المتجر الرئيسي",
    subtitle: "ONESHOT STORE",
    icon: ShoppingBag,
  },
  {
    id: "gateway" as Module,
    title: "بوابات الدفع",
    subtitle: "PAYMENT WORKSPACE",
    icon: Zap,
  },
  {
    id: "vault" as Module,
    title: "السوبر أدمن والخزنة",
    subtitle: "ADMIN & API VAULT",
    icon: LockKeyhole,
  },
  {
    id: "ceo" as Module,
    title: "غرفة المدير التنفيذي",
    subtitle: "AI CEO & TEAM",
    icon: BriefcaseBusiness,
  },
];
function initialModule(): Module {
  const query = new URLSearchParams(window.location.search).get("module");
  const sub = window.location.hostname.split(".")[0];
  if (
    query === "ai" ||
    (window.location.pathname === "/" &&
      !navigation.some((n) => n.id === query) &&
      ["ai", "app"].includes(sub))
  ) {
    // Retire old bookmarks without reloading or discarding Identity callbacks.
    const destination = appearanceLink("/workforce") + window.location.hash;
    history.replaceState(history.state, "", destination);
    return "store";
  }
  if (navigation.some((n) => n.id === query)) return query as Module;
  if (
    /^\/(workforce(?:\/.*)?|products(?:\/.*)?|guides(?:\/.*)?|about|vision|privacy|refund|terms|support|accounts|api-integration)\/?$/.test(
      window.location.pathname,
    )
  )
    return "store";
  return (
    (
      {
        portal: "gateway",
        pay: "gateway",
        admin: "vault",
      } as Record<string, Module>
    )[sub] || "store"
  );
}
export default function App() {
  const auth = useAuth();
  function enterWorkforce() {
    const go = () => window.location.assign(appearanceLink("/workforce"));
    if (auth.user) go();
    else auth.openLogin(go);
  }
  return (
    <>
      <Workspace
        key={
          auth.user
            ? `${auth.user.id}:${auth.user.roles?.join(",") || "member"}`
            : "guest"
        }
        user={auth.user}
        onLogin={() => auth.openLogin()}
        authReady={auth.ready}
        onWorkforce={enterWorkforce}
        accountControl={auth.control}
      />
      {auth.dialog}
    </>
  );
}
function Workspace({
  user,
  onLogin,
  authReady,
  onWorkforce,
  accountControl,
}: {
  user: SessionUser | null;
  onLogin: () => void;
  authReady: boolean;
  onWorkforce: () => void;
  accountControl: React.ReactNode;
}) {
  const [active, setActive] = useState<Module>(initialModule),
    [health, setHealth] = useState<Health | null>(null),
    [checking, setChecking] = useState(false),
    [healthError, setHealthError] = useState("");
  const [products, setProducts] = useState<Product[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [paymentError, setPaymentError] = useState(""),
    [buying, setBuying] = useState(false),
    [order, setOrder] = useState<Order | null>(null),
    [menu, setMenu] = useState(false);
  const [showOrders, setShowOrders] = useState(false),
    [ownOrders, setOwnOrders] = useState<Order[]>([]),
    [ordersError, setOrdersError] = useState(""),
    [ordersLoading, setOrdersLoading] = useState(false);
  const [pendingPurchase, setPendingPurchase] = useState<{
    product: Product;
    key: string;
  } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!user) return;
    const id = new URL(window.location.href).searchParams.get("order");
    if (
      !id ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      )
    )
      return;
    let alive = true;
    // The return URL supplies only an identifier. Ownership and payment status
    // are read from the authenticated server, never from redirect parameters.
    void api<{ order: Order }>(`/api/orders/${id}`, undefined, { quiet: true })
      .then((result) => {
        if (alive) setOrder(result.order);
      })
      .catch(() => {
        if (alive) setPaymentError("تعذّر استرجاع الطلب. راجع طلبات حسابك.");
      });
    return () => {
      alive = false;
    };
  }, [user?.id]);
  useEffect(() => {
    if (!menu) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(false);
        menuButtonRef.current?.focus();
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [menu]);
  const isAdmin = !!user?.roles?.includes("admin");
  const refresh = useCallback(async () => {
    setChecking(true);
    setHealthError("");
    try {
      const h = await api<Health>("/api/health");
      setHealth(h);
    } catch (e) {
      setHealth(null);
      setHealthError((e as Error).message);
    } finally {
      setChecking(false);
    }
  }, []);
  async function loadProducts() {
    setLoading(true);
    setError("");
    try {
      const r = await api<{ products: Product[] }>("/api/products");
      setProducts(r.products);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void refresh();
    void loadProducts();
    const pop = () => setActive(initialModule());
    window.addEventListener("popstate", pop);
    return () => {
      window.removeEventListener("popstate", pop);
      clearApiSession();
    };
  }, []);
  function navigate(id: Module) {
    setActive(id);
    setMenu(false);
    const u = new URL(window.location.href);
    u.pathname = "/";
    u.hash = "";
    u.searchParams.set("module", id);
    history.pushState({}, "", u);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  async function buy(product: Product, key: string = crypto.randomUUID()) {
    if (!user) {
      onLogin();
      return;
    }
    setBuying(true);
    setPaymentError("");
    try {
      const response = await callBackendApi<{ order: Order; error?: string }>(
        endpoints.payment,
        {
          productId: product.id,
          gatewayCode: "telr",
          executionMode: "PRODUCTION",
          topologyMode: "HOSTED_PAGE",
        },
        { idempotencyKey: key },
      );
      setOrder(response.order);
      setPendingPurchase(null);
      if (response.error) setPaymentError(response.error);
      document
        .querySelector(".checkout-section")
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } catch (e) {
      setPaymentError((e as Error).message);
      if (isUnconfirmedRequest(e)) setPendingPurchase({ product, key });
    } finally {
      setBuying(false);
    }
  }
  async function loadOrders() {
    if (!user) {
      onLogin();
      return;
    }
    setShowOrders(true);
    setOrdersLoading(true);
    setOrdersError("");
    try {
      const result = await api<{ orders: Order[] }>("/api/orders");
      setOwnOrders(result.orders);
    } catch (e) {
      setOrdersError((e as Error).message);
    } finally {
      setOrdersLoading(false);
    }
  }
  const selected = navigation.find((n) => n.id === active)!;
  return (
    <>
      {active === "store" ? (
        <Store
          user={user}
          authReady={authReady}
          onWorkforce={onWorkforce}
          products={products}
          loading={loading}
          error={error}
          onRetry={loadProducts}
          onLogin={onLogin}
          onOrders={loadOrders}
          accountControl={accountControl}
        />
      ) : (
        <div className="app-shell">
          <div className="top-ribbon">
            <span>
              <span className="orange-dot" /> ONESHOT ECOSYSTEM
            </span>
            <span>من أول فكرة، إلى أبعد احتمال.</span>
            <span dir="ltr">CREATE. CONNECT. GROW.</span>
          </div>
          <header className="main-header">
            <button
              className="brand"
              onClick={() => navigate("store")}
              aria-label="oneShot — الصفحة الرئيسية"
            >
              <img src="/brand/oneshot.svg" alt="" width="44" height="44" />
              <div>
                <strong dir="ltr">
                  one<span>Shot</span>
                  <em>®</em>
                </strong>
                <small>المنظومة الموحدة الشاملة</small>
              </div>
            </button>
            <div
              className={`backend-pill ${health?.database.connected ? "connected" : ""}`}
              title={
                healthError ||
                "حالة اتصال قاعدة بيانات Netlify؛ استجابة الذكاء الاصطناعي تُتحقق عند إرسال رسالة."
              }
            >
              <span className="status-dot" />
              <span>
                {checking
                  ? "جارٍ فحص قاعدة البيانات"
                  : health?.database.connected
                    ? "قاعدة بيانات Netlify متصلة"
                    : "اتصال قاعدة البيانات غير متحقق"}
                <small dir="ltr">NETLIFY · ONESHOT</small>
              </span>
            </div>
            <div className="header-actions">
              <span className="language">
                <Globe2 size={15} /> العربية
              </span>
              <button
                className="icon-button"
                onClick={loadOrders}
                title="طلباتي"
                aria-label="طلباتي"
              >
                <ReceiptText size={19} />
              </button>
              {accountControl}
              <button
                ref={menuButtonRef}
                className="icon-button mobile-menu"
                aria-label={menu ? "طي قائمة الوحدات" : "توسيع قائمة الوحدات"}
                aria-expanded={menu}
                aria-controls="workspace-navigation"
                onClick={() => setMenu(!menu)}
              >
                {menu ? <X size={21} /> : <Menu size={21} />}
              </button>
            </div>
          </header>
          <div className="page-width">
            <nav
              id="workspace-navigation"
              className={`module-nav ${menu ? "open" : ""}`}
              aria-label="وحدات المنظومة"
            >
              {navigation.map((n, i) => (
                <button
                  key={n.id}
                  aria-current={active === n.id ? "page" : undefined}
                  className={active === n.id ? "active" : ""}
                  onClick={() => navigate(n.id)}
                >
                  <span className="module-icon">
                    <n.icon size={21} />
                  </span>
                  <span className="module-name">
                    {n.title}
                    <small>{n.subtitle}</small>
                  </span>
                  <span className="module-number">0{i + 1}</span>
                </button>
              ))}
            </nav>
            <div className="workspace-breadcrumb">
              <div>
                <span>منظومة oneShot</span>
                <ChevronLeft size={13} />
                <strong>{selected.title}</strong>
              </div>
              <span className="workspace-label">
                YOUR ALL-IN-ONE WORKSPACE <span className="tiny-cross">+</span>
              </span>
            </div>
            <div className="workspace-grid">
              <main id="main-content" className="main-content">
                {paymentError && (
                  <div className="payment-notice">
                    <Notice>{paymentError}</Notice>
                    {pendingPurchase && (
                      <button
                        className="button subtle small"
                        disabled={buying}
                        onClick={() =>
                          buy(pendingPurchase.product, pendingPurchase.key)
                        }
                      >
                        استعادة نتيجة الطلب السابق
                      </button>
                    )}
                    <button
                      className="icon-button"
                      aria-label="إغلاق الرسالة"
                      onClick={() => setPaymentError("")}
                    >
                      <X size={16} />
                    </button>
                  </div>
                )}
                {active === "gateway" &&
                  (isAdmin ? (
                    <Gateway onOrder={setOrder} />
                  ) : (
                    <AccessGate admin onLogin={onLogin} />
                  ))}
                {active === "vault" &&
                  (isAdmin ? (
                    <Vault />
                  ) : (
                    <AccessGate admin onLogin={onLogin} />
                  ))}
                {active === "ceo" &&
                  (isAdmin ? (
                    <Executive />
                  ) : (
                    <AccessGate admin onLogin={onLogin} />
                  ))}
              </main>
              <Inspector
                health={health}
                refresh={refresh}
                checking={checking}
                order={order}
                onOrder={setOrder}
              />
            </div>
            <footer className="site-footer">
              <div>
                <span dir="ltr">
                  one<span className="text-orange">Shot</span>
                </span>
                <small>كل أدواتك. في لقطة واحدة.</small>
              </div>
              <p>© {new Date().getFullYear()} 1SHOTCAM.COM</p>
              <button onClick={onWorkforce} disabled={!authReady}>
                ادخل مقر شركتك الرقمي <ArrowUpRight size={16} />
              </button>
            </footer>
          </div>
        </div>
      )}
      {active === "store" && order && (
        <Modal title="متابعة الطلب والدفع" onClose={() => setOrder(null)}>
          <Inspector
            health={health}
            refresh={refresh}
            checking={checking}
            order={order}
            onOrder={setOrder}
          />
        </Modal>
      )}
      {showOrders && (
        <Modal title="طلباتي" onClose={() => setShowOrders(false)}>
          {ordersError && <Notice>{ordersError}</Notice>}
          <button
            className="button subtle small"
            onClick={loadOrders}
            disabled={ordersLoading}
          >
            <RefreshCw size={14} className={ordersLoading ? "spin" : ""} />{" "}
            تحديث الطلبات
          </button>
          {ownOrders.length ? (
            <div className="my-orders">
              {ownOrders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    setOrder(o);
                    setShowOrders(false);
                  }}
                >
                  <div>
                    <strong>{o.description}</strong>
                    <small>
                      {orderLabel(o.status)} · #{o.id.slice(0, 8)}
                    </small>
                  </div>
                  <span dir="ltr">{money(o.amountCents, o.currency)}</span>
                  <ChevronLeft size={16} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <ReceiptText size={30} />
              <p>
                {ordersLoading
                  ? "جارٍ تحميل الطلبات..."
                  : "لم تُسجل طلبات بعد."}
              </p>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
