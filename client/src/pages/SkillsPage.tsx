import React, { useEffect, useState } from 'react';
import { useRouter } from '../context/RouterContext.tsx';
import { api } from '../utils/api.ts';
import { Skill, CategoryCount } from '../types.ts';
import { SkillCard } from '../components/SkillCard.tsx';
import { 
  Search, 
  Filter, 
  SlidersHorizontal, 
  LayoutGrid, 
  List, 
  ArrowUpDown, 
  Check, 
  X, 
  ChevronLeft, 
  ChevronRight,
  ShieldCheck,
  Terminal,
  Cpu
} from 'lucide-react';

export function SkillsPage() {
  const { query, navigate } = useRouter();
  const initialCategory = query.get('category') || '';
  const initialFilter = query.get('filter') || 'all';
  const initialSort = query.get('sort') || 'votes';
  const initialQ = query.get('q') || '';

  const [skills, setSkills] = useState<Skill[]>([]);
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [selectedFilter, setSelectedFilter] = useState<string>(initialFilter);
  const [selectedSort, setSelectedSort] = useState<string>(initialSort);
  const [searchQuery, setSearchQuery] = useState<string>(initialQ);
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [loading, setLoading] = useState<boolean>(true);
  const [totalSkills, setTotalSkills] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mobileFilterOpen, setMobileFilterOpen] = useState<boolean>(false);
  const [page, setPage] = useState<number>(1);
  const limit = 16;

  // Sync state if query string changes
  useEffect(() => {
    setSelectedCategory(query.get('category') || '');
    setSelectedFilter(query.get('filter') || 'all');
    setSelectedSort(query.get('sort') || 'votes');
    setSearchQuery(query.get('q') || '');
  }, [query.toString()]);

  // Load Categories once
  useEffect(() => {
    api.getCategories().then(res => {
      setCategories(res.categories);
    }).catch(console.error);
  }, []);

  // Fetch Skills when filters change
  useEffect(() => {
    async function fetchSkills() {
      setLoading(true);
      try {
        const res = await api.getSkills({
          category: selectedCategory,
          filter: selectedFilter,
          sort: selectedSort,
          q: searchQuery,
          limit,
          offset: (page - 1) * limit
        });
        setSkills(res.skills);
        setTotalSkills(res.total);
      } catch (err) {
        console.error('Failed to load skills:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSkills();
  }, [selectedCategory, selectedFilter, selectedSort, searchQuery, page]);

  const updateUrl = (params: { category?: string; filter?: string; sort?: string; q?: string }) => {
    const sp = new URLSearchParams();
    const cat = params.category !== undefined ? params.category : selectedCategory;
    const filt = params.filter !== undefined ? params.filter : selectedFilter;
    const srt = params.sort !== undefined ? params.sort : selectedSort;
    const q = params.q !== undefined ? params.q : searchQuery;

    if (cat) sp.set('category', cat);
    if (filt && filt !== 'all') sp.set('filter', filt);
    if (srt && srt !== 'votes') sp.set('sort', srt);
    if (q) sp.set('q', q);

    navigate(`/skills${sp.toString() ? `?${sp.toString()}` : ''}`);
    setPage(1);
  };

  const handleCategorySelect = (catSlug: string) => {
    const next = selectedCategory === catSlug ? '' : catSlug;
    setSelectedCategory(next);
    updateUrl({ category: next });
  };

  const handleFilterSelect = (filterType: string) => {
    setSelectedFilter(filterType);
    updateUrl({ filter: filterType });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sortVal = e.target.value;
    setSelectedSort(sortVal);
    updateUrl({ sort: sortVal });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setSearchQuery(q);
    // Debounce URL update or update directly
    updateUrl({ q });
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedFilter('all');
    setSelectedSort('votes');
    setSearchQuery('');
    setSelectedPlatform('all');
    navigate('/skills');
    setPage(1);
  };

  const totalPages = Math.ceil(totalSkills / limit) || 1;

  const platforms = [
    { id: 'all', label: 'All Protocols' },
    { id: 'mcp', label: 'MCP Protocol' },
    { id: 'claude', label: 'Claude Desktop' },
    { id: 'cursor', label: 'Cursor Rules' },
    { id: 'gpt4', label: 'OpenAI GPT-4o' },
    { id: 'langchain', label: 'LangChain' },
  ];

  return (
    <div className="w-full bg-white min-h-screen">
      {/* ================= PAGE HEADER & SEARCH ================= */}
      <div className="border-b border-[#E8E8E6] bg-white">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-[#F97316] font-semibold">
                <span>// MARKETPLACE CATALOG</span>
                <span>•</span>
                <span className="text-[#737373]">{totalSkills} AUDITED SKILLS</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-[#171717] tracking-tight">
                Explore the Marketplace
              </h1>
              <p className="text-xs sm:text-sm text-[#737373] mt-1 max-w-xl">
                Browse verified agent tools, MCP endpoints, and runtime integrations categorized by discipline and protocol.
              </p>
            </div>

            {/* Quick search input */}
            <div className="relative w-full md:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#737373]" />
              <input
                type="text"
                placeholder="Search skills, protocols, creators..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-[#171717] placeholder:text-[#A3A3A3] focus:bg-white focus:outline-none focus:border-[#171717] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    updateUrl({ q: '' });
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#737373] hover:text-[#171717]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Platform Bar */}
          <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 no-scrollbar">
            {platforms.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedPlatform(p.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedPlatform === p.id
                    ? 'bg-[#171717] text-white'
                    : 'bg-[#F8F8F7] text-[#737373] hover:text-[#171717] border border-[#E8E8E6]'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ================= MAIN CONTENT WITH SIDEBAR FILTER ================= */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Mobile Filter Toggle Button */}
          <div className="lg:hidden w-full flex items-center justify-between pb-4 border-b border-[#E8E8E6]">
            <button
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-xs font-medium text-[#171717]"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filters ({selectedCategory || selectedFilter !== 'all' ? 'Active' : 'All'})</span>
            </button>
            <span className="text-xs font-mono text-[#737373]">{totalSkills} skills</span>
          </div>

          {/* SIDEBAR FILTER RAIL */}
          <aside className={`w-full lg:w-64 shrink-0 space-y-6 ${mobileFilterOpen ? 'block' : 'hidden lg:block'}`}>
            {/* Active Filters Clear Bar */}
            {(selectedCategory || selectedFilter !== 'all' || searchQuery) && (
              <div className="p-3 bg-[#FFF4EB] border border-[#F97316]/20 rounded-lg flex items-center justify-between">
                <span className="text-xs text-[#F97316] font-medium">Filters Applied</span>
                <button
                  onClick={clearFilters}
                  className="text-xs text-[#F97316] font-semibold hover:underline flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Clear All</span>
                </button>
              </div>
            )}

            {/* Pricing Filter */}
            <div className="space-y-2">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#171717] font-semibold">
                Pricing Model
              </h4>
              <div className="flex flex-col gap-1">
                {[
                  { id: 'all', label: 'All Models' },
                  { id: 'free', label: 'Free (1-Click)' },
                  { id: 'paid', label: 'Paid / Credit' },
                  { id: 'subscription', label: 'Subscription' },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleFilterSelect(item.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-left transition-colors ${
                      selectedFilter === item.id
                        ? 'bg-[#171717] text-white'
                        : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7]'
                    }`}
                  >
                    <span>{item.label}</span>
                    {selectedFilter === item.id && <Check className="w-3 h-3" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Verification Status */}
            <div className="space-y-2 pt-4 border-t border-[#E8E8E6]">
              <h4 className="text-xs font-mono uppercase tracking-wider text-[#171717] font-semibold">
                Security Verification
              </h4>
              <div className="flex items-center gap-2 p-2 bg-[#F8F8F7] border border-[#E8E8E6] rounded-lg text-xs text-[#171717]">
                <ShieldCheck className="w-4 h-4 text-[#15803D] shrink-0" />
                <span>Passed 8-Point AST Scan</span>
              </div>
            </div>

            {/* Categories List */}
            <div className="space-y-2 pt-4 border-t border-[#E8E8E6]">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono uppercase tracking-wider text-[#171717] font-semibold">
                  Categories ({categories.length})
                </h4>
                {selectedCategory && (
                  <button onClick={() => handleCategorySelect('')} className="text-[11px] text-[#F97316] hover:underline">
                    Reset
                  </button>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto space-y-0.5 pr-1">
                {categories.map((c) => {
                  const isSelected = selectedCategory === c.slug;
                  return (
                    <button
                      key={c.slug}
                      onClick={() => handleCategorySelect(c.slug)}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                        isSelected
                          ? 'bg-[#FFF4EB] text-[#F97316] font-semibold border border-[#F97316]/20'
                          : 'text-[#737373] hover:text-[#171717] hover:bg-[#F8F8F7]'
                      }`}
                    >
                      <span className="truncate">{c.name}</span>
                      <span className="font-mono text-[10px] text-[#A3A3A3] shrink-0 ml-2">
                        {c.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* MAIN GRID VIEWPORT */}
          <main className="flex-1 min-w-0 w-full">
            {/* Viewport Control Bar: Count, Sort, Grid/List */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E8E8E6]">
              <div className="text-xs text-[#737373]">
                Showing <span className="font-mono font-semibold text-[#171717]">{skills.length}</span> of{' '}
                <span className="font-mono font-semibold text-[#171717]">{totalSkills}</span> verified skills
              </div>

              <div className="flex items-center gap-3">
                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-[#737373]" />
                  <select
                    value={selectedSort}
                    onChange={handleSortChange}
                    className="text-xs bg-transparent border-0 font-medium text-[#171717] focus:ring-0 cursor-pointer outline-none"
                  >
                    <option value="votes">Most Upvoted</option>
                    <option value="popular">Most Installs</option>
                    <option value="rating">Top Rated</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                    <option value="newest">Recently Added</option>
                  </select>
                </div>

                {/* Grid / List View Toggle */}
                <div className="hidden sm:flex items-center gap-0.5 border border-[#E8E8E6] rounded-lg p-0.5 bg-[#F8F8F7]">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white shadow-xs text-[#171717]' : 'text-[#737373]'}`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded ${viewMode === 'list' ? 'bg-white shadow-xs text-[#171717]' : 'text-[#737373]'}`}
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Skills Container */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-64 rounded-xl bg-[#F8F8F7] border border-[#E8E8E6] animate-pulse"></div>
                ))}
              </div>
            ) : skills.length === 0 ? (
              <div className="bg-[#F8F8F7] border border-[#E8E8E6] rounded-xl p-12 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-white border border-[#E8E8E6] mx-auto flex items-center justify-center text-[#737373]">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#171717]">No matching skills found</h3>
                <p className="text-xs text-[#737373] max-w-sm mx-auto">
                  Try adjusting your keywords, resetting category filters, or exploring all pricing options.
                </p>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-white border border-[#E8E8E6] hover:bg-[#F8F8F7] text-[#171717] text-xs font-medium rounded-lg transition-colors"
                >
                  Reset all filters
                </button>
              </div>
            ) : (
              <div className={
                viewMode === 'grid'
                  ? 'grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4'
                  : 'flex flex-col gap-3'
              }>
                {skills.map((s) => (
                  <SkillCard key={s.id} skill={s} />
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="pt-8 flex items-center justify-between border-t border-[#E8E8E6] mt-8">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] text-xs font-medium text-[#171717] hover:bg-[#F8F8F7] disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </button>

                <div className="flex items-center gap-1 font-mono text-xs text-[#737373]">
                  <span>Page</span>
                  <span className="font-bold text-[#171717]">{page}</span>
                  <span>of</span>
                  <span className="font-bold text-[#171717]">{totalPages}</span>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 rounded-lg border border-[#E8E8E6] text-xs font-medium text-[#171717] hover:bg-[#F8F8F7] disabled:opacity-40 transition-colors flex items-center gap-1"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
