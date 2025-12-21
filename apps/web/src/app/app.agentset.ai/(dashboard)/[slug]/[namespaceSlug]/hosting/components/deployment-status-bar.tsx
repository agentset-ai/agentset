interface DeploymentStatusBarProps {
  url: string;
}

export function DeploymentStatusBar({ url }: DeploymentStatusBarProps) {
  return (
    <div className="bg-background border-b pb-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-full w-full rounded-full bg-green-500" />
          </span>
          <span className="text-sm font-medium">Your deployment is live!</span>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-muted-foreground text-sm underline"
        >
          {url.replace("https://", "").replace("http://", "")}
        </a>
      </div>
    </div>
  );
}
