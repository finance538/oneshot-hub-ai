import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import { useAppearance } from "../storefront/i18n";
import "./modal.css";

/** Native top-layer dialog: focus containment, Escape and focus restoration. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
  drawer = false,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
  drawer?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
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
      className={`ui-dialog${wide ? " ui-dialog-wide" : ""}${drawer ? " ui-dialog-drawer" : ""}`}
      aria-labelledby={headingId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onPointerDown={(event) => {
        backdropDown.current = event.target === event.currentTarget;
      }}
      onClick={(event) => {
        if (backdropDown.current && event.target === event.currentTarget) {
          const box = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < box.left ||
            event.clientX > box.right ||
            event.clientY < box.top ||
            event.clientY > box.bottom
          )
            onClose();
        }
        backdropDown.current = false;
      }}
    >
      <header className="ui-dialog-heading">
        <h2 id={headingId}>{title}</h2>
        <button
          type="button"
          className="ui-dialog-close"
          onClick={onClose}
          aria-label={tr("إغلاق", "Close")}
          autoFocus
        >
          <X size={18} />
        </button>
      </header>
      <div className="ui-dialog-body">{children}</div>
    </dialog>
  );
}
