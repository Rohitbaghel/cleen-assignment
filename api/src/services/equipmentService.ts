import { EquipmentStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { HttpError } from "../lib/errors";

export type CreateEquipmentInput = {
  name: string;
  code: string;
  status?: EquipmentStatus;
};

export type UpdateEquipmentInput = Partial<{
  name: string;
  code: string;
  status: EquipmentStatus;
}>;

export async function listEquipment() {
  return prisma.equipment.findMany({ orderBy: { name: "asc" } });
}

export async function getEquipment(id: string) {
  const equipment = await prisma.equipment.findUnique({ where: { id } });
  if (!equipment) {
    throw new HttpError(404, "Equipment not found");
  }
  return equipment;
}

export async function createEquipment(data: CreateEquipmentInput) {
  try {
    return await prisma.equipment.create({
      data: {
        name: data.name,
        code: data.code,
        status: data.status ?? EquipmentStatus.ACTIVE,
      },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "Conflict", err.meta);
    }
    throw err;
  }
}

export async function updateEquipment(id: string, data: UpdateEquipmentInput) {
  await getEquipment(id);
  try {
    return await prisma.equipment.update({
      where: { id },
      data,
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new HttpError(409, "Conflict", err.meta);
    }
    throw err;
  }
}

export async function deleteEquipment(id: string) {
  await getEquipment(id);
  await prisma.equipment.delete({ where: { id } });
}
