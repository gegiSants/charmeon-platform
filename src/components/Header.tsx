import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BRAND_NAME } from '@/lib/brand';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'Início' },
    { path: '/#funcionalidades', label: 'Funcionalidades', isAnchor: true },
    { path: '/catalogo', label: 'Catálogo' },
    { path: '/agendar', label: 'Agendar' },
    { path: '/admin/login', label: 'Área Profissional' },
  ];

  const isActive = (path: string) => {
    if (path === '/#funcionalidades') return false;
    return location.pathname === path;
  };

  return (
    <header className="sticky top-0 z-50 glass-effect border-b border-border">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-serif text-xl md:text-2xl font-semibold text-primary">
              {BRAND_NAME}
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) =>
              link.isAnchor ? (
                <a
                  key={link.path}
                  href={link.path}
                  className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              ),
            )}
            <Link to="/agendar">
              <Button size="sm">Começar</Button>
            </Link>
          </nav>

          <button
            className="md:hidden p-2"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            aria-label="Menu"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {isMenuOpen && (
          <nav className="md:hidden py-4 border-t border-border animate-fade-in">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) =>
                link.isAnchor ? (
                  <a
                    key={link.path}
                    href={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-sm font-medium text-muted-foreground py-2 hover:text-primary"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => setIsMenuOpen(false)}
                    className={`text-sm font-medium py-2 hover:text-primary ${
                      isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
              <Link to="/agendar" onClick={() => setIsMenuOpen(false)}>
                <Button className="w-full">Começar</Button>
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
