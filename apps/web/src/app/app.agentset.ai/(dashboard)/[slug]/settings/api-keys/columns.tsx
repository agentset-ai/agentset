import type { ColumnDef } from "@tanstack/react-table";

import { ApiKeyActions } from "./actions";

// TODO: API key management should be improved - implement proper security with hashing/encryption
export interface ApiKeyDef {
  id: string;
  key: string;
  label: string;
  scope: string;
  organizationId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const columns: ColumnDef<ApiKeyDef>[] = [
  {
    header: () => <div className="pl-4">Label</div>,
    accessorKey: "label",
    cell: ({ row }) => {
      return <div className="pl-4">{row.original.label}</div>;
    },
  },
  {
    header: () => <div className="text-left">API Key</div>,
    accessorKey: "key",
    cell: ({ row }) => {
      return (
        <div className="text-left">
          <div
            className="inline-block cursor-help blur-xs transition-all duration-200 hover:blur-none"
            title="Hover to reveal"
          >
            {row.original.key}
          </div>
        </div>
      );
    },
  },
  {
    header: () => <div className="text-left">Scope</div>,
    accessorKey: "scope",
    cell: ({ row }) => {
      return <div className="text-left">{row.original.scope}</div>;
    },
  },
  {
    header: () => <div className="text-left">Created At</div>,
    accessorKey: "createdAt",
    cell: ({ row }) => {
      return (
        <div className="text-left">
          {row.original.createdAt.toLocaleString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <div className="text-right">
          <ApiKeyActions row={row} />
        </div>
      );
    },
  },
];
