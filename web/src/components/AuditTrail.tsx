import type { AuditEntry } from "../types";

type Props = {
  entries: AuditEntry[];
  loading: boolean;
  error: string | null;
};

function displayValue(value: string | null) {
  return value === null ? "—" : value;
}

export function AuditTrail({ entries, loading, error }: Props) {
  if (loading) {
    return <p className="status-msg">Loading audit trail…</p>;
  }
  if (error) {
    return <p className="error">{error}</p>;
  }
  if (entries.length === 0) {
    return (
      <p className="muted">
        No audit entries yet for this record (seeded rows start empty).
      </p>
    );
  }

  return (
    <div>
      {entries.map((entry) => (
        <div className="audit-entry" key={entry.id}>
          <div className="audit-meta">
            {entry.changedBy} · {new Date(entry.changedAt).toLocaleString()}
          </div>
          <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
            {entry.changes.map((change) => (
              <li className="change-line" key={`${entry.id}-${change.field}`}>
                <strong>{change.field}</strong>:{" "}
                {displayValue(change.oldValue)} →{" "}
                {displayValue(change.newValue)}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
