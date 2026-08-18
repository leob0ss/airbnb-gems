export default function BrandMark({ className = "h-8" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        viewBox="0 0 28 28"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
        aria-hidden="true"
      >
        <polygon
          points="14,2 24,7.5 24,20.5 14,26 4,20.5 4,7.5"
          fill="#FF385C"
        />
        <polygon
          points="14,7 20,10.5 20,17.5 14,21 8,17.5 8,10.5"
          fill="none"
          stroke="#ffffff"
          strokeWidth="1"
          opacity="0.6"
        />
      </svg>
      <span className="text-[28px] font-semibold tracking-tight text-foreground">
        Airbnb <span className="text-[#FF385C]">Gems</span>
      </span>
    </div>
  );
}
