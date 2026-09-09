import { PrismaClient, CleaningStatus, EquipmentStatus } from "@prisma/client";

const prisma = new PrismaClient();

const USERS = ["Alice", "Bob", "Carol"] as const;
const METHODS = ["CIP", "Manual wipe", "Steam", "Foam"] as const;

async function main() {
  const existing = await prisma.equipment.count();
  if (existing > 0) {
    console.log(`Seed skipped: ${existing} equipment row(s) already present`);
    return;
  }

  await prisma.equipment.createMany({
    data: [
      {
        name: "Mixer Tank A",
        code: "EQ-001",
        status: EquipmentStatus.ACTIVE,
      },
      {
        name: "Conveyor Belt B",
        code: "EQ-002",
        status: EquipmentStatus.ACTIVE,
      },
      {
        name: "Filler Line C",
        code: "EQ-003",
        status: EquipmentStatus.RETIRED,
      },
      {
        name: "Pasteurizer D",
        code: "EQ-004",
        status: EquipmentStatus.ACTIVE,
      },
    ],
  });

  const equipment = await prisma.equipment.findMany({
    orderBy: { code: "asc" },
  });
  const byCode = Object.fromEntries(equipment.map((e) => [e.code, e]));
  const primary = byCode["EQ-001"];
  const now = Date.now();

  const primaryRecords = Array.from({ length: 16 }, (_, i) => ({
    equipmentId: primary.id,
    cleanedBy: USERS[i % USERS.length],
    cleanedAt: new Date(now - i * 60 * 60 * 1000),
    method: METHODS[i % METHODS.length],
    notes: i % 3 === 0 ? `Seed note ${i + 1}` : null,
    status: i % 2 === 0 ? CleaningStatus.PENDING : CleaningStatus.VERIFIED,
  }));

  const otherRecords = [
    {
      equipmentId: byCode["EQ-002"].id,
      cleanedBy: "Alice",
      cleanedAt: new Date(now - 2 * 60 * 60 * 1000),
      method: "Manual wipe",
      notes: null,
      status: CleaningStatus.PENDING,
    },
    {
      equipmentId: byCode["EQ-002"].id,
      cleanedBy: "Bob",
      cleanedAt: new Date(now - 5 * 60 * 60 * 1000),
      method: "Foam",
      notes: "Post-shift clean",
      status: CleaningStatus.VERIFIED,
    },
    {
      equipmentId: byCode["EQ-003"].id,
      cleanedBy: "Carol",
      cleanedAt: new Date(now - 24 * 60 * 60 * 1000),
      method: "CIP",
      notes: "Final clean before retirement",
      status: CleaningStatus.VERIFIED,
    },
    {
      equipmentId: byCode["EQ-004"].id,
      cleanedBy: "Alice",
      cleanedAt: new Date(now - 3 * 60 * 60 * 1000),
      method: "Steam",
      notes: null,
      status: CleaningStatus.PENDING,
    },
  ];

  await prisma.cleaningRecord.createMany({
    data: [...primaryRecords, ...otherRecords],
  });

  const counts = {
    equipment: await prisma.equipment.count(),
    cleaningRecords: await prisma.cleaningRecord.count(),
    auditEntries: await prisma.auditEntry.count(),
  };

  console.log("Seed complete:", counts);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
