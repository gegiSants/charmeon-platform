import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfessionalCard from '@/components/ProfessionalCard';
import { useProfessionals } from '@/hooks/useAppointments';
import {
  Calendar,
  Sparkles,
  CreditCard,
  LayoutDashboard,
  Clock,
  Users,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import ServiceCatalogCard from '@/components/ServiceCatalogCard';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from '@/lib/brand';

const features = [
  {
    icon: Calendar,
    title: 'Agendamento online',
    description: 'Clientes escolhem serviço, profissional, data e horário em poucos cliques.',
  },
  {
    icon: CreditCard,
    title: 'Pagamentos integrados',
    description: 'Receba sinal ou valor total via PIX com confirmação automática.',
  },
  {
    icon: LayoutDashboard,
    title: 'Painel profissional',
    description: 'Gerencie agenda, serviços, bloqueios e agendamentos em um só lugar.',
  },
  {
    icon: Sparkles,
    title: 'Catálogo digital',
    description: 'Apresente serviços com fotos, categorias e destaques para atrair clientes.',
  },
  {
    icon: Clock,
    title: 'Horários inteligentes',
    description: 'Controle disponibilidade, bloqueios e conflitos de agenda automaticamente.',
  },
  {
    icon: Users,
    title: 'Multi-profissional',
    description: 'Cada profissional com agenda, serviços e identidade próprios na plataforma.',
  },
];

const steps = [
  { step: '1', title: 'Escolha o serviço', text: 'Navegue pelo catálogo e selecione o profissional ideal.' },
  { step: '2', title: 'Agende e pague', text: 'Reserve o horário e confirme com pagamento online seguro.' },
  { step: '3', title: 'Pronto!', text: 'Receba confirmação por e-mail e compareça no horário marcado.' },
];

const Index = () => {
  const { professionals, loading } = useProfessionals();
  const [featuredServices, setFeaturedServices] = useState<any[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  useEffect(() => {
    const loadFeaturedServices = async () => {
      setLoadingServices(true);
      try {
        const { data, error } = await supabase
          .from('services')
          .select(`
            *,
            professionals:professional_id (name, photo_url),
            categories:category_id (id, name, description, icon, color)
          `)
          .eq('is_featured', true)
          .order('display_order')
          .order('name')
          .limit(8);

        if (!error) {
          setFeaturedServices(data || []);
        }
      } finally {
        setLoadingServices(false);
      }
    };

    loadFeaturedServices();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero */}
      <section className="relative py-20 md:py-28 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/40 via-background to-rose-soft/30" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-sm font-medium text-primary mb-4 tracking-wide uppercase">
              Plataforma para profissionais da beleza
            </p>
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              {BRAND_NAME}
            </h1>
            <p className="text-xl text-foreground/80 font-medium mb-3">{BRAND_TAGLINE}</p>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              {BRAND_DESCRIPTION}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/agendar">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <Calendar className="h-5 w-5" />
                  Agendar agora
                </Button>
              </Link>
              <Link to="/catalogo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto gap-2">
                  Ver catálogo
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Funcionalidades */}
      <section id="funcionalidades" className="py-20 bg-secondary/40 scroll-mt-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Tudo que você precisa em um só lugar
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Do agendamento ao pagamento — uma experiência completa para profissionais e clientes.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="w-11 h-11 rounded-lg bg-accent flex items-center justify-center mb-4">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Como funciona
            </h2>
            <p className="text-muted-foreground">Simples para quem agenda. Poderoso para quem atende.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map(({ step, title, text }) => (
              <div key={step} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground font-bold text-lg flex items-center justify-center mx-auto mb-4">
                  {step}
                </div>
                <h3 className="font-semibold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Profissionais */}
      {professionals.length > 0 && (
        <section className="py-20 bg-secondary/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
                Profissionais na plataforma
              </h2>
              <p className="text-muted-foreground">
                Conheça quem já utiliza o {BRAND_NAME}
              </p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {loading ? (
                <div className="col-span-full flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                professionals.map((professional) => (
                  <Link to="/agendar" key={professional.id}>
                    <ProfessionalCard
                      professional={{
                        id: professional.id,
                        name: professional.name,
                        specialty: professional.specialty,
                        photo: professional.photo_url || undefined,
                        phone: professional.phone,
                        services: [],
                      }}
                    />
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* Catálogo em destaque */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              <Sparkles className="inline h-6 w-6 text-primary mr-2" />
              Serviços em destaque
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore procedimentos disponíveis e agende o que combina com você
            </p>
          </div>

          {loadingServices ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : featuredServices.length > 0 ? (
            <>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto mb-10">
                {featuredServices.map((service) => (
                  <ServiceCatalogCard key={service.id} service={service} />
                ))}
              </div>
              <div className="text-center flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/catalogo">
                  <Button size="lg" variant="outline">
                    Ver catálogo completo
                  </Button>
                </Link>
                <Link to="/agendar">
                  <Button size="lg">Agendar agora</Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-4">Novos serviços em breve</p>
              <Link to="/catalogo">
                <Button variant="outline">Explorar catálogo</Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* CTA final */}
      <section className="py-20 bg-gradient-to-r from-primary/10 via-accent/30 to-primary/10">
        <div className="container mx-auto px-4">
          <Card className="max-w-3xl mx-auto border-primary/20 shadow-lg">
            <CardContent className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-primary mx-auto mb-6" />
              <h2 className="font-serif text-2xl md:text-3xl font-semibold mb-4">
                Pronto para começar?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Agende seu horário em minutos ou acesse a área profissional para gerenciar seu negócio.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/agendar">
                  <Button size="lg" className="w-full sm:w-auto">
                    Agendar horário
                  </Button>
                </Link>
                <Link to="/admin/login">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto">
                    Sou profissional
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
