export const Overview = ({
  title = "Try chatting with your data here!",
  description = "This is a description of the overview.",
  logo,
}: {
  title?: string | null;
  description?: string | null;
  logo?: string | null;
}) => {
  return (
    <div className="mx-auto w-full px-4 pb-6 md:max-w-3xl">
      <div className="flex w-full flex-col leading-relaxed">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="mb-4 size-8 rounded-md object-cover"
          />
        ) : null}

        {title && <h3 className="text-2xl font-semibold">{title}</h3>}
        {description && (
          <p className="text-muted-foreground mt-2">{description}</p>
        )}
      </div>
    </div>
  );
};
