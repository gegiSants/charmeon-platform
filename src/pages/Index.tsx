import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfessionalCard from '@/components/ProfessionalCard';
import { useProfessionals } from '@/hooks/useAppointments';
import { Calendar, Sparkles, Heart, Shield, MapPin, Coffee, Loader2 } from 'lucide-react';

const Index = () => {
  const { professionals, loading } = useProfessionals();

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="relative py-16 md:py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/30 via-background to-rose-soft/20" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-2xl mx-auto text-center">
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 animate-fade-in">
              Studio{' '}
              <span className="text-primary">Ingrid Leandro</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Realce sua beleza natural com cuidado e dedicação. 
              Especialistas em alongamento de cílios e unhas em gel.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/agendar">
                <Button size="lg" className="w-full sm:w-auto gap-2">
                  <Calendar className="h-5 w-5" />
                  Agendar Horário
                </Button>
              </Link>
              <a href="https://wa.me/5511990278446" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">
                  Falar no WhatsApp
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-16 bg-secondary/50">
        <div className="container mx-auto px-4">
          <h2 className="font-serif text-2xl md:text-3xl font-semibold text-center text-foreground mb-12">
            Nosso Atendimento
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Heart className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Carinho e Dedicação</h3>
                <p className="text-sm text-muted-foreground">
                  Tudo que é feito com carinho, sai perfeito! Cada cliente é especial.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Biossegurança</h3>
                <p className="text-sm text-muted-foreground">
                  Materiais esterilizados e descartados corretamente para seu bem-estar.
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="w-12 h-12 rounded-full bg-accent flex items-center justify-center mx-auto mb-4">
                  <Coffee className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Cantinho do Café</h3>
                <p className="text-sm text-muted-foreground">
                  Cafezinho especial e aperitivos para uma experiência única e acolhedora.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Profissionais */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              Nossas Profissionais
            </h2>
            <p className="text-muted-foreground">
              Equipe especializada pronta para realçar sua beleza
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {loading ? (
              <div className="col-span-2 flex justify-center py-8">
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
                      photo: professional.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
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

      {/* Serviços Destaque */}
      <section className="py-16 bg-gradient-to-b from-background to-secondary/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              <Sparkles className="inline h-6 w-6 text-primary mr-2" />
              Serviços em Destaque
            </h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
            {[
              { name: 'Alongamento Fio a Fio', price: 'R$ 150' },
              { name: 'Volume Russo', price: 'R$ 200' },
              { name: 'Unhas em Gel', price: 'R$ 120' },
              { name: 'Manutenção Cílios', price: 'R$ 80' },
            ].map((service, index) => (
              <Card key={index} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 text-center">
                  <h4 className="font-medium text-foreground mb-2">{service.name}</h4>
                  <p className="text-primary font-semibold">{service.price}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="text-center mt-8">
            <Link to="/agendar">
              <Button size="lg">Ver todos os serviços</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Localização */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground mb-4">
              <MapPin className="inline h-6 w-6 text-primary mr-2" />
              Localização
            </h2>
            <p className="text-muted-foreground">Jaraguá - Zona Oeste, São Paulo</p>
          </div>
          <div className="max-w-3xl mx-auto">
            <Card className="overflow-hidden">
              <div className="aspect-video bg-muted flex items-center justify-center">
                <div className="text-center p-8">
                  <MapPin className="h-12 w-12 text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Endereço completo será enviado após confirmação do agendamento
                  </p>
                  <a
                    href="https://wa.me/5511990278446"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline mt-2 inline-block"
                  >
                    Entre em contato para mais informações
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
