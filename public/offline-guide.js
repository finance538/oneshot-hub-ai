(() => {
  const ar = document.documentElement.lang === "ar";
  if (!ar) {
    document.title = "OneShot · Offline guide";
    document.querySelectorAll("[data-en]").forEach((node) => {
      node.textContent = node.dataset.en;
    });
    document
      .querySelector("nav")
      .setAttribute("aria-label", "OneShot destinations");
  }
  document.querySelectorAll('a[href^="https://"]').forEach((link) => {
    const url = new URL(link.href);
    url.searchParams.set("lang", document.documentElement.lang);
    link.href = url.href;
  });
  const value = (id, max) =>
    Math.min(max, Math.max(0, Number(document.getElementById(id).value) || 0));
  const update = () => {
    const net =
      ((value("hours", 744) * value("share", 100)) / 100) *
        value("rate", 1000000) -
      value("cost", 1000000);
    document.getElementById("result").textContent =
      `${new Intl.NumberFormat(ar ? "ar-SA" : "en", { maximumFractionDigits: 0 }).format(net)} ${ar ? "ر.س / شهر — صافي القيمة التقديرية" : "SAR / month — estimated net value"}`;
  };
  document
    .querySelectorAll(".calculator input")
    .forEach((input) => input.addEventListener("input", update));
  const network = () => {
    document.getElementById("connection").textContent = navigator.onLine
      ? ar
        ? "توجد شبكة متاحة. استخدم إعادة الاتصال للتحقق من الوصول إلى الموقع."
        : "A network is available. Reconnect to check site access."
      : ar
        ? "أنت غير متصل حالياً. الدليل والحاسبة متاحان."
        : "You are offline. The guide and calculator remain available.";
  };
  window.addEventListener("online", network);
  window.addEventListener("offline", network);
  update();
  network();
})();
