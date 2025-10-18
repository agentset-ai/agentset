import { Logo } from "@agentset/ui";

export const Overview = ({
  message = "Try chatting with your data here!",
  logo,
}: {
  message?: string | null;
  logo?: string | null;
}) => {
  return (
    <div className="mx-auto w-full pb-6 md:max-w-3xl">
      <div className="flex w-full gap-4 px-4 leading-relaxed">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="size-8 rounded-md object-cover"
          />
        ) : (
          <Logo className="size-8" />
        )}

        <h3 className="text-2xl font-semibold">{message}</h3>
      </div>
    </div>
  );
};
