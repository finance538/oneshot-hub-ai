import { useEffect, useRef, type ReactNode } from "react";
import { useAppearance } from "../storefront/i18n";
import {
  AlertCircle,
  X,
  ArrowLeft,
  ShieldCheck,
  LoaderCircle,
} from "lucide-react";
export function Notice({
  children,
  success = false,
}: {
  children: ReactNode;
  success?: boolean;
}) {
  return (
    <div className={`notice ${success ? "success" : ""}`} role="status">
      <AlertCircle size={17} />
      <span>{children}</span>
    </div>
  );
}
export function Busy() {
  return <LoaderCircle className="spin" size={17} />;
}
export function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const { tr } = useAppearance();
  const backdropDown = useRef(false);
  useEffect(() => {
    const node = ref.current;
    const trigger = document.activeElement;
    node?.showModal();
    return () => {
      node?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropDown.current = event.target === event.currentTarget;
      }}
      onClick={(e) => {
        if (backdropDown.current && e.target === e.currentTarget) {
          const box = e.currentTarget.getBoundingClientRect();
          if (
            e.clientX < box.left ||
            e.clientX > box.right ||
            e.clientY < box.top ||
            e.clientY > box.bottom
          )
            onClose();
        }
        backdropDown.current = false;
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={tr("إغلاق", "Close")}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function SectionHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <div className="section-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function AccessGate({
  admin = false,
  onLogin,
}: {
  admin?: boolean;
  onLogin: () => void;
}) {
  const { tr } = useAppearance();
  return (
    <div className="access-gate">
      <div className="symbol">
        <ShieldCheck size={32} />
      </div>
      <h2>
        {admin
          ? tr("مساحة إدارة محمية", "Protected administration area")
          : tr("مساحتك تبدأ بتسجيل الدخول", "Sign in to your workspace")}
      </h2>
      <p>
        {admin
          ? tr(
              "الخزنة وعمليات الإدارة متاحة للحسابات التي تحمل صلاحية المسؤول.",
              "Vault and administration tools require an administrator account.",
            )
          : tr(
              "سجّل الدخول لحفظ محادثاتك وطلباتك والعودة إليها في أي وقت.",
              "Sign in to save your conversations and orders.",
            )}
      </p>
      <button className="button primary" onClick={onLogin}>
        {tr("تسجيل الدخول", "Sign in")} <ArrowLeft size={17} />
      </button>
    </div>
  );
}
