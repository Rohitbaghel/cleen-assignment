import { Router } from "express";
import { z } from "zod";
import { CleaningStatus } from "@prisma/client";
import { validateBody, validateQuery } from "../middleware/validate";
import * as cleaningRecordService from "../services/cleaningRecordService";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  status: z.nativeEnum(CleaningStatus).optional(),
});

const createSchema = z.object({
  cleanedAt: z.coerce.date(),
  method: z.string().min(1),
  notes: z.string().nullable().optional(),
  status: z.nativeEnum(CleaningStatus).optional(),
});

const updateSchema = z
  .object({
    cleanedAt: z.coerce.date().optional(),
    method: z.string().min(1).optional(),
    notes: z.string().nullable().optional(),
    status: z.nativeEnum(CleaningStatus).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field is required",
  });

export const equipmentCleaningRouter = Router({ mergeParams: true });

equipmentCleaningRouter.get(
  "/",
  validateQuery(listQuerySchema),
  async (req, res, next) => {
    try {
      const query = listQuerySchema.parse(req.query);
      const data = await cleaningRecordService.listCleaningRecords(
        req.params.id,
        query
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

equipmentCleaningRouter.post(
  "/",
  validateBody(createSchema),
  async (req, res, next) => {
    try {
      const data = await cleaningRecordService.createCleaningRecord(
        req.params.id,
        req.body,
        req.userName
      );
      res.status(201).json(data);
    } catch (err) {
      next(err);
    }
  }
);

export const cleaningRecordsRouter = Router();

cleaningRecordsRouter.put(
  "/:id",
  validateBody(updateSchema),
  async (req, res, next) => {
    try {
      const data = await cleaningRecordService.updateCleaningRecord(
        req.params.id,
        req.body,
        req.userName
      );
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
);

cleaningRecordsRouter.get("/:id/audit", async (req, res, next) => {
  try {
    const data = await cleaningRecordService.getAuditHistory(req.params.id);
    res.json(data);
  } catch (err) {
    next(err);
  }
});
