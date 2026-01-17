import { cn } from "../lib/utils";

interface NavProps {
  title: string;
  subtitle?: string;
  className?: string;
}

export default function Nav({ title, subtitle, className }: NavProps) {
  return (
    <nav className={cn("flex items-center justify-between border-b border-border/40 pb-6", className)}>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-primary">PHub</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle ? <p className="max-w-xl text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="hidden items-center gap-6 text-sm md:flex">
        <a href="/courtroom" className="text-muted-foreground transition-colors hover:text-foreground">Courtroom</a>
        <a href="/monopoly" className="text-muted-foreground transition-colors hover:text-foreground">Monopoly</a>
      </div>
    </nav>
  );
}
