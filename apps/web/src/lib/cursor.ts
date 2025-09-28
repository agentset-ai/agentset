export type CursorPayload = {
  id: string;
  createdAt: Date;
};

const isomorphicEncode = (s: string) => {
  if (typeof Buffer === "undefined") return btoa(s);
  return Buffer.from(s).toString("base64");
};

const isomorphicDecode = (s: string) => {
  if (typeof Buffer === "undefined") return atob(s);
  return Buffer.from(s, "base64").toString("utf8");
};

// opaque cursor helpers
export const encodeCursor = (c: CursorPayload) => {
  const str = `${c.id}:${c.createdAt.getTime()}`;
  return isomorphicEncode(str);
};

export const decodeCursor = (s: string): CursorPayload => {
  const str = isomorphicDecode(s);
  const [id, createdAt] = str.split(":");

  if (!id || !createdAt || isNaN(Number(createdAt)))
    throw new Error("Invalid cursor");

  const obj = {
    createdAt: new Date(Number(createdAt)),
    id,
  };

  return obj;
};
