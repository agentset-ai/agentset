"use client";

export default function HostingNotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-6 py-24 sm:py-32 lg:px-8">
      <div className="text-center">
        <p className="text-primary text-base font-semibold">404</p>
        <h1 className="mt-4 text-5xl font-semibold tracking-tight text-balance sm:text-7xl">
          Not Found
        </h1>

        <p className="text-secondary-foreground mt-6 text-lg font-medium text-pretty sm:text-xl/8">
          The hosting you are looking for does not exist.
        </p>
      </div>
    </main>
  );
}
