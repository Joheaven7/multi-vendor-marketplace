import type { Role } from "../models/User";

declare global {
  namespace Express {
    interface Request {
      /** Set by `authenticate`. Never trust IDs from the client; use this. */
      user?: { id: string; role: Role; email: string; name: string };
      /** Set by `requireActiveSeller`. Every seller query must be scoped to this id. */
      seller?: { id: string };
    }
  }
}

export {};