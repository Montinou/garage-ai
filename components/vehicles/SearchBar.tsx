'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, Clock, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';
// Custom debounce hook
function useDebounce<T extends unknown[]>(callback: (...args: T) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  return useCallback((...args: T) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]);
}

interface SearchSuggestion {
  id: string;
  type: 'brand' | 'model' | 'location' | 'recent' | 'popular';
  title: string;
  subtitle?: string;
  count?: number;
  query: string;
}

interface SearchBarProps {
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
  showSuggestions?: boolean;
  initialValue?: string;
  onSearch?: (query: string) => void;
}

export default function SearchBar({
  placeholder = translations.forms.placeholders.search,
  className,
  size = 'default',
  showSuggestions = true,
  initialValue = '',
  onSearch
}: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState(initialValue);
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('garageai_recent_searches');
      if (saved) {
        setRecentSearches(JSON.parse(saved));
      }
    } catch {
      // Silently handle localStorage errors in production
    }
  }, []);

  // Save search to recent searches
  const saveToRecentSearches = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    try {
      const trimmedQuery = searchQuery.trim();
      const updated = [trimmedQuery, ...recentSearches.filter(s => s !== trimmedQuery)].slice(0, 5);
      setRecentSearches(updated);
      localStorage.setItem('garageai_recent_searches', JSON.stringify(updated));
    } catch {
      // Silently handle localStorage errors in production
    }
  }, [recentSearches]);

  // Debounced suggestion fetching
  const fetchSuggestions = useDebounce(async (searchQuery: string) => {
    if (!searchQuery.trim() || !showSuggestions) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    
    try {
      // Mock suggestions - in real app, this would call an API
      const mockSuggestions: SearchSuggestion[] = [
        {
          id: '1',
          type: 'brand',
          title: 'Toyota',
          subtitle: 'Marca',
          count: 245,
          query: 'Toyota'
        },
        {
          id: '2',
          type: 'model',
          title: 'Toyota Corolla',
          subtitle: 'Modelo',
          count: 89,
          query: 'Toyota Corolla'
        },
        {
          id: '3',
          type: 'location',
          title: 'Buenos Aires',
          subtitle: 'Ubicación',
          count: 1234,
          query: searchQuery
        }
      ];

      // Filter suggestions based on query
      const filtered = mockSuggestions.filter(s => 
        s.title.toLowerCase().includes(searchQuery.toLowerCase())
      );

      setSuggestions(filtered);
    } catch {
      // Silently handle suggestion fetch errors
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  // Handle input change
  const handleInputChange = (value: string) => {
    setQuery(value);
    if (showSuggestions) {
      fetchSuggestions(value);
    }
  };

  // Handle search submission
  const handleSearch = (searchQuery: string = query) => {
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) return;

    saveToRecentSearches(trimmedQuery);
    setIsOpen(false);
    
    if (onSearch) {
      onSearch(trimmedQuery);
    } else {
      // Navigate to marketplace with search query
      const params = new URLSearchParams();
      params.set('q', trimmedQuery);
      router.push(`/marketplace?${params.toString()}`);
    }
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    setQuery(suggestion.query);
    handleSearch(suggestion.query);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Get popular searches
  const popularSearches = [
    'Toyota Corolla',
    'Ford Focus',
    'Volkswagen Gol',
    'Chevrolet Cruze',
    'Renault Sandero'
  ];

  // Size classes
  const sizeClasses = {
    sm: 'h-8 text-sm',
    default: 'h-10',
    lg: 'h-12 text-lg'
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={inputRef}
                type="search"
                placeholder={placeholder}
                value={query}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => showSuggestions && setIsOpen(true)}
                className={cn(
                  "pl-10 pr-10",
                  sizeClasses[size]
                )}
                autoComplete="off"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 p-0 hover:bg-transparent"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          </form>
        </PopoverTrigger>

        {showSuggestions && (
          <PopoverContent
            className="w-[var(--radix-popover-trigger-width)] p-0"
            align="start"
            side="bottom"
            sideOffset={4}
          >
            <Command>
              <CommandList className="max-h-[300px]">
                {!query && recentSearches.length > 0 && (
                  <CommandGroup heading="Búsquedas recientes">
                    {recentSearches.map((search, index) => (
                      <CommandItem
                        key={`recent-${index}`}
                        value={search}
                        onSelect={() => handleSuggestionSelect({
                          id: `recent-${index}`,
                          type: 'recent',
                          title: search,
                          query: search
                        })}
                        className="flex items-center gap-2"
                      >
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{search}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {!query && (
                  <CommandGroup heading="Búsquedas populares">
                    {popularSearches.map((search, index) => (
                      <CommandItem
                        key={`popular-${index}`}
                        value={search}
                        onSelect={() => handleSuggestionSelect({
                          id: `popular-${index}`,
                          type: 'popular',
                          title: search,
                          query: search
                        })}
                        className="flex items-center gap-2"
                      >
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        <span>{search}</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {query && suggestions.length > 0 && (
                  <CommandGroup heading="Sugerencias">
                    {suggestions.map((suggestion) => (
                      <CommandItem
                        key={suggestion.id}
                        value={suggestion.title}
                        onSelect={() => handleSuggestionSelect(suggestion)}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <Search className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">{suggestion.title}</div>
                            {suggestion.subtitle && (
                              <div className="text-sm text-muted-foreground">
                                {suggestion.subtitle}
                              </div>
                            )}
                          </div>
                        </div>
                        {suggestion.count && (
                          <Badge variant="secondary" className="text-xs">
                            {suggestion.count}
                          </Badge>
                        )}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                )}

                {query && !isLoading && suggestions.length === 0 && (
                  <CommandEmpty>
                    No se encontraron sugerencias.
                  </CommandEmpty>
                )}

                {isLoading && (
                  <div className="py-4 text-center text-sm text-muted-foreground">
                    Buscando sugerencias...
                  </div>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
}