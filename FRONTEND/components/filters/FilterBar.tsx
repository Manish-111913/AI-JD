import { useEffect, useRef } from "react";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { useAppContext } from "@/store/appStore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface FilterBarProps {
  filteredCount: number;
  totalCount: number;
}

const LOCATION_OPTIONS = [
  "Bengaluru, India",
  "Pune, India",
  "Noida, India",
  "Hyderabad, India",
  "Mumbai, India",
  "Delhi NCR, India",
  "Chennai, India",
];

const EXP_OPTIONS = [
  { value: "Any", label: "Any Experience" },
  { value: "0-3", label: "0-3 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "5-9", label: "5-9 years (JD Target)" },
  { value: "9-15", label: "9-15 years" },
  { value: "15+", label: "15+ years" },
];

const COMPANY_OPTIONS = [
  { value: "All", label: "All Company Types" },
  { value: "product", label: "Product Companies" },
  { value: "consulting", label: "Consulting" },
  { value: "research", label: "Research" },
  { value: "startup", label: "Startups" },
];

const SCORE_OPTIONS = [
  { value: "all", label: "All Scores" },
  { value: "0.8+", label: "0.80+ (Top Tier)" },
  { value: "0.6+", label: "0.60+ (Good Fit)" },
  { value: "below0.6", label: "Below 0.60" },
];

export default function FilterBar({ filteredCount, totalCount }: FilterBarProps) {
  const { state, dispatch } = useAppContext();
  const { activeFilters } = state;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleKeyword(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      dispatch({ type: "UPDATE_FILTERS", payload: { keyword: value } });
    }, 300);
  }

  function handleClearAll() {
    dispatch({
      type: "UPDATE_FILTERS",
      payload: {
        keyword: "",
        scoreRange: [0, 1],
        locations: [],
        experienceRange: "Any",
        showHoneypots: false,
        companyType: "All",
      },
    });
  }

  function toggleLocation(loc: string) {
    const existing = activeFilters.locations;
    const updated = existing.includes(loc)
      ? existing.filter((l) => l !== loc)
      : [...existing, loc];
    dispatch({ type: "UPDATE_FILTERS", payload: { locations: updated } });
  }

  const hasActiveFilters =
    activeFilters.keyword !== "" ||
    activeFilters.locations.length > 0 ||
    activeFilters.experienceRange !== "Any" ||
    activeFilters.showHoneypots ||
    activeFilters.companyType !== "All";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {/* Keyword search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, title, company, location..."
            className="pl-8 h-8 text-xs bg-muted/30 border-border"
            defaultValue={activeFilters.keyword}
            onChange={handleKeyword}
            data-testid="input-keyword-search"
          />
        </div>

        {/* Experience filter */}
        <Select
          value={activeFilters.experienceRange}
          onValueChange={(v) => dispatch({ type: "UPDATE_FILTERS", payload: { experienceRange: v } })}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs bg-muted/30 border-border" data-testid="select-experience">
            <SelectValue placeholder="Experience" />
          </SelectTrigger>
          <SelectContent>
            {EXP_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Company type filter */}
        <Select
          value={activeFilters.companyType}
          onValueChange={(v) => dispatch({ type: "UPDATE_FILTERS", payload: { companyType: v } })}
        >
          <SelectTrigger className="h-8 w-[160px] text-xs bg-muted/30 border-border" data-testid="select-company-type">
            <SelectValue placeholder="Company type" />
          </SelectTrigger>
          <SelectContent>
            {COMPANY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Show honeypots toggle */}
        <div className="flex items-center gap-1.5">
          <Switch
            id="honeypot-toggle"
            checked={activeFilters.showHoneypots}
            onCheckedChange={(v) => dispatch({ type: "UPDATE_FILTERS", payload: { showHoneypots: v } })}
            className="h-4 w-7"
            data-testid="switch-show-honeypots"
          />
          <Label htmlFor="honeypot-toggle" className="text-xs text-muted-foreground cursor-pointer whitespace-nowrap">
            Show honeypots
          </Label>
        </div>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={handleClearAll}
            data-testid="button-clear-filters"
          >
            <X className="w-3 h-3" />
            Clear
          </Button>
        )}

        {/* Result count */}
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground whitespace-nowrap" data-testid="text-filter-count">
          <SlidersHorizontal className="w-3 h-3" />
          <span>Showing <span className="text-foreground font-medium">{filteredCount}</span> of {totalCount}</span>
        </div>
      </div>

      {/* Location chips */}
      <div className="flex flex-wrap gap-1">
        {LOCATION_OPTIONS.map((loc) => {
          const active = activeFilters.locations.includes(loc);
          return (
            <button
              key={loc}
              onClick={() => toggleLocation(loc)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                active
                  ? "bg-primary/20 text-primary border-primary/40"
                  : "bg-muted/30 text-muted-foreground border-border hover:border-muted-foreground"
              }`}
              data-testid={`filter-location-${loc.replace(/[,\s]/g, "-")}`}
            >
              {loc.replace(", India", "")}
            </button>
          );
        })}
        {activeFilters.locations.length > 0 && (
          <Badge className="text-[10px] bg-primary/10 text-primary border-0">
            {activeFilters.locations.length} selected
          </Badge>
        )}
      </div>
    </div>
  );
}
