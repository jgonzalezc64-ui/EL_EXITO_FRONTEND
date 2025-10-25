import { useContext } from "react";
import { Ctx, type AuthCtx } from "./auth-context";

export function useAuth(): AuthCtx {
  return useContext(Ctx);
}
