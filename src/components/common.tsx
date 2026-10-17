import { useEffect, useRef, type ReactNode } from "react";
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
  useEffect(() => {
    ref.current?.showModal();
    return () => ref.current?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="modal"
    >
      <div className="modal-heading">
        <h2>{title}</h2>
        <button className="icon-button" onClick={onClose} aria-label="إغلاق">
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
  return (
    <div className="access-gate">
      <div className="symbol">
        <ShieldCheck size={32} />
      </div>
      <h2>{admin ? "مساحة إدارة محمية" : "مساحتك تبدأ بتسجيل الدخول"}</h2>
      <p>
        {admin
          ? "الخزنة وعمليات الإدارة متاحة للحسابات التي تحمل صلاحية المسؤول."
          : "سجّل الدخول لحفظ محادثاتك وطلباتك والعودة إليها في أي وقت."}
      </p>
      <button className="button primary" onClick={onLogin}>
        تسجيل الدخول <ArrowLeft size={17} />
      </button>
    </div>
  );
}
