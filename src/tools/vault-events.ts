// Lets any footer or button open the vault modal when a launcher is mounted;
// otherwise the caller follows its plain /tools link.
const EVENT = "oneshot:open-vault";
let listeners = 0;

export function openToolVault() {
  if (!listeners) return false;
  window.dispatchEvent(new Event(EVENT));
  return true;
}

export function onOpenToolVault(handler: () => void) {
  listeners++;
  window.addEventListener(EVENT, handler);
  return () => {
    listeners--;
    window.removeEventListener(EVENT, handler);
  };
}
