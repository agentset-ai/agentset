export type KeywordSearchChunk = {
  id: string;
  text: string;
  namespaceId: string;
  tenantId?: string | null;
  documentId: string;
  metadata: string;
  metadata_array?: {
    key: string;
    value: string;
  }[];
};
