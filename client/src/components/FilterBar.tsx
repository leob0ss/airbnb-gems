import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MapPin, X } from "lucide-react";

const STATE_LABELS: Record<string, string> = {
  AK: "Alaska",
  AL: "Alabama",
  AR: "Arkansas",
  AZ: "Arizona",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  IA: "Iowa",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  MA: "Massachusetts",
  MD: "Maryland",
  ME: "Maine",
  MI: "Michigan",
  MN: "Minnesota",
  MO: "Missouri",
  MS: "Mississippi",
  MT: "Montana",
  NC: "North Carolina",
  ND: "North Dakota",
  NE: "Nebraska",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NV: "Nevada",
  NY: "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VA: "Virginia",
  VT: "Vermont",
  WA: "Washington",
  WI: "Wisconsin",
  WV: "West Virginia",
  WY: "Wyoming",
};

function stateLabel(abbr: string): string {
  return STATE_LABELS[abbr] ?? abbr;
}

export interface ActiveFilters {
  state?: string;
  category?: string;
}

interface FilterBarProps {
  filters: ActiveFilters;
  availableStates: string[];
  onFilterChange: (filters: ActiveFilters) => void;
  /** When true, renders just the select + clear — no wrapper div or border */
  inline?: boolean;
}

function StateSelect({
  activeState,
  availableStates,
  onFilterChange,
}: {
  activeState: string | undefined;
  availableStates: string[];
  onFilterChange: (filters: ActiveFilters) => void;
}) {
  return (
    <>
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <MapPin className="w-4 h-4" />
        <span className="hidden sm:inline">Filter by state</span>
      </div>

      <Select
        value={activeState ?? "all"}
        onValueChange={(val) => onFilterChange(val === "all" ? {} : { state: val })}
      >
        <SelectTrigger className="w-48 h-9 text-sm">
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All states</SelectItem>
          {availableStates.map((state) => (
            <SelectItem key={state} value={state}>
              {stateLabel(state)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {activeState && (
        <button
          onClick={() => onFilterChange({})}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-3 h-3" />
          Clear
        </button>
      )}
    </>
  );
}

export default function FilterBar({ filters, availableStates, onFilterChange, inline }: FilterBarProps) {
  const activeState = filters.state;

  if (inline) {
    return (
      <div className="flex items-center gap-3">
        <StateSelect
          activeState={activeState}
          availableStates={availableStates}
          onFilterChange={onFilterChange}
        />
      </div>
    );
  }

  return (
    <div className="w-full border-b border-border/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center gap-3 py-4">
          <StateSelect
            activeState={activeState}
            availableStates={availableStates}
            onFilterChange={onFilterChange}
          />
        </div>
      </div>
    </div>
  );
}
