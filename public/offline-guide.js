(() => {
  const value = (id, max) =>
    Math.min(max, Math.max(0, Number(document.getElementById(id).value) || 0));
  const update = () => {
    const net =
      ((value("hours", 744) * value("share", 100)) / 100) *
        value("rate", 1000000) -
      value("cost", 1000000);
    document.getElementById("result").textContent =
      `${new Intl.NumberFormat("ar-SA", { maximumFractionDigits: 0 }).format(net)} ر.س / شهر — صافي القيمة التقديرية`;
  };
  document
    .querySelectorAll(".calculator input")
    .forEach((input) => input.addEventListener("input", update));
  const network = () => {
    document.getElementById("connection").textContent = navigator.onLine
      ? "توجد شبكة متاحة. استخدم إعادة الاتصال للتحقق من الوصول إلى الموقع."
      : "أنت غير متصل حالياً. الدليل والحاسبة متاحان.";
  };
  window.addEventListener("online", network);
  window.addEventListener("offline", network);
  update();
  network();
})();
