// Runs before EU deploys with the EU env file loaded, so a deploy can't go
// out with another region's configuration
if (process.env.NEXT_PUBLIC_DEPLOYMENT_REGION !== "eu") {
  console.error(
    "EU deploys require NEXT_PUBLIC_DEPLOYMENT_REGION=eu in the EU env file and in the EU Trigger.dev environment",
  );
  process.exit(1);
}
