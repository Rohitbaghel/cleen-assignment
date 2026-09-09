import { useState, type FormEvent } from "react";
import { api } from "../api/client";
import { useUser } from "../context/UserContext";
import type { Equipment, EquipmentStatus } from "../types";

type Props = {
  onCreated: (equipment: Equipment) => void;
};

export function EquipmentForm({ onCreated }: Props) {
  const { userName } = useUser();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<EquipmentStatus>("ACTIVE");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const created = await api<Equipment>("/api/equipment", {
        method: "POST",
        userName,
        body: JSON.stringify({ name, code, status }),
      });
      setName("");
      setCode("");
      setStatus("ACTIVE");
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="panel stack" onSubmit={onSubmit}>
      <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Add equipment</h2>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="eq-name">Name</label>
          <input
            id="eq-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="eq-code">Code</label>
          <input
            id="eq-code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
          />
        </div>
        <div className="field">
          <label htmlFor="eq-status">Status</label>
          <select
            id="eq-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
          >
            <option value="ACTIVE">ACTIVE</option>
            <option value="RETIRED">RETIRED</option>
          </select>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      <div>
        <button className="btn primary" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Create"}
        </button>
      </div>
    </form>
  );
}
