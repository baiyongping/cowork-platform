import * as React from "react";

import { cn } from "./utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-gray-400 selection:bg-primary selection:text-primary-foreground border-gray-200 flex h-10 w-full min-w-0 rounded-xl border px-4 py-2.5 text-base bg-white transition-all duration-300 outline-none shadow-soft file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:shadow-medium hover:border-gray-300",
        "aria-invalid:ring-destructive/20 aria-invalid:border-destructive bg-red-50 hover:bg-red-50/50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
