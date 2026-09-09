import { Request, Response, NextFunction } from "express";
import { HttpError } from "../lib/errors";

export function requireUser(req: Request, _res: Response, next: NextFunction) {
  const name = req.header("X-User-Name")?.trim();
  if (!name) {
    return next(new HttpError(401, "X-User-Name header required"));
  }
  req.userName = name;
  next();
}
