import { Router } from "express";
import { z } from "zod";
import { EquipmentStatus } from "@prisma/client";
import { validateBody } from "../middleware/validate";
import * as equipmentService from "../services/equipmentService";

const createEquipmentSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  status: z.nativeEnum(EquipmentStatus).optional(),
});

const updateEquipmentSchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().min(1).optional(),
    status: z.nativeEnum(EquipmentStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const equipmentRouter = Router();

equipmentRouter.get("/", async (_req, res, next) => {
  try {
    const data = await equipmentService.listEquipment();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

equipmentRouter.get("/:id", async (req, res, next) => {
  try {
    const data = await equipmentService.getEquipment(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});

equipmentRouter.post(
  "/",
  validateBody(createEquipmentSchema),
  async (req, res, next) => {
    try {
      const data = await equipmentService.createEquipment(req.body);
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }
);

equipmentRouter.put(
  "/:id",
  validateBody(updateEquipmentSchema),
  async (req, res, next) => {
    try {
      const data = await equipmentService.updateEquipment(
        req.params.id,
        req.body
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

equipmentRouter.delete("/:id", async (req, res, next) => {
  try {
    await equipmentService.deleteEquipment(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
