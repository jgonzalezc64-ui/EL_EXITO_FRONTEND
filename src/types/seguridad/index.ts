export type Me = {
  id: number;
  username: string;
  groups: string[];      // <-- importante
  is_superuser: boolean; // <-- importante
};


export type LoginResponse = { access: string; refresh: string };
