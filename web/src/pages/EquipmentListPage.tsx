import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useUser } from "../context/UserContext";
import { EquipmentForm } from "../components/EquipmentForm";
import type { Equipment } from "../types";

export function EquipmentListPage() {
  const { userName } = useUser();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const data = await api<Equipment[]>("/api/equipment", { userName });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [userName]);

  return (
    <div className="stack">
      <div>
        <h1>Equipment</h1>
        <p className="lede">
          Select a unit to review cleaning records and the audit trail.
        </p>
      </div>

      {loading && <p className="status-msg">Loading equipment…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && items.length === 0 && (
        <p className="muted">No equipment yet. Add one below.</p>
      )}

      {!loading && items.length > 0 && (
        <div className="panel">
          <table className="data">
            <thead>
              <tr>
                <th>Name</th>
                <th>Code</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td>
                    <Link to={`/equipment/${item.id}`}>{item.name}</Link>
                  </td>
                  <td>
                    <code>{item.code}</code>
                  </td>
                  <td>
                    <span
                      className={`badge ${item.status === "ACTIVE" ? "active" : "retired"}`}
                    >
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EquipmentForm
        onCreated={(created) => setItems((prev) => [...prev, created])}
      />
    </div>
  );
}
