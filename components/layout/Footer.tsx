import Link from 'next/link';
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram } from 'lucide-react';
import { cn } from '@/lib/utils';
import { translations } from '@/lib/translations';

interface FooterProps {
  className?: string;
}

export default function Footer({ className }: FooterProps) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={cn("bg-background border-t", className)}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Car className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">GarageAI</span>
            </div>
            <p className="text-sm text-muted-foreground">
              El marketplace de vehículos usados más completo de Argentina. 
              Encuentra el auto perfecto con tecnología de inteligencia artificial.
            </p>
            <div className="flex space-x-4">
              <Link
                href="https://facebook.com/garageai"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Facebook"
              >
                <Facebook className="h-5 w-5" />
              </Link>
              <Link
                href="https://twitter.com/garageai"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Twitter"
              >
                <Twitter className="h-5 w-5" />
              </Link>
              <Link
                href="https://instagram.com/garageai"
                className="text-muted-foreground hover:text-primary transition-colors"
                aria-label="Instagram"
              >
                <Instagram className="h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Navegación
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/marketplace"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {translations.navigation.marketplace}
                </Link>
              </li>
              <li>
                <Link
                  href="/concesionarias"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {translations.navigation.dealerships}
                </Link>
              </li>
              <li>
                <Link
                  href="/acerca"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {translations.navigation.about}
                </Link>
              </li>
              <li>
                <Link
                  href="/ayuda"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {translations.navigation.help}
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Servicios
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/marketplace?oportunidades=true"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Oportunidades AI
                </Link>
              </li>
              <li>
                <Link
                  href="/marketplace?destacados=true"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Vehículos Destacados
                </Link>
              </li>
              <li>
                <Link
                  href="/financiacion"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Financiación
                </Link>
              </li>
              <li>
                <Link
                  href="/seguros"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Seguros
                </Link>
              </li>
              <li>
                <Link
                  href="/tasaciones"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Tasaciones
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="font-semibold text-sm uppercase tracking-wider">
              Contacto
            </h3>
            <ul className="space-y-3">
              <li className="flex items-center space-x-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>Buenos Aires, Argentina</span>
              </li>
              <li>
                <Link
                  href="mailto:info@garageai.com.ar"
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Mail className="h-4 w-4 flex-shrink-0" />
                  <span>info@garageai.com.ar</span>
                </Link>
              </li>
              <li>
                <Link
                  href="tel:+5411-1234-5678"
                  className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span>+54 11 1234-5678</span>
                </Link>
              </li>
            </ul>

            {/* Newsletter Signup */}
            <div className="pt-4">
              <h4 className="font-medium text-sm mb-2">
                Newsletter
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Recibe las mejores oportunidades en tu email
              </p>
              <form className="flex flex-col space-y-2">
                <input
                  type="email"
                  placeholder="Tu email"
                  className="px-3 py-2 text-sm border border-input bg-background rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
                />
                <button
                  type="submit"
                  className="px-3 py-2 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
                >
                  Suscribirse
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Popular Brands */}
        <div className="mt-12 pt-8 border-t">
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
            Marcas Populares
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {[
              'Toyota', 'Ford', 'Chevrolet', 'Volkswagen', 'Renault', 'Peugeot',
              'Fiat', 'Honda', 'Nissan', 'Hyundai', 'Citroën', 'Kia'
            ].map((brand) => (
              <Link
                key={brand}
                href={`/marketplace?marca=${encodeURIComponent(brand.toLowerCase())}`}
                className="hover:text-foreground transition-colors"
              >
                {brand}
              </Link>
            ))}
          </div>
        </div>

        {/* Popular Locations */}
        <div className="mt-8">
          <h3 className="font-semibold text-sm uppercase tracking-wider mb-4">
            Ubicaciones Populares
          </h3>
          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
            {[
              'Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'La Plata',
              'Mar del Plata', 'Tucumán', 'Salta', 'Santa Fe', 'Neuquén'
            ].map((location) => (
              <Link
                key={location}
                href={`/marketplace?ubicacion=${encodeURIComponent(location.toLowerCase())}`}
                className="hover:text-foreground transition-colors"
              >
                {location}
              </Link>
            ))}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
          <div className="text-sm text-muted-foreground">
            © {currentYear} GarageAI. Todos los derechos reservados.
          </div>
          <div className="flex flex-wrap items-center space-x-6 text-sm text-muted-foreground">
            <Link href="/privacidad" className="hover:text-foreground transition-colors">
              Política de Privacidad
            </Link>
            <Link href="/terminos" className="hover:text-foreground transition-colors">
              Términos de Uso
            </Link>
            <Link href="/cookies" className="hover:text-foreground transition-colors">
              Cookies
            </Link>
            <Link href="/sitemap" className="hover:text-foreground transition-colors">
              Mapa del Sitio
            </Link>
          </div>
        </div>

        {/* Made in Argentina Badge */}
        <div className="mt-8 flex items-center justify-center">
          <div className="flex items-center space-x-2 text-xs text-muted-foreground">
            <span>🇦🇷</span>
            <span>Hecho en Argentina con ❤️</span>
          </div>
        </div>
      </div>
    </footer>
  );
}