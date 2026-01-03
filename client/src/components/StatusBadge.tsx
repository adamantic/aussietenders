import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const getStatusColor = (s: string) => {
    switch (s.toLowerCase()) {
      case "open":
        return "bg-green-100 text-green-700 border-green-200";
      case "closed":
        return "bg-gray-100 text-gray-700 border-gray-200";
      case "awarded":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "submitted":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "preparing":
        return "bg-amber-100 text-amber-700 border-amber-200";
      case "won":
        return "bg-emerald-100 text-emerald-700 border-emerald-200";
      case "lost":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  return (
    <span
      className={cn(
        "px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        getStatusColor(status),
        className
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
