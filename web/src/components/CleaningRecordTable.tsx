import type { CleaningRecord } from "../types";

type Props = {
  records: CleaningRecord[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString();
}

export function CleaningRecordTable({
  records,
  selectedId,
  onSelect,
}: Props) {
  if (records.length === 0) {
    return <p className="muted">No cleaning records for this filter.</p>;
  }

  return (
    <table className="data">
      <thead>
        <tr>
          <th>Cleaned at</th>
          <th>By</th>
          <th>Method</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {records.map((record) => (
          <tr
            key={record.id}
            className={selectedId === record.id ? "selected" : undefined}
            onClick={() => onSelect(record.id)}
          >
            <td>{formatWhen(record.cleanedAt)}</td>
            <td>{record.cleanedBy}</td>
            <td>{record.method}</td>
            <td>
              <span
                className={`badge ${record.status === "VERIFIED" ? "verified" : "pending"}`}
              >
                {record.status}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
