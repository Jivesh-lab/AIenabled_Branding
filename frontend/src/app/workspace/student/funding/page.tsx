"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import PageContainer from "@/components/shared/PageContainer";
import PageHeader from "@/components/shared/PageHeader";
import { Card } from "@/components/shared/Surface";
import { GRANT_OPPORTUNITIES, type GrantOpportunity } from "@/lib/fundingGrants";
import {
  Sparkles,
  Calendar,
  Building,
  CheckCircle2,
  ArrowRight,
  Search,
  Check,
  ChevronDown,
  X,
  SlidersHorizontal,
  RotateCcw,
} from "lucide-react";
import { BanknotesIcon, ShieldCheckIcon, TrophyIcon } from "@heroicons/react/24/outline";

const DOMAIN_OPTIONS = [
  "AI / Deep Tech",
  "AgriTech",
  "Hardware / CleanTech / IoT",
  "ICT / Software / Electronics",
  "HealthTech / BioTech",
];

const CATEGORY_OPTIONS = [
  "All",
  "Institutional",
  "Government Scheme",
  "Industry Partner",
];

type SortOption = "recommended" | "deadline" | "amount_desc" | "recently_added";

export default function StudentFundingPage() {
  // Search & filter states
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<SortOption>("recommended");

  // Popover / dropdown open states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [domainOpen, setDomainOpen] = useState(false);
  const [domainFilterText, setDomainFilterText] = useState("");
  const [sortOpen, setSortOpen] = useState(false);

  // Modal states
  const [selectedGrant, setSelectedGrant] = useState<GrantOpportunity | null>(null);
  const [applicationSuccess, setApplicationSuccess] = useState(false);

  // Dropdown DOM refs for outside clicks
  const categoryRef = useRef<HTMLDivElement>(null);
  const domainRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // Debounce search query input (150ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Click outside listener for custom dropdowns/popovers
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (categoryRef.current && !categoryRef.current.contains(target)) {
        setCategoryOpen(false);
      }
      if (domainRef.current && !domainRef.current.contains(target)) {
        setDomainOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(target)) {
        setSortOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setCategoryOpen(false);
        setDomainOpen(false);
        setSortOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Open-call count derived from opportunity list
  const openCalls = GRANT_OPPORTUNITIES.filter((g) => g.openCall).length;
  const KPIS = [
    { label: "Total Grant Corpus", value: "₹77+ Lakhs", icon: BanknotesIcon },
    { label: "Active Funding Calls", value: `${openCalls} schemes`, icon: TrophyIcon },
    { label: "Grant Equity Policy", value: "0% equity", icon: ShieldCheckIcon },
  ];

  // Filtering & sorting logic
  const filtered = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    const matches = GRANT_OPPORTUNITIES.filter((item) => {
      // Category filter
      const matchCategory =
        selectedCategory === "All" || item.category === selectedCategory;

      // Domain filter: if none selected, all domains show.
      // If selected: matches if item.domain is in selectedDomains, or if item is "Any Domain" (general grant open to all sectors).
      const matchDomain =
        selectedDomains.length === 0 ||
        selectedDomains.includes(item.domain) ||
        item.domain.toLowerCase() === "any domain";

      // Search across name, provider, description, stage
      const matchSearch =
        !query ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.provider.toLowerCase().includes(query) ||
        item.stage.toLowerCase().includes(query) ||
        item.domain.toLowerCase().includes(query);

      return matchCategory && matchDomain && matchSearch;
    });

    // Apply sorting
    const result = [...matches];
    if (sortBy === "deadline") {
      result.sort((a, b) => {
        const timeA = Date.parse(a.deadline) || 0;
        const timeB = Date.parse(b.deadline) || 0;
        return timeA - timeB;
      });
    } else if (sortBy === "amount_desc") {
      const extractAmount = (amt: string) => {
        const num = amt.replace(/[^0-9]/g, "");
        return num ? parseInt(num, 10) : 0;
      };
      result.sort((a, b) => extractAmount(b.amount) - extractAmount(a.amount));
    } else if (sortBy === "recently_added") {
      result.reverse();
    }

    return result;
  }, [debouncedSearch, selectedCategory, selectedDomains, sortBy]);

  // Helpers
  const toggleDomain = (domain: string) => {
    setSelectedDomains((prev) =>
      prev.includes(domain) ? prev.filter((d) => d !== domain) : [...prev, domain]
    );
  };

  const handleClearAll = () => {
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("All");
    setSelectedDomains([]);
    setSortBy("recommended");
  };

  const hasActiveFilters =
    selectedCategory !== "All" ||
    selectedDomains.length > 0 ||
    debouncedSearch.trim().length > 0;

  const sortLabels: Record<SortOption, string> = {
    recommended: "Recommended",
    deadline: "Deadline (Earliest)",
    amount_desc: "Funding Amount (High to Low)",
    recently_added: "Recently Added",
  };

  // Filtered domain list for inside domain popover
  const visibleDomainOptions = DOMAIN_OPTIONS.filter((d) =>
    d.toLowerCase().includes(domainFilterText.toLowerCase())
  );

  function handleOpenApply(grant: GrantOpportunity) {
    setSelectedGrant(grant);
    setApplicationSuccess(false);
  }

  function handleConfirmApply() {
    setApplicationSuccess(true);
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <PageHeader
          title="Funding & Grant Opportunities"
          description="Institutional incubation grants, DST PRAYAS, MeitY TIDE, and corporate seed funds available for researcher innovators at DBIT."
        />

        {/* KPI row - same card style as the dashboard, projects and meetings pages. */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:gap-4">
          {KPIS.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-start justify-between gap-3 rounded-xl border border-line bg-white p-4 shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-[13px] font-medium text-muted-ink">{label}</p>
                <p className="mt-1 text-[24px] font-bold leading-none tabular-nums text-brand">{value}</p>
              </div>
              <Icon className="size-[18px] shrink-0 text-brand-cyan" aria-hidden="true" />
            </div>
          ))}
        </div>

        {/* Search & Filtering Controls */}
        <div className="flex flex-col gap-3">
          {/* Main Controls Row: Search Input + Category + Domain + Sort Dropdowns */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            {/* Search Input */}
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-ink" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search grants by name, provider or keyword..."
                className="h-10 w-full rounded-lg border border-line bg-white pl-9 pr-9 text-[13px] text-ink shadow-2xs placeholder:text-muted-ink transition-colors hover:border-slate-300 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/15"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-ink hover:text-ink transition-colors"
                  aria-label="Clear search input"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns Row */}
            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:shrink-0">
              {/* Category Dropdown */}
              <div className="relative w-full sm:w-auto" ref={categoryRef}>
                <button
                  type="button"
                  onClick={() => {
                    setCategoryOpen((prev) => !prev);
                    setDomainOpen(false);
                    setSortOpen(false);
                  }}
                  className={`inline-flex h-10 w-full sm:w-auto items-center justify-between gap-2 rounded-lg border px-3 text-[13px] font-medium shadow-2xs transition-colors ${
                    selectedCategory !== "All"
                      ? "border-brand bg-brand-soft/40 text-brand font-semibold"
                      : "border-line bg-white text-ink hover:bg-slate-50 hover:border-slate-300"
                  }`}
                  aria-expanded={categoryOpen}
                  aria-haspopup="listbox"
                >
                  <span className="truncate max-w-[150px]">
                    {selectedCategory === "All" ? "All Categories" : selectedCategory}
                  </span>
                  <ChevronDown
                    className={`size-3.5 text-muted-ink transition-transform duration-200 ${
                      categoryOpen ? "rotate-180 text-brand" : ""
                    }`}
                  />
                </button>

                {categoryOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+6px)] z-30 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-ink border-b border-line mb-1">
                      Grant Category
                    </div>
                    {CATEGORY_OPTIONS.map((cat) => {
                      const isSelected = selectedCategory === cat;
                      return (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setSelectedCategory(cat);
                            setCategoryOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                            isSelected
                              ? "bg-brand-soft text-brand font-semibold"
                              : "text-ink hover:bg-canvas"
                          }`}
                        >
                          <span>{cat === "All" ? "All Categories" : cat}</span>
                          {isSelected && <Check className="size-3.5 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Domain Filter Popover (Searchable + Multi-Select Checkboxes) */}
              <div className="relative w-full sm:w-auto" ref={domainRef}>
                <button
                  type="button"
                  onClick={() => {
                    setDomainOpen((prev) => !prev);
                    setCategoryOpen(false);
                    setSortOpen(false);
                  }}
                  className={`inline-flex h-10 w-full sm:w-auto items-center justify-between gap-2 rounded-lg border px-3 text-[13px] font-medium shadow-2xs transition-colors ${
                    selectedDomains.length > 0
                      ? "border-brand bg-brand-soft/40 text-brand font-semibold"
                      : "border-line bg-white text-ink hover:bg-slate-50 hover:border-slate-300"
                  }`}
                  aria-expanded={domainOpen}
                  aria-haspopup="dialog"
                >
                  <span className="truncate max-w-[150px]">
                    {selectedDomains.length === 0
                      ? "All Domains"
                      : selectedDomains.length === 1
                      ? selectedDomains[0]
                      : "Domains"}
                  </span>
                  {selectedDomains.length > 1 && (
                    <span className="flex size-4.5 items-center justify-center rounded-full bg-brand text-[10px] font-bold text-white leading-none">
                      {selectedDomains.length}
                    </span>
                  )}
                  <ChevronDown
                    className={`size-3.5 text-muted-ink transition-transform duration-200 ${
                      domainOpen ? "rotate-180 text-brand" : ""
                    }`}
                  />
                </button>

                {domainOpen && (
                  <div className="absolute left-0 sm:left-auto sm:right-0 top-[calc(100%+6px)] z-30 w-72 rounded-xl border border-line bg-white p-2.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between border-b border-line pb-2 mb-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-ink">
                        Filter by Domain
                      </span>
                      {selectedDomains.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedDomains([])}
                          className="text-[11px] font-semibold text-brand hover:underline"
                        >
                          Clear
                        </button>
                      )}
                    </div>

                    {/* Popover domain search */}
                    <div className="relative mb-2">
                      <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-muted-ink" />
                      <input
                        type="text"
                        value={domainFilterText}
                        onChange={(e) => setDomainFilterText(e.target.value)}
                        placeholder="Search domains..."
                        className="h-8 w-full rounded-md border border-line bg-canvas/40 pl-7 pr-7 text-xs text-ink placeholder:text-muted-ink focus:border-brand focus:outline-none"
                      />
                      {domainFilterText && (
                        <button
                          type="button"
                          onClick={() => setDomainFilterText("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-ink hover:text-ink"
                        >
                          <X className="size-3" />
                        </button>
                      )}
                    </div>

                    {/* Checkbox Domain List */}
                    <div className="max-h-52 overflow-y-auto space-y-1 pr-0.5">
                      {visibleDomainOptions.length === 0 ? (
                        <p className="py-3 text-center text-xs text-muted-ink">No domains found</p>
                      ) : (
                        visibleDomainOptions.map((domain) => {
                          const isChecked = selectedDomains.includes(domain);
                          return (
                            <label
                              key={domain}
                              className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-xs cursor-pointer select-none transition-colors ${
                                isChecked ? "bg-brand-soft/50 text-ink font-medium" : "text-muted-ink hover:bg-canvas hover:text-ink"
                              }`}
                            >
                              <div
                                className={`flex size-4 shrink-0 items-center justify-center rounded border transition-colors ${
                                  isChecked
                                    ? "border-brand bg-brand text-white"
                                    : "border-line bg-white"
                                }`}
                              >
                                {isChecked && <Check className="size-3 stroke-[3]" />}
                              </div>
                              <span className="flex-1 truncate">{domain}</span>
                            </label>
                          );
                        })
                      )}
                    </div>

                    {/* Popover footer */}
                    <div className="mt-2.5 pt-2 border-t border-line flex items-center justify-between text-[11px] px-1 text-muted-ink">
                      <span>{selectedDomains.length} selected</span>
                      <button
                        type="button"
                        onClick={() => setSelectedDomains([...DOMAIN_OPTIONS])}
                        className="font-medium text-brand hover:underline"
                      >
                        Select all
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="relative w-full sm:w-auto" ref={sortRef}>
                <button
                  type="button"
                  onClick={() => {
                    setSortOpen((prev) => !prev);
                    setCategoryOpen(false);
                    setDomainOpen(false);
                  }}
                  className="inline-flex h-10 w-full sm:w-auto items-center justify-between gap-2 rounded-lg border border-line bg-white px-3 text-[13px] font-medium text-ink shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors"
                  aria-expanded={sortOpen}
                  aria-haspopup="listbox"
                >
                  <SlidersHorizontal className="size-3.5 text-muted-ink shrink-0" />
                  <span className="truncate max-w-[140px]">{sortLabels[sortBy]}</span>
                  <ChevronDown
                    className={`size-3.5 text-muted-ink transition-transform duration-200 ${
                      sortOpen ? "rotate-180 text-brand" : ""
                    }`}
                  />
                </button>

                {sortOpen && (
                  <div className="absolute right-0 top-[calc(100%+6px)] z-30 w-56 rounded-xl border border-line bg-white p-1.5 shadow-lg animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-ink border-b border-line mb-1">
                      Sort Opportunities
                    </div>
                    {(Object.keys(sortLabels) as SortOption[]).map((optionKey) => {
                      const isSelected = sortBy === optionKey;
                      return (
                        <button
                          key={optionKey}
                          type="button"
                          onClick={() => {
                            setSortBy(optionKey);
                            setSortOpen(false);
                          }}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[12.5px] transition-colors ${
                            isSelected
                              ? "bg-brand-soft text-brand font-semibold"
                              : "text-ink hover:bg-canvas"
                          }`}
                        >
                          <span>{sortLabels[optionKey]}</span>
                          {isSelected && <Check className="size-3.5 text-brand shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SECOND ROW: Active Filter Chips */}
          {hasActiveFilters && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-[11px] font-medium text-muted-ink mr-0.5">Active filters:</span>

              {/* Search query chip */}
              {debouncedSearch.trim() && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-xs font-medium text-ink shadow-2xs">
                  Search: <span className="font-semibold text-brand">"{debouncedSearch}"</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                    }}
                    className="ml-0.5 rounded-full p-0.5 text-muted-ink hover:bg-slate-100 hover:text-ink transition-colors"
                    aria-label="Remove search query"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {/* Category chip */}
              {selectedCategory !== "All" && (
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand-soft/60 px-2.5 py-1 text-xs font-medium text-brand">
                  Category: <span className="font-semibold">{selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("All")}
                    className="ml-0.5 rounded-full p-0.5 text-brand/70 hover:bg-brand/20 hover:text-brand transition-colors"
                    aria-label={`Remove category filter ${selectedCategory}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              )}

              {/* Domain chips */}
              {selectedDomains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-brand/20 bg-brand-soft/60 px-2.5 py-1 text-xs font-medium text-brand"
                >
                  <span>{domain}</span>
                  <button
                    type="button"
                    onClick={() => toggleDomain(domain)}
                    className="ml-0.5 rounded-full p-0.5 text-brand/70 hover:bg-brand/20 hover:text-brand transition-colors"
                    aria-label={`Remove domain filter ${domain}`}
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}

              {/* Clear All action */}
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold text-brand hover:text-brand-hover hover:underline transition-colors"
              >
                <RotateCcw className="size-3" />
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Results Feedback Header */}
        <div className="flex items-center justify-between px-1">
          <p className="text-[13px] font-semibold text-ink">
            Showing <span className="text-brand font-bold">{filtered.length}</span>{" "}
            {filtered.length === 1 ? "funding opportunity" : "funding opportunities"}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs text-muted-ink hover:text-brand font-medium transition-colors"
            >
              Reset filters
            </button>
          )}
        </div>

        {/* Opportunity Grid or Empty State */}
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-line bg-white p-12 text-center shadow-xs">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-canvas border border-line text-muted-ink mb-3.5">
              <Search className="size-5 text-muted-ink" />
            </div>
            <h3 className="text-base font-bold text-ink">No funding opportunities found</h3>
            <p className="text-xs text-muted-ink max-w-md mx-auto mt-1.5 leading-relaxed">
              We couldn't find any grants matching your search keywords and selected filters. Try broadening your criteria or clearing active filters.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={handleClearAll}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-white text-xs font-semibold hover:bg-brand-hover shadow-xs transition-colors"
              >
                <RotateCcw className="size-3.5" />
                Clear All Filters
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((grant) => (
            <Card key={grant.id} interactive className="flex flex-col justify-between p-5 border-line hover:border-brand/50 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand-cyan-soft text-brand">
                    {grant.domain}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-700">
                    {grant.category}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-bold text-ink leading-snug">{grant.name}</h3>
                  <p className="text-xs text-muted-ink mt-0.5 flex items-center gap-1">
                    <Building className="size-3 text-muted-ink" /> {grant.provider}
                  </p>
                </div>

                <div className="rounded-lg bg-canvas/60 p-3 border border-line/60">
                  <span className="text-[11px] font-medium text-muted-ink block">Grant Amount</span>
                  <span className="text-xl font-black text-brand block mt-0.5">{grant.amount}</span>
                  <span className="text-[11px] text-muted-ink block mt-0.5">Target: {grant.stage}</span>
                </div>

                <p className="text-xs text-muted-ink line-clamp-3 leading-relaxed">
                  {grant.description}
                </p>

                <div className="space-y-1.5 pt-2 border-t border-line/60 text-[11px]">
                  <span className="font-semibold text-ink block">Key Eligibility:</span>
                  {grant.eligibility.slice(0, 2).map((e, idx) => (
                    <div key={idx} className="flex items-start gap-1.5 text-muted-ink">
                      <Check className="size-3 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{e}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-line flex items-center justify-between">
                <span className="text-xs text-muted-ink flex items-center gap-1">
                  <Calendar className="size-3.5" />
                  Due: <strong className="text-ink font-medium">{grant.deadline}</strong>
                </span>

                <button
                  type="button"
                  onClick={() => handleOpenApply(grant)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand text-white text-xs font-semibold shadow-sm hover:bg-brand-hover transition-colors"
                >
                  View Details & Apply
                  <ArrowRight className="size-3" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

        {/* Modal / Drawer for Grant Details & Applying */}
        {selectedGrant && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
            <div className="relative w-full max-w-2xl rounded-2xl border border-line bg-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-brand/10 via-brand/5 to-transparent p-6 border-b border-line shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-brand/10 text-brand">
                        {selectedGrant.category}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-canvas border border-line text-muted-ink">
                        {selectedGrant.domain}
                      </span>
                    </div>
                    <h2 className="text-xl font-bold text-ink">{selectedGrant.name}</h2>
                    <p className="text-xs text-muted-ink mt-0.5">{selectedGrant.provider}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedGrant(null)}
                    className="rounded-lg p-1 text-muted-ink hover:bg-canvas hover:text-ink transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Scrollable Body */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-ink leading-relaxed">
                {applicationSuccess ? (
                  <div className="py-8 text-center space-y-3">
                    <span className="mx-auto flex size-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="size-7" />
                    </span>
                    <h3 className="text-lg font-bold text-ink">Grant Application Registered</h3>
                    <p className="text-muted-ink max-w-md mx-auto text-xs">
                      Your interest in <strong className="text-ink">{selectedGrant.name}</strong> has been forwarded to the DBIT Incubation Committee. Your faculty guide will be notified to endorse the preliminary grant docket.
                    </p>
                    <div className="pt-2">
                      <Link
                        href="/workspace/student/projects"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand-hover"
                      >
                        Return to Projects
                      </Link>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <div className="p-3 rounded-xl border border-line bg-canvas/30">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Grant Value</span>
                        <span className="text-lg font-bold text-brand block mt-0.5">{selectedGrant.amount}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-line bg-canvas/30">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Application Deadline</span>
                        <span className="text-sm font-bold text-ink block mt-0.5">{selectedGrant.deadline}</span>
                      </div>
                      <div className="p-3 rounded-xl border border-line bg-canvas/30 col-span-2 sm:col-span-1">
                        <span className="text-[11px] text-muted-ink block uppercase font-medium">Target Stage</span>
                        <span className="text-sm font-bold text-ink block mt-0.5">{selectedGrant.stage}</span>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-1">Grant Overview</h4>
                      <p className="text-muted-ink leading-relaxed">{selectedGrant.description}</p>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-2">Mandatory Eligibility Criteria</h4>
                      <div className="space-y-1.5">
                        {selectedGrant.eligibility.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-canvas/40 border border-line/60">
                            <CheckCircle2 className="size-3.5 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-bold text-ink text-sm mb-2">Disbursement Tranches</h4>
                      <div className="space-y-1.5">
                        {selectedGrant.disbursement.map((tranche, idx) => (
                          <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-canvas/40 border border-line/60 text-muted-ink">
                            <span className="size-5 rounded-full bg-brand/10 text-brand flex items-center justify-center font-bold text-[10px] shrink-0">
                              {idx + 1}
                            </span>
                            <span>{tranche}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-indigo-100 bg-indigo-50/50 flex items-start gap-2.5">
                      <Sparkles className="size-4 text-indigo-600 mt-0.5 shrink-0" />
                      <div className="text-[11px] text-indigo-950">
                        <strong>AI Assistant Support:</strong> Need help structuring your grant budget or drafting the technical methodology? Use the Incubation AI Assistant in the bottom right corner to verify your proposal against {selectedGrant.name} requirements.
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Footer */}
              {!applicationSuccess && (
                <div className="p-4 bg-canvas/30 border-t border-line flex items-center justify-end gap-2.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSelectedGrant(null)}
                    className="px-3.5 py-2 rounded-lg border border-line bg-white text-xs font-semibold text-ink hover:bg-canvas transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmApply}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-brand text-xs font-semibold text-white hover:bg-brand-hover shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="size-3.5" />
                    Submit Grant Application Docket
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

