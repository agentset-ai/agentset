import { cn } from "../lib/utils";

type SvgProps = React.SVGProps<SVGSVGElement>;

export function Logo({ className, ...props }: SvgProps) {
  return (
    <svg
      className={cn("overflow-visible", className)}
      viewBox="0 0 46 43"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M27.8202 0.228516C30.154 0.228516 32.2187 1.74814 32.923 3.98412L45.1422 42.7738H35.66C33.3262 42.7738 31.2614 41.2542 30.5572 39.0181L18.3378 0.228748L11.6369 21.5012H5.54337C1.924 21.5012 -0.651966 17.9662 0.440431 14.4984L4.93572 0.228516H27.8202ZM17.7795 21.5011C21.399 21.5011 23.975 25.0359 22.8825 28.5039L18.3876 42.7727H4.98533L11.6863 21.5011H17.7795Z"
        fill="currentColor"
      />
    </svg>
  );
}
