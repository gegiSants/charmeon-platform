import { Link } from 'react-router-dom';
import { BRAND_NAME, BRAND_DESCRIPTION } from '@/lib/brand';

const Footer = () => {
  return (
    <footer className="bg-secondary py-12 mt-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-serif text-xl font-semibold text-foreground mb-4">
              {BRAND_NAME}
            </h3>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {BRAND_DESCRIPTION}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Plataforma</h4>
            <div className="flex flex-col gap-2 text-sm">
              <Link to="/agendar" className="text-muted-foreground hover:text-primary transition-colors">
                Agendar
              </Link>
              <Link to="/catalogo" className="text-muted-foreground hover:text-primary transition-colors">
                Catálogo
              </Link>
              <Link to="/admin/login" className="text-muted-foreground hover:text-primary transition-colors">
                Área Profissional
              </Link>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-foreground mb-4">Recursos</h4>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>Agendamento online</li>
              <li>Pagamentos via PIX</li>
              <li>Gestão de agenda</li>
              <li>Catálogo de serviços</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} {BRAND_NAME}. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
