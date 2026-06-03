export default function ListingCardSkeleton() {
  return (
    <div className="bg-card rounded-sm overflow-hidden border border-border">
      {/* Image skeleton */}
      <div className="aspect-[4/3] skeleton" />
      {/* Content skeleton */}
      <div className="p-4 space-y-2">
        <div className="h-2.5 w-20 skeleton rounded-sm" />
        <div className="h-5 w-full skeleton rounded-sm" />
        <div className="h-4 w-3/4 skeleton rounded-sm" />
        <div className="flex gap-1 pt-1">
          <div className="h-4 w-16 skeleton rounded-sm" />
          <div className="h-4 w-14 skeleton rounded-sm" />
        </div>
        <div className="flex justify-between pt-2 border-t border-border/60">
          <div className="h-3 w-16 skeleton rounded-sm" />
          <div className="h-3 w-14 skeleton rounded-sm" />
        </div>
      </div>
    </div>
  );
}
