const A = "access";
const R = "refresh";

export const tokens = {
  get access()  { return localStorage.getItem(A) || ""; },
  get refresh() { return localStorage.getItem(R) || ""; },
  set(access: string, refresh: string) {
    localStorage.setItem(A, access);
    localStorage.setItem(R, refresh);
  },
  clear() {
    localStorage.removeItem(A);
    localStorage.removeItem(R);
  }
};
