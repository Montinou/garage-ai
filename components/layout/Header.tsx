'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, Menu, X, Car, Building } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { translations } from '@/lib/translations';

interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  const pathname = usePathname();
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navigation = [
    {
      name: translations.navigation.marketplace,
      href: '/marketplace',
      icon: Car,
      description: 'Explora vehículos disponibles'
    },
    {
      name: translations.navigation.dealerships,
      href: '/concesionarias',
      icon: Building,
      description: 'Encuentra concesionarias cercanas'
    }
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const searchParams = new URLSearchParams();
      searchParams.set('q', searchQuery.trim());
      window.location.href = `/marketplace?${searchParams.toString()}`;
    }
  };

  const isActive = (href: string) => {
    if (href === '/marketplace' && pathname?.startsWith('/vehiculos')) {
      return true;
    }
    return pathname === href || pathname?.startsWith(href);
  };

  return (
    <header className={cn("sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60", className)}>
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <Link 
              href="/" 
              className="flex items-center space-x-2 text-xl font-bold text-primary hover:text-primary/80 transition-colors"
            >
              <Car className="h-8 w-8" />
              <span>GarageAI</span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors hover:text-primary",
                    isActive(item.href)
                      ? "text-primary bg-primary/10"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Search Bar - Desktop */}
          <div className="hidden sm:flex items-center space-x-4">
            <form onSubmit={handleSearch} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder={translations.forms.placeholders.search}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-64 focus:w-72 transition-all duration-200"
                />
              </div>
            </form>
          </div>

          {/* Mobile Menu */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Mobile Search Toggle */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Search className="h-4 w-4" />
                  <span className="sr-only">Buscar</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="top" className="h-auto pb-6">
                <SheetHeader>
                  <SheetTitle>Buscar vehículos</SheetTitle>
                </SheetHeader>
                <form onSubmit={handleSearch} className="mt-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder={translations.forms.placeholders.search}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full mt-3">
                    {translations.common.search}
                  </Button>
                </form>
              </SheetContent>
            </Sheet>

            {/* Mobile Navigation Menu */}
            <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-4 w-4" />
                  <span className="sr-only">{translations.navigation.menu}</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    <Link 
                      href="/" 
                      className="flex items-center space-x-2 text-lg font-bold"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Car className="h-6 w-6" />
                      <span>GarageAI</span>
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                
                <nav className="mt-6 space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "flex items-center space-x-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors hover:bg-accent",
                          isActive(item.href)
                            ? "bg-primary/10 text-primary"
                            : "text-foreground hover:text-primary"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        <div>
                          <div>{item.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {item.description}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </nav>

                {/* Mobile Search in Menu */}
                <div className="mt-6 border-t pt-6">
                  <form onSubmit={handleSearch}>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="search"
                        placeholder={translations.forms.placeholders.search}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full mt-3"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {translations.common.search}
                    </Button>
                  </form>
                </div>

                {/* Additional Links */}
                <div className="mt-6 border-t pt-6 space-y-2">
                  <Link
                    href="/acerca"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.navigation.about}
                  </Link>
                  <Link
                    href="/contacto"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.navigation.contact}
                  </Link>
                  <Link
                    href="/ayuda"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="block px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
                  >
                    {translations.navigation.help}
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}