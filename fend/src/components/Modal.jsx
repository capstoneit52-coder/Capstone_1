import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export default function Modal({ open, onClose, title, children, maxWidth = "md" }) {
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);

  // Run hooks every render; do work only when `open` is true
  useEffect(() => {
    if (!open) return;

    // remember focus and lock scroll
    lastFocusedRef.current = document.activeElement;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // esc + simple focus trap
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key !== "Tab") return;

      const focusables = panelRef.current?.querySelectorAll(
        'a,button,input,select,textarea,[tabindex]:not([tabindex="-1"])'
      );
      if (!focusables || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", onKey);

    // focus the panel after mount
    const t = setTimeout(() => panelRef.current?.focus(), 0);

    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      if (lastFocusedRef.current instanceof HTMLElement) lastFocusedRef.current.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizes = {
    sm: "max-w-sm",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[2000]"     // high z-index: above sidebar/dropdowns
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        // close only when clicking the dark backdrop (not inside the panel)
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Panel wrapper */}
      <div className="relative min-h-screen w-full flex items-center justify-center p-4">
        <div
          ref={panelRef}
          tabIndex={-1}
          className={`w-[92vw] ${sizes[maxWidth]} rounded-2xl bg-white dark:bg-gray-900 shadow-xl border dark:border-white/10 outline-none`}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b dark:border-white/10">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded p-2 hover:bg-black/5 dark:hover:bg-white/10"
            >
              ✕
            </button>
          </div>
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>,
    document.body
  );
}
