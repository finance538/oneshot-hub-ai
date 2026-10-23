import { useEffect, useState } from "react";
import { FolderOpen, Link2, Unplug } from "lucide-react";
import { api } from "../lib/api";
import { useAppearance } from "../storefront/i18n";

export default function GoogleWorkspace() {
  const { tr } = useAppearance();
  const [connection, setConnection] = useState<{
    enabled: boolean;
    connected: boolean;
    email?: string;
  }>();
  const [files, setFiles] = useState<{ id: string; name: string }[] | null>(
    null,
  );
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let alive = true;
    api("/api/google/workspace", undefined, { quiet: true })
      .then((value) => {
        if (alive) setConnection(value as NonNullable<typeof connection>);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  async function run(action: "connect" | "files" | "disconnect") {
    setBusy(true);
    setError("");
    try {
      if (action === "connect") {
        const result = await api<{ authorization: string }>(
          "/api/google/workspace/connect",
          { return_to: window.location.href },
          { quiet: true },
        );
        const destination = new URL(result.authorization);
        if (destination.origin !== "https://accounts.google.com")
          throw new Error(
            tr("رابط Google غير صالح.", "Invalid Google authorization URL."),
          );
        location.assign(destination.href);
      } else if (action === "files") {
        setFiles(
          (
            await api<{ files: { id: string; name: string }[] }>(
              "/api/google/workspace/files",
              undefined,
              { quiet: true },
            )
          ).files,
        );
      } else {
        await api("/api/google/workspace", undefined, {
          method: "DELETE",
          quiet: true,
        });
        setConnection((value) =>
          value ? { ...value, connected: false, email: undefined } : value,
        );
        setFiles(null);
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="wf-ops-intro" aria-label="Google Workspace">
      <FolderOpen size={25} aria-hidden="true" />
      <h3>Google Workspace</h3>
      <p>
        {tr(
          "اربط حسابك لعرض أسماء أحدث ملفات Drive. القراءة فقط؛ لا نعدّل الملفات ولا نرسل بريداً.",
          "Connect your account to view recent Drive file names. Read only; no file changes or emails.",
        )}
      </p>
      {!connection && !error && (
        <p role="status">{tr("جارٍ التحقق…", "Checking connection…")}</p>
      )}
      {connection && !connection.enabled && (
        <p>
          {tr(
            "اتصال Google بانتظار الإعداد.",
            "Google connection is awaiting configuration.",
          )}
        </p>
      )}
      {connection?.connected && <p dir="ltr">{connection.email}</p>}
      <div className="button-row">
        {connection?.enabled && (
          <button
            className="button subtle"
            disabled={busy}
            onClick={() => void run("connect")}
          >
            <Link2 size={16} />
            {tr(
              connection.connected ? "إعادة الربط" : "ربط Google",
              connection.connected ? "Reconnect" : "Connect Google",
            )}
          </button>
        )}
        {connection?.connected && (
          <>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => void run("files")}
            >
              {tr("عرض الملفات", "View files")}
            </button>
            <button
              className="button subtle"
              disabled={busy}
              onClick={() => void run("disconnect")}
            >
              <Unplug size={16} />
              {tr("إلغاء الربط", "Disconnect")}
            </button>
          </>
        )}
      </div>
      {error && <p role="alert">{error}</p>}
      {files &&
        (files.length ? (
          <ul>
            {files.map((file) => (
              <li key={file.id}>
                <a
                  href={`https://drive.google.com/file/d/${encodeURIComponent(file.id)}/view`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p>{tr("لا توجد ملفات متاحة.", "No files are available.")}</p>
        ))}
    </section>
  );
}
