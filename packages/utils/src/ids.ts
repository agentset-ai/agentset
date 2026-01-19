const _prefixes = ["ns_", "user_", "org_", "job_", "doc_"] as const;

export type IdPrefix = (typeof _prefixes)[number];

export const prefixId = (id: string, prefix: IdPrefix) => {
  return id.startsWith(prefix) ? id : `${prefix}${id}`;
};

export const normalizeId = (id: string, prefix: IdPrefix) => {
  return id.startsWith(prefix) ? id.replace(prefix, "") : id;
};
