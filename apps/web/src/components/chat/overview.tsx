export const Overview = ({
  title,
  description,
  logo,
}: {
  title?: string | null;
  description?: string | null;
  logo?: string | null;
}) => {
  return (
    <div className="mx-auto w-full px-4 pb-6 md:max-w-3xl">
      <div className="flex w-full flex-col gap-4 leading-relaxed">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="size-8 rounded-md object-cover"
          />
        ) : null}

        <div className="flex flex-col gap-2">
          {title && <h3 className="text-2xl font-semibold">{title}</h3>}
          {description && (
            <p className="text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
};
