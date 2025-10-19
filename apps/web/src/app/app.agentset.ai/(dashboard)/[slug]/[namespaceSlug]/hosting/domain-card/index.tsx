import { useState } from "react";
import { useNamespace } from "@/hooks/use-namespace";
import { logEvent } from "@/lib/analytics";
import { SHORT_DOMAIN } from "@/lib/constants";
import { useTRPC } from "@/trpc/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LucideIcon,
  RefreshCwIcon,
  TrashIcon,
  XCircleIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@agentset/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@agentset/ui/card";
import { Input } from "@agentset/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@agentset/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@agentset/ui/tooltip";

import { DnsRecord } from "./dns-record";

const CNAME_VALUE = `cname.${SHORT_DOMAIN}`;
const A_VALUE = "76.76.21.21";

export function useDomainStatus() {
  const trpc = useTRPC();
  const namespace = useNamespace();
  const { data, isFetching, refetch } = useQuery(
    trpc.domain.checkStatus.queryOptions(
      { namespaceId: namespace.id },
      {
        refetchInterval: 20000,
      },
    ),
  );

  return {
    status: data?.status,
    domainJson: data?.response.domainJson,
    configJson: data?.response.configJson,
    loading: isFetching,
    refetch,
  };
}

const getSubdomain = (name: string, apexName: string) => {
  if (name === apexName) return null;
  return name.slice(0, name.length - apexName.length - 1);
};

function DomainConfiguration(props: { domain: string }) {
  const { domain } = props;
  const { status, domainJson, configJson } = useDomainStatus();
  const subdomain = domainJson
    ? getSubdomain(domainJson.name, domainJson.apexName)
    : null;
  const [recordType, setRecordType] = useState(!!subdomain ? "CNAME" : "A");

  if (!status || status === "Valid Configuration" || !domainJson) return null;

  let result = null;
  if (status === "Pending Verification") {
    const txtVerification = domainJson.verification.find(
      (x) => x.type === "TXT",
    )!;

    result = (
      <div>
        <DnsRecord
          instructions={`Please set the following TXT record on <code>${domainJson.apexName}</code> to prove ownership of <code>${domainJson.name}</code>:`}
          records={[
            {
              type: txtVerification.type,
              name: txtVerification.domain.slice(
                0,
                txtVerification.domain.length - domainJson.apexName.length - 1,
              ),
              value: txtVerification.value,
            },
          ]}
          warning="Warning: if you are using this domain for another site, setting this TXT record will transfer domain ownership away from that site and break it. Please exercise caution when setting this record."
        />
      </div>
    );
  } else if (status === "Conflicting DNS Records") {
    const conflicts = configJson?.conflicts ?? [];
    result = (
      <div>
        <Tabs>
          <TabsList>
            <TabsTrigger value="A">
              {conflicts.some((x) => x.type === "A")
                ? "A Record (recommended)"
                : "CNAME Record (recommended)"}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-8">
          <DnsRecord
            instructions="Please remove the following conflicting DNS records from your DNS provider:"
            records={conflicts}
          />
        </div>

        <div className="mt-8">
          <DnsRecord
            instructions="Afterwards, set the following record on your DNS provider:"
            records={[
              {
                type: recordType,
                name: recordType === "A" ? "@" : (subdomain ?? "www"),
                value: recordType === "A" ? A_VALUE : CNAME_VALUE,
                ttl: "86400",
              },
            ]}
          />
        </div>
      </div>
    );
  } else if (status === "Unknown Error") {
    result = (
      <div>
        <p className="text-sm text-red-500">
          {domainJson.error?.message || "Unknown error"}
        </p>
      </div>
    );
  } else {
    result = (
      <div>
        <Tabs value={recordType} onValueChange={setRecordType}>
          <TabsList>
            <TabsTrigger value="A">
              A Record{!subdomain ? " (recommended)" : ""}
            </TabsTrigger>
            <TabsTrigger value="CNAME">
              CNAME Record{subdomain ? " (recommended)" : ""}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4">
          <DnsRecord
            instructions={`To configure your ${
              recordType === "A" ? "apex domain" : "subdomain"
            } <code>${
              recordType === "A" ? domainJson.apexName : domainJson.name
            }</code>, set the following ${recordType} record on your DNS provider:`}
            records={[
              {
                type: recordType,
                name: recordType === "A" ? "@" : (subdomain ?? "www"),
                value: recordType === "A" ? A_VALUE : CNAME_VALUE,
                ttl: "86400",
              },
            ]}
          />
        </div>
      </div>
    );
  }

  return (
    <CardFooter className="mt-8 flex flex-grow justify-start">
      {result}
    </CardFooter>
  );
}

const statues: Record<
  NonNullable<ReturnType<typeof useDomainStatus>["status"]>,
  {
    icon: LucideIcon;
    color: string;
  }
> = {
  "Valid Configuration": {
    icon: CheckCircle2Icon,
    color: "#2563EB",
  },
  "Pending Verification": {
    icon: AlertCircleIcon,
    color: "#FBBF24",
  },
  "Domain Not Found": {
    icon: XCircleIcon,
    color: "#DC2626",
  },
  "Invalid Configuration": {
    icon: XCircleIcon,
    color: "#DC2626",
  },
  "Conflicting DNS Records": {
    icon: AlertCircleIcon,
    color: "#FBBF24",
  },
  "Unknown Error": {
    icon: AlertCircleIcon,
    color: "#DC2626",
  },
};

function DomainStatus({ domain }: { domain: string }) {
  const { status } = useDomainStatus();

  if (!status) return null;

  const Icon = statues[status].icon;
  const color = statues[status].color;

  return (
    <Tooltip>
      <TooltipTrigger>
        <Icon
          fill={color}
          stroke="currentColor"
          className="text-white dark:text-black"
        />
      </TooltipTrigger>
      <TooltipContent>{status}</TooltipContent>
    </Tooltip>
  );
}

const DomainControls = ({
  domain,
  onRemove,
}: {
  domain: string;
  onRemove: () => void;
}) => {
  const { refetch, loading } = useDomainStatus();
  const namespace = useNamespace();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { mutate: removeDomain, isPending: isRemovingDomain } = useMutation(
    trpc.domain.remove.mutationOptions({
      onSuccess: () => {
        logEvent("domain_removed", {
          domain,
          namespaceId: namespace.id,
        });
        toast.success("Domain removed successfully");
        void queryClient.invalidateQueries(
          trpc.hosting.get.queryOptions({
            namespaceId: namespace.id,
          }),
        );
        onRemove();
      },
    }),
  );

  return (
    <>
      <Button
        variant="outline"
        size="icon"
        isLoading={loading}
        type="button"
        onClick={() => refetch()}
      >
        <RefreshCwIcon className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="icon"
        isLoading={isRemovingDomain}
        type="button"
        onClick={() => removeDomain({ namespaceId: namespace.id })}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
    </>
  );
};

export function CustomDomainConfigurator(props: { defaultDomain?: string }) {
  const [domain, setDomain] = useState<string | null>(
    props.defaultDomain ?? null,
  );

  const [domainInput, setDomainInput] = useState<string>(
    props.defaultDomain ?? "",
  );

  const trpc = useTRPC();
  const namespace = useNamespace();

  const { mutate: addDomain, isPending } = useMutation(
    trpc.domain.add.mutationOptions({
      onSuccess: (data) => {
        logEvent("domain_added", {
          domain: data.slug,
          namespaceId: namespace.id,
        });
        setDomain(data.slug);
      },
      onError: (error) => {
        toast.error(error.message || "Failed to add domain");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!domainInput) return;
    addDomain({ domain: domainInput, namespaceId: namespace.id });
  };

  return (
    <Card className="flex w-2xl flex-col space-y-6">
      <form onSubmit={handleSubmit}>
        <CardHeader className="gap-0.5">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            Custom Domain
            {domain && <DomainStatus domain={domain} />}
          </CardTitle>
          <CardDescription>The custom domain for your site.</CardDescription>
        </CardHeader>
        <CardContent className="bg-background relative mt-5 flex w-full flex-row items-center justify-between">
          <Input
            type="text"
            placeholder="example.com"
            maxLength={64}
            className="bg-background max-w-sm"
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
          />

          <div className="flex items-center space-x-2">
            {domain ? (
              <>
                <DomainControls
                  domain={domain}
                  onRemove={() => {
                    setDomain(null);
                    setDomainInput("");
                  }}
                />
              </>
            ) : (
              <Button type="submit" variant="outline" isLoading={isPending}>
                Save
              </Button>
            )}
          </div>
        </CardContent>
        {domain && <DomainConfiguration domain={domain} />}
      </form>
    </Card>
  );
}
