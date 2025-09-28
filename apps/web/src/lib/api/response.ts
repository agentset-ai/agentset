import { NextResponse } from "next/server";

export const makeApiSuccessResponse = ({
  data,
  status = 200,
  headers,
  pagination,
}: {
  data: unknown;
  status?: number;
  headers?: Record<string, string>;
  pagination?: {
    nextCursor?: string | null;
    prevCursor?: string | null;
    hasMore?: boolean;
  };
}) => {
  return NextResponse.json(
    {
      success: true,
      data,
      ...(pagination
        ? {
            pagination: {
              nextCursor: pagination.nextCursor,
              prevCursor: pagination.prevCursor,
              hasMore: pagination.hasMore,
            },
          }
        : {}),
    },
    { status, headers },
  );
};
