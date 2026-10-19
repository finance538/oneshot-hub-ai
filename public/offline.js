const current = document.getElementById("current");
const digital = document.getElementById("digital");
const saving = document.getElementById("saving");
const value = (input) =>
  Math.max(0, Math.min(1000000, Number(input.value) || 0));
function calculate() {
  saving.textContent =
    new Intl.NumberFormat("en", { maximumFractionDigits: 2 }).format(
      value(current) - value(digital),
    ) + " SAR";
}
current.addEventListener("input", calculate);
digital.addEventListener("input", calculate);
window.addEventListener("online", () => {
  document.getElementById("online").textContent =
    "عاد اتصال جهازك. اضغط العودة لمحاولة فتح مساحتك. Connection restored; reconnect when ready.";
});
