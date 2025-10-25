import api, { login as httpLogin } from "../../api/http";
import type { LoginResponse, Me } from "../../types/seguridad";

export async function login(username: string, password: string): Promise<LoginResponse> {
  return httpLogin(username, password);
}

export async function me(): Promise<Me> {
  const { data } = await api.get<Me>("/seguridad/me/");
  return data;
}
