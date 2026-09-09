import { describe, it, expect } from "vitest";
import { diffChanges } from "../src/lib/diffChanges";

describe("diffChanges", () => {
  it("create: all after fields with oldValue null", () => {
    const after = {
      cleanedBy: "Alice",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "CIP",
      notes: null,
      status: "PENDING",
    };
    const changes = diffChanges(null, after);
    expect(changes).toEqual([
      { field: "cleanedBy", oldValue: null, newValue: "Alice" },
      {
        field: "cleanedAt",
        oldValue: null,
        newValue: "2026-01-15T10:00:00.000Z",
      },
      { field: "method", oldValue: null, newValue: "CIP" },
      { field: "notes", oldValue: null, newValue: null },
      { field: "status", oldValue: null, newValue: "PENDING" },
    ]);
  });

  it("update: only changed fields", () => {
    const before = {
      cleanedBy: "Alice",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "CIP",
      notes: "ok",
      status: "PENDING",
    };
    const after = { ...before, status: "VERIFIED", notes: "checked" };
    expect(diffChanges(before, after)).toEqual([
      { field: "notes", oldValue: "ok", newValue: "checked" },
      { field: "status", oldValue: "PENDING", newValue: "VERIFIED" },
    ]);
  });

  it("update: identical → empty", () => {
    const row = {
      cleanedBy: "Bob",
      cleanedAt: "2026-01-15T10:00:00.000Z",
      method: "WIP",
      notes: null,
      status: "PENDING",
    };
    expect(diffChanges(row, row)).toEqual([]);
  });

  it("normalizes Date and ISO string to same value", () => {
    const before = {
      cleanedBy: "Bob",
      cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
      method: "WIP",
      notes: null,
      status: "PENDING",
    };
    const after = {
      ...before,
      cleanedAt: "2026-01-15T10:00:00.000Z",
    };
    expect(diffChanges(before, after)).toEqual([]);
  });
});
