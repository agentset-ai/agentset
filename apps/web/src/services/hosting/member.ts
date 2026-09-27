import { db } from "@agentset/db/client";

export const isNamespaceMember = async ({
  userId,
  namespaceId,
}: {
  userId: string;
  namespaceId: string;
}) => {
  const member = await db.member.findFirst({
    where: {
      userId,
      organization: {
        namespaces: {
          some: {
            id: namespaceId,
          },
        },
      },
    },
    select: {
      id: true,
    },
  });

  return !!member;
};
