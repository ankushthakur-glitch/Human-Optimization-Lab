import { cn } from "cn"

// Specimens are embedded in documentation pages, so the surrounding docs
// container owns width and padding — this only lays out the grid.
function ExampleWrapper({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="example-wrapper"
      className={cn(
        "grid w-full min-w-0 grid-cols-1 items-start gap-6 md:grid-cols-2",
        className
      )}
      {...props}
    />
  )
}

function Example({
  title,
  children,
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"div"> & {
  title?: string
  containerClassName?: string
}) {
  return (
    <div
      data-slot="example"
      className={cn(
        "flex w-full min-w-0 flex-col gap-2 self-stretch",
        containerClassName
      )}
      {...props}
    >
      {title && (
        <div className="text-xs font-medium text-muted-foreground">{title}</div>
      )}
      <div
        data-slot="example-content"
        className={cn(
          "flex min-w-0 flex-1 flex-col items-start gap-6 rounded-xl border bg-card p-6 text-foreground style-lyra:rounded-none style-sera:rounded-none *:[div:not([class*='w-'])]:w-full",
          className
        )}
      >
        {children}
      </div>
    </div>
  )
}

export { ExampleWrapper, Example }
