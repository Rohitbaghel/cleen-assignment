import { beforeEach, describe, expect, it } from "vitest";
import { CleaningStatus, PrismaClient } from "@prisma/client";
import * as cleaningRecordService from "../src/services/cleaningRecordService";

const prisma = new PrismaClient();

describe("cleaningRecordService integration", () => {
  let equipmentId: string;

  beforeEach(async () => {
    await prisma.auditEntry.deleteMany();
    await prisma.cleaningRecord.deleteMany();
    await prisma.equipment.deleteMany();

    const equipment = await prisma.equipment.create({
      data: {
        name: "Test Mixer",
        code: `TEST-${Date.now()}`,
        status: "ACTIVE",
      },
    });
    equipmentId = equipment.id;
  });

  it("paginates with correct total and page size", async () => {
    const now = Date.now();
    await prisma.cleaningRecord.createMany({
      data: Array.from({ length: 15 }, (_, i) => ({
        equipmentId,
        cleanedBy: "Alice",
        cleanedAt: new Date(now - i * 1000),
        method: "CIP",
        notes: null,
        status: CleaningStatus.PENDING,
      })),
    });

    const page1 = await cleaningRecordService.listCleaningRecords(equipmentId, {
      page: 1,
      pageSize: 5,
    });
    expect(page1.data).toHaveLength(5);
    expect(page1.total).toBe(15);
    expect(page1.totalPages).toBe(3);

    const page3 = await cleaningRecordService.listCleaningRecords(equipmentId, {
      page: 3,
      pageSize: 5,
    });
    expect(page3.data).toHaveLength(5);
  });

  it("filters by status", async () => {
    const now = Date.now();
    await prisma.cleaningRecord.createMany({
      data: [
        {
          equipmentId,
          cleanedBy: "Alice",
          cleanedAt: new Date(now),
          method: "CIP",
          status: CleaningStatus.PENDING,
        },
        {
          equipmentId,
          cleanedBy: "Bob",
          cleanedAt: new Date(now - 1000),
          method: "CIP",
          status: CleaningStatus.VERIFIED,
        },
        {
          equipmentId,
          cleanedBy: "Carol",
          cleanedAt: new Date(now - 2000),
          method: "WIP",
          status: CleaningStatus.PENDING,
        },
      ],
    });

    const pending = await cleaningRecordService.listCleaningRecords(
      equipmentId,
      { page: 1, pageSize: 10, status: CleaningStatus.PENDING }
    );
    expect(pending.total).toBe(2);
    expect(pending.data.every((r) => r.status === "PENDING")).toBe(true);
  });

  it("writes create audit with null old values", async () => {
    const record = await cleaningRecordService.createCleaningRecord(
      equipmentId,
      {
        cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
        method: "CIP",
        notes: null,
        status: CleaningStatus.PENDING,
      },
      "Alice"
    );

    expect(record.cleanedBy).toBe("Alice");

    const audit = await cleaningRecordService.getAuditHistory(record.id);
    expect(audit).toHaveLength(1);
    expect(audit[0].changedBy).toBe("Alice");
    const changes = audit[0].changes as Array<{
      field: string;
      oldValue: string | null;
      newValue: string | null;
    }>;
    const methodChange = changes.find((c) => c.field === "method");
    expect(methodChange).toEqual({
      field: "method",
      oldValue: null,
      newValue: "CIP",
    });
  });

  it("writes update audit with only changed fields", async () => {
    const record = await cleaningRecordService.createCleaningRecord(
      equipmentId,
      {
        cleanedAt: new Date("2026-01-15T10:00:00.000Z"),
        method: "CIP",
        status: CleaningStatus.PENDING,
      },
      "Alice"
    );

    await cleaningRecordService.updateCleaningRecord(
      record.id,
      { status: CleaningStatus.VERIFIED },
      "Bob"
    );

    const audit = await cleaningRecordService.getAuditHistory(record.id);
    expect(audit).toHaveLength(2);
    expect(audit[1].changedBy).toBe("Bob");
    expect(audit[1].changes).toEqual([
      { field: "status", oldValue: "PENDING", newValue: "VERIFIED" },
    ]);
  });
});
