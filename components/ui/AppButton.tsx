import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export function AppButton({
  children,
  variant = "primary",
  className,
  ...props
}: {
  children: React.ReactNode;
  variant?: "primary" | "outline" | "ghost";
  className?: string;
} & React.ComponentProps<typeof Button>) {
  const styles = {
    primary:
      "bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-[1.02] active:scale-[0.98]",
    outline:
      "border-2 border-gray-300 hover:border-primary-300 text-gray-900 hover:bg-primary-50",
    ghost:
      "hover:bg-gray-100 text-gray-900",
  };

  return (
    <Button
      {...props}
      className={cn(
        "rounded-xl px-6 py-4 font-semibold transition-all duration-300",
        styles[variant],
        className
      )}
    >
      {children}
    </Button>
  );
}
