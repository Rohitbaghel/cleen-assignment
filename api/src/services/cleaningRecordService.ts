import { CleaningStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";
import { diffChanges } from "../lib/diffChanges";

export type Paginated<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type CreateCleaningInput = {
  cleanedAt: Date;
  method: string;
  notes?: string | null;
  status?: CleaningStatus;
};

export type UpdateCleaningInput = Partial<{
  cleanedAt: Date;
  method: string;
  notes: string | null;
  status: CleaningStatus;
}>;

export type ListCleaningQuery = {
  page: number;
  pageSize: number;
  status?: CleaningStatus;
};

async function assertEquipmentExists(equipmentId: string) {
  const equipment = await prisma.equipment.findUnique({
    where: { id: equipmentId },
  });
  if (!equipment) {
    throw new HttpError(404, "Equipment not found");
  }
}

export async function listCleaningRecords(
  equipmentId: string,
  query: ListCleaningQuery
): Promise<Paginated<Prisma.CleaningRecordGetPayload<object>>> {
  await assertEquipmentExists(equipmentId);

  const where: Prisma.CleaningRecordWhereInput = {
    equipmentId,
    ...(query.status ? { status: query.status } : {}),
  };

  const [total, data] = await Promise.all([
    prisma.cleaningRecord.count({ where }),
    prisma.cleaningRecord.findMany({
      where,
      orderBy: [{ cleanedAt: "desc" }, { id: "desc" }],
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    }),
  ]);

  return {
    data,
    page: query.page,
    pageSize: query.pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize),
  };
}

export async function createCleaningRecord(
  equipmentId: string,
  input: CreateCleaningInput,
  changedBy: string
) {
  await assertEquipmentExists(equipmentId);

  return prisma.$transaction(async (tx) => {
    const record = await tx.cleaningRecord.create({
      data: {
        equipmentId,
        cleanedBy: changedBy,
        cleanedAt: input.cleanedAt,
        method: input.method,
        notes: input.notes ?? null,
        status: input.status ?? CleaningStatus.PENDING,
      },
    });

    const changes = diffChanges(null, {
      cleanedBy: record.cleanedBy,
      cleanedAt: record.cleanedAt,
      method: record.method,
      notes: record.notes,
      status: record.status,
    });

    await tx.auditEntry.create({
      data: {
        cleaningRecordId: record.id,
        changedBy,
        changes,
      },
    });

    return record;
  });
}

export async function updateCleaningRecord(
  id: string,
  input: UpdateCleaningInput,
  changedBy: string
) {
  const existing = await prisma.cleaningRecord.findUnique({ where: { id } });
  if (!existing) {
    throw new HttpError(404, "Cleaning record not found");
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.cleaningRecord.update({
      where: { id },
      data: input,
    });

    const changes = diffChanges(
      {
        cleanedBy: existing.cleanedBy,
        cleanedAt: existing.cleanedAt,
        method: existing.method,
        notes: existing.notes,
        status: existing.status,
      },
      {
        cleanedBy: record.cleanedBy,
        cleanedAt: record.cleanedAt,
        method: record.method,
        notes: record.notes,
        status: record.status,
      }
    );

    if (changes.length > 0) {
      await tx.auditEntry.create({
        data: {
          cleaningRecordId: record.id,
          changedBy,
          changes,
        },
      });
    }

    return record;
  });
}

export async function getAuditHistory(cleaningRecordId: string) {
  const record = await prisma.cleaningRecord.findUnique({
    where: { id: cleaningRecordId },
  });
  if (!record) {
    throw new HttpError(404, "Cleaning record not found");
  }

  return prisma.auditEntry.findMany({
    where: { cleaningRecordId },
    orderBy: [{ changedAt: "asc" }, { id: "asc" }],
  });
}
