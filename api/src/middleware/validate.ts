import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { HttpError } from "../lib/errors";

export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new HttpError(400, "Validation failed", result.error.flatten())
      );
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new HttpError(400, "Validation failed", result.error.flatten())
      );
    }
    req.query = result.data as typeof req.query;
    next();
  };
}
