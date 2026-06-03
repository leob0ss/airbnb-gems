import type { User } from "../../drizzle/schema";

export type TrpcContext = {
  user: User | null;
};

/** Public browsing app — no auth provider wired yet. */
export async function createContext(_opts?: unknown): Promise<TrpcContext> {
  return { user: null };
}
