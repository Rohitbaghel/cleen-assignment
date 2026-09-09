import { Request } from "express";

declare module "express-serve-static-core" {
  interface Request {
    userName: string;
  }
}

export type AuthedRequest = Request & { userName: string };
