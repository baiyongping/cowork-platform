import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "./utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-soft hover:shadow-medium",
        secondary: "bg-secondary text-secondary-foreground shadow-soft hover:shadow-medium",
        destructive: "bg-destructive text-white shadow-soft hover:shadow-medium",
        outline: "border border-gray-200 text-gray-700 bg-white hover:bg-gray-50",
        success: "bg-success-500 text-white shadow-soft hover:shadow-medium hover:bg-success-600",
        warning: "bg-warning-500 text-white shadow-soft hover:shadow-medium hover:bg-warning-600",
        info: "bg-info-500 text-white shadow-soft hover:shadow-medium hover:bg-info-600",
        gray: "bg-gray-100 text-gray-600 hover:bg-gray-200",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-xs",
        lg: "px-3 py-1 text-sm",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Badge({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Badge, badgeVariants };