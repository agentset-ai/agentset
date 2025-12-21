interface DeploymentStatusBarProps {
  url: string;
}

function validateAndSanitizeUrl(url: string) {
  try {
    const urlObj = new URL(url);

    if (urlObj.protocol !== "http:" && urlObj.protocol !== "https:") {
      return { isValid: false };
    }

    const displayText = urlObj.hostname + urlObj.pathname;

    return {
      isValid: true,
      href: urlObj.href,
      displayText,
    };
  } catch {
    return { isValid: false };
  }
}

export function DeploymentStatusBar({ url }: DeploymentStatusBarProps) {
  const { isValid, href, displayText } = validateAndSanitizeUrl(url);

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
        {isValid && href && displayText ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground text-sm underline"
            aria-label={`Visit deployment at ${displayText}`}
          >
            {displayText}
          </a>
        ) : (
          <span
            className="text-muted-foreground text-sm"
            aria-label={`Deployment URL is invalid or unavailable: ${url}`}
          >
            {url}
          </span>
        )}
      </div>
    </div>
  );
}
