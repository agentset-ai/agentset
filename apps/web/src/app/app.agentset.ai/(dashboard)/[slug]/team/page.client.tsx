"use client";

import { useMemo } from "react";
import { useOrganization } from "@/hooks/use-organization";
import { useSession } from "@/hooks/use-session";
import { useTRPC } from "@/trpc/react";
import { useQuery } from "@tanstack/react-query";

import { CopyButton } from "@agentset/ui/copy-button";
import { DataWrapper } from "@agentset/ui/data-wrapper";
import { Skeleton } from "@agentset/ui/skeleton";

import { MemberCard } from "./member-card";
import { RemoveMemberButton } from "./remove-member";
import { RevokeInvitationButton } from "./revoke-invitation";

export default function TeamSettingsPage() {
  const organization = useOrganization();
  const { session } = useSession();
  const trpc = useTRPC();

  const { data, isLoading: membersLoading } = useQuery(
    trpc.organization.members.queryOptions({
      organizationId: organization.id,
    }),
  );

  const currentMember =
    session &&
    data?.members.find((member) => member.userId === session.user.id);

  const sortedMembers = useMemo(() => {
    if (!data?.members) return [];

    return data.members.sort((a, b) => {
      if (a.role === "owner") return -1;
      if (b.role === "owner") return 1;

      if (a.role === "admin") return -1;
      if (b.role === "admin") return 1;

      return 0;
    });
  }, [data?.members]);

  return (
    <DataWrapper
      data={data}
      isLoading={membersLoading}
      loadingState={
        <div className="flex flex-col gap-6">
          <MemberCardSkeleton />
          <MemberCardSkeleton />
        </div>
      }
    >
      {({ invitations }) => (
        <div className="flex flex-col gap-6">
          {sortedMembers.map((member) => (
            <MemberCard
              type="member"
              key={member.id}
              id={member.id}
              name={member.user.name}
              email={member.user.email}
              image={member.user.image}
              role={member.role}
              showRole={organization.isAdmin}
              actions={
                organization.isAdmin && member.role !== "owner" ? (
                  <RemoveMemberButton
                    memberId={member.id}
                    currentMemberId={currentMember?.id}
                  />
                ) : null
              }
            />
          ))}

          {invitations.map((invitation) => (
            <MemberCard
              type="invitation"
              key={invitation.id}
              id={invitation.id}
              name={invitation.email}
              email={invitation.status}
              role={invitation.role}
              showRole={organization.isAdmin}
              actions={
                organization.isAdmin ? (
                  <>
                    <RevokeInvitationButton invitationId={invitation.id} />

                    <div>
                      <CopyButton
                        textToCopy={`${typeof window !== "undefined" && window.location.origin}/invitation/${invitation.id}`}
                      />
                    </div>
                  </>
                ) : null
              }
            />
          ))}
        </div>
      )}
    </DataWrapper>
  );
}

function MemberCardSkeleton() {
  return (
    <div className="flex items-center justify-between space-x-4">
      <Skeleton className="size-9" />
      <div className="flex flex-col gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
