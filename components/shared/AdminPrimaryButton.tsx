import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
};

export function AdminPrimaryButton({
  className,
  disabled,
  loading,
  children,
  ...props
}: Props) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={cn(
        // layout
        "inline-flex items-center justify-center gap-2",
        "rounded-xl px-5 py-2.5 text-sm font-semibold",

        // color
        "bg-admin-600 text-white",
        "hover:bg-admin-700",

        // premium feel
        "shadow-md shadow-admin-600/25",
        "active:scale-[0.98] active:shadow-sm",

        // focus / accessibility
        "focus-visible:outline-none",
        "focus-visible:ring-2 focus-visible:ring-admin-600",
        "focus-visible:ring-offset-2",

        // disabled
        "disabled:cursor-not-allowed disabled:opacity-60",
        "disabled:hover:bg-admin-600",

        // motion
        "transition-all duration-150 ease-out",

        className
      )}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
      )}
      {children}
    </button>
  );
}
