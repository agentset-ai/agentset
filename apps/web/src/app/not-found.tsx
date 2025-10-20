import Link from "next/link";

import { Button } from "@agentset/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Page not found
        </h1>

        <p className="text-secondary-foreground mt-6 text-lg font-medium text-pretty sm:text-xl/8">
          Sorry, we couldn’t find the page you’re looking for.
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          <Button asChild>
            <Link href="/">Go back home</Link>
          </Button>

          <a
            href="mailto:support@agentset.ai"
            className="text-sm font-semibold"
          >
            Contact support <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
      </div>
    </main>
  );
}
