import { MapPin, Phone, Instagram, Clock } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-secondary py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
              Studio Ingrid Leandro
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Especialistas em realçar sua beleza natural com cuidado e dedicação.
              Mais de 1000 clientes atendidas!
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Contato</h4>
            <div className="space-y-3">
              <a
                href="https://wa.me/5511990278446"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <Phone className="h-4 w-4 text-primary" />
                (11) 99027-8446
              </a>
              <a
                href="https://instagram.com/studioingridleandro"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-muted-foreground hover:text-primary transition-colors text-sm"
              >
                <Instagram className="h-4 w-4 text-primary" />
                @studioingridleandro
              </a>
              <div className="flex items-center gap-3 text-muted-foreground text-sm">
                <MapPin className="h-4 w-4 text-primary" />
                Jaraguá - Zona Oeste, São Paulo
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Horário de Atendimento</h4>
            <div className="flex items-start gap-3 text-muted-foreground text-sm">
              <Clock className="h-4 w-4 text-primary mt-0.5" />
              <div>
                <p>Segunda a Sábado</p>
                <p>07h às 16h</p>
                <p className="text-xs mt-1">(sábado com horário marcado)</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© 2026 Studio Ingrid Leandro. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
