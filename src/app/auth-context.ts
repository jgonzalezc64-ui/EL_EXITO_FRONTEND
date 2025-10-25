import { createContext } from "react";
import type { Me } from "../types/seguridad";

export type AuthCtx = {
  user: Me | null;
  loading: boolean;
  login: (u: string, p: string) => Promise<void>;
  logout: () => void;
  hasRole: (role: string) => boolean;
};

// Solo exporta el contexto. No hay componentes en este archivo.
export const Ctx = createContext<AuthCtx>({} as AuthCtx);
