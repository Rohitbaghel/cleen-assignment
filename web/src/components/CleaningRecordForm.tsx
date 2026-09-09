import { useEffect, useState, type FormEvent } from "react";
import { useUser } from "../context/UserContext";
import type { CleaningRecord, CleaningStatus } from "../types";

type Props = {
  initial?: CleaningRecord | null;
  onSubmit: (payload: {
    cleanedAt: string;
    method: string;
    notes: string | null;
    status: CleaningStatus;
  }) => Promise<void>;
  onCancel: () => void;
};

function toLocalInputValue(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function CleaningRecordForm({ initial, onSubmit, onCancel }: Props) {
  const { userName } = useUser();
  const [cleanedAt, setCleanedAt] = useState(() =>
    toLocalInputValue(new Date().toISOString())
  );
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<CleaningStatus>("PENDING");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initial) {
      setCleanedAt(toLocalInputValue(initial.cleanedAt));
      setMethod(initial.method);
      setNotes(initial.notes ?? "");
      setStatus(initial.status);
    } else {
      setCleanedAt(toLocalInputValue(new Date().toISOString()));
      setMethod("");
      setNotes("");
      setStatus("PENDING");
    }
  }, [initial]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        cleanedAt: new Date(cleanedAt).toISOString(),
        method,
        notes: notes.trim() === "" ? null : notes,
        status,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={handleSubmit}>
      <h2 style={{ margin: 0, fontSize: "1.05rem" }}>
        {initial ? "Edit cleaning record" : "Add cleaning record"}
      </h2>
      <div className="form-grid">
        <div className="field">
          <label>Cleaned by</label>
          <input value={userName} readOnly />
        </div>
        <div className="field">
          <label htmlFor="cleaned-at">Cleaned at</label>
          <input
            id="cleaned-at"
            type="datetime-local"
            value={cleanedAt}
            onChange={(e) => setCleanedAt(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="method">Method</label>
          <input
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="status">Status</label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as CleaningStatus)}
          >
            <option value="PENDING">PENDING</option>
            <option value="VERIFIED">VERIFIED</option>
          </select>
        </div>
        <div className="field" style={{ gridColumn: "1 / -1" }}>
          <label htmlFor="notes">Notes</label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div className="row">
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
        <button className="btn" type="button" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
}
