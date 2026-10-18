import { useEffect, useRef, useState } from "react";
import type { ChatTurn, WorkforceLanguage } from "../../shared/workforce";
import { api } from "../lib/api";
import { liveText } from "./liveCopy";
export function useConversation(
  employeeId: string,
  meetingId: string | undefined,
  language: WorkforceLanguage,
  outputLanguage: WorkforceLanguage,
  enabled: boolean,
) {
  const [turns, setTurns] = useState<ChatTurn[]>([]),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const generation = useRef(0),
    requests = useRef(0),
    read = useRef(0);
  const pending = useRef<{ signature: string; key: string } | null>(null);
  const query = `employeeId=${encodeURIComponent(employeeId)}${meetingId ? `&meetingId=${encodeURIComponent(meetingId)}` : ""}`;
  async function refresh() {
    if (!enabled) return;
    const seq = ++read.current,
      epoch = generation.current;
    try {
      const result = await api<{ turns: ChatTurn[] }>(
        `/api/workforce/chat?${query}`,
        undefined,
        { quiet: true },
      );
      if (seq === read.current && epoch === generation.current) {
        setTurns(result.turns);
        setError("");
      }
    } catch (err) {
      if (epoch === generation.current) setError((err as Error).message);
    } finally {
      if (epoch === generation.current) setLoading(false);
    }
  }
  useEffect(() => {
    generation.current++;
    read.current++;
    pending.current = null;
    requests.current = 0;
    setTurns([]);
    setError("");
    setBusy(false);
    setLoading(enabled);
    void refresh();
    return () => {
      generation.current++;
      read.current++;
    };
  }, [employeeId, meetingId, enabled]);
  useEffect(() => {
    if (!enabled) return;
    const timer = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 4000);
    return () => clearInterval(timer);
  }, [employeeId, meetingId, enabled]);
  async function send(input: string): Promise<ChatTurn | null> {
    if (!enabled || !input.trim()) return null;
    const epoch = generation.current;
    const signature = JSON.stringify({
      employeeId,
      meetingId,
      input: input.trim(),
      outputLanguage,
    });
    if (pending.current?.signature !== signature)
      pending.current = { signature, key: crypto.randomUUID() };
    const key = pending.current.key;
    requests.current++;
    read.current++;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ turn: ChatTurn }>(
        "/api/workforce/chat",
        {
          employeeId,
          meetingId,
          input: input.trim(),
          outputLanguage,
          requestKey: key,
        },
        { quiet: true },
      );
      if (epoch !== generation.current) return null;
      read.current++;
      setTurns((prev) =>
        [...prev.filter((row) => row.id !== result.turn.id), result.turn].sort(
          (a, b) =>
            a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id),
        ),
      );
      if (result.turn.status !== "generating" && pending.current?.key === key)
        pending.current = null;
      if (result.turn.status !== "ready")
        setError(liveText(language, "pendingNote"));
      return result.turn;
    } catch (err) {
      if (epoch === generation.current) setError((err as Error).message);
      throw err;
    } finally {
      if (epoch === generation.current) {
        requests.current--;
        setBusy(requests.current > 0);
      }
    }
  }
  return { turns, loading, busy, error, refresh, send };
}
export type Conversation = ReturnType<typeof useConversation>;
