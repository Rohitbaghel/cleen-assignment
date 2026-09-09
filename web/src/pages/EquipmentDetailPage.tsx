import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { useUser } from "../context/UserContext";
import { AuditTrail } from "../components/AuditTrail";
import { CleaningRecordForm } from "../components/CleaningRecordForm";
import { CleaningRecordTable } from "../components/CleaningRecordTable";
import type {
  AuditEntry,
  CleaningRecord,
  CleaningStatus,
  Equipment,
  Paginated,
} from "../types";

export function EquipmentDetailPage() {
  const { id = "" } = useParams();
  const { userName } = useUser();

  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [statusFilter, setStatusFilter] = useState<"" | CleaningStatus>("");
  const [records, setRecords] = useState<Paginated<CleaningRecord> | null>(
    null
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<CleaningRecord | null>(null);

  const [loadingEq, setLoadingEq] = useState(true);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const loadEquipment = useCallback(async () => {
    setLoadingEq(true);
    try {
      const data = await api<Equipment>(`/api/equipment/${id}`, { userName });
      setEquipment(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load equipment");
    } finally {
      setLoadingEq(false);
    }
  }, [id, userName]);

  const loadRecords = useCallback(async () => {
    setLoadingRecords(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (statusFilter) {
        params.set("status", statusFilter);
      }
      const data = await api<Paginated<CleaningRecord>>(
        `/api/equipment/${id}/cleaning-records?${params}`,
        { userName }
      );
      setRecords(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load records");
    } finally {
      setLoadingRecords(false);
    }
  }, [id, page, pageSize, statusFilter, userName]);

  const loadAudit = useCallback(
    async (recordId: string) => {
      setLoadingAudit(true);
      setAuditError(null);
      try {
        const data = await api<AuditEntry[]>(
          `/api/cleaning-records/${recordId}/audit`,
          { userName }
        );
        setAudit(data);
      } catch (err) {
        setAuditError(
          err instanceof Error ? err.message : "Failed to load audit"
        );
      } finally {
        setLoadingAudit(false);
      }
    },
    [userName]
  );

  useEffect(() => {
    void loadEquipment();
  }, [loadEquipment]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  useEffect(() => {
    if (selectedId) {
      void loadAudit(selectedId);
    } else {
      setAudit([]);
    }
  }, [selectedId, loadAudit]);

  const selectedRecord =
    records?.data.find((r) => r.id === selectedId) ?? editing;

  async function handleSave(payload: {
    cleanedAt: string;
    method: string;
    notes: string | null;
    status: CleaningStatus;
  }) {
    if (editing) {
      await api<CleaningRecord>(`/api/cleaning-records/${editing.id}`, {
        method: "PUT",
        userName,
        body: JSON.stringify(payload),
      });
      const target = editing.id;
      setShowForm(false);
      setEditing(null);
      await loadRecords();
      setSelectedId(target);
      await loadAudit(target);
    } else {
      const created = await api<CleaningRecord>(
        `/api/equipment/${id}/cleaning-records`,
        {
          method: "POST",
          userName,
          body: JSON.stringify(payload),
        }
      );
      setShowForm(false);
      setEditing(null);
      await loadRecords();
      setSelectedId(created.id);
      await loadAudit(created.id);
    }
  }

  if (loadingEq) {
    return <p className="status-msg">Loading equipment…</p>;
  }

  if (!equipment) {
    return (
      <div>
        <Link className="back-link" to="/">
          ← Equipment
        </Link>
        <p className="error">{error ?? "Equipment not found"}</p>
      </div>
    );
  }

  return (
    <div className="stack">
      <div>
        <Link className="back-link" to="/">
          ← Equipment
        </Link>
        <h1>
          {equipment.name}{" "}
          <span className="badge">{equipment.code}</span>
        </h1>
        <p className="lede">
          Cleaning records for this unit. Select a row to inspect field-level
          audit history.
        </p>
      </div>

      <div className="panel stack">
        <div className="row" style={{ justifyContent: "space-between" }}>
          <div className="row">
            <label htmlFor="status-filter" className="muted">
              Status
            </label>
            <select
              id="status-filter"
              value={statusFilter}
              onChange={(e) => {
                setPage(1);
                setStatusFilter(e.target.value as "" | CleaningStatus);
              }}
            >
              <option value="">All</option>
              <option value="PENDING">PENDING</option>
              <option value="VERIFIED">VERIFIED</option>
            </select>
          </div>
          <button
            className="btn primary"
            type="button"
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            Add record
          </button>
        </div>

        {loadingRecords && <p className="status-msg">Loading records…</p>}
        {error && <p className="error">{error}</p>}
        {records && (
          <>
            <CleaningRecordTable
              records={records.data}
              selectedId={selectedId}
              onSelect={(recordId) => {
                setSelectedId(recordId);
              }}
            />
            <div className="row" style={{ justifyContent: "space-between" }}>
              <span className="muted">
                Page {records.page} of {Math.max(records.totalPages, 1)} ·{" "}
                {records.total} total
              </span>
              <div className="row">
                <button
                  className="btn"
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <button
                  className="btn"
                  type="button"
                  disabled={page >= records.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
                {selectedRecord && (
                  <button
                    className="btn"
                    type="button"
                    onClick={() => {
                      setEditing(selectedRecord);
                      setShowForm(true);
                    }}
                  >
                    Edit selected
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {showForm && (
        <CleaningRecordForm
          initial={editing}
          onCancel={() => {
            setShowForm(false);
            setEditing(null);
          }}
          onSubmit={handleSave}
        />
      )}

      <div className="panel stack">
        <h2 style={{ margin: 0, fontSize: "1.05rem" }}>Audit trail</h2>
        {!selectedId && (
          <p className="muted">Select a cleaning record to view its history.</p>
        )}
        {selectedId && (
          <AuditTrail
            entries={audit}
            loading={loadingAudit}
            error={auditError}
          />
        )}
      </div>
    </div>
  );
}
