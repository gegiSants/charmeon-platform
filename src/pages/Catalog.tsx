import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ServiceCatalogCard from '@/components/ServiceCatalogCard';
import StudioInfo from '@/components/StudioInfo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Search, Filter, X, Sparkles, Loader2, Info } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';

interface Category {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface ServiceWithDetails extends Service {
  professionals?: { name: string; photo_url?: string | null };
  categories?: Category;
}

const Catalog = () => {
  const navigate = useNavigate();
  const [services, setServices] = useState<ServiceWithDetails[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carregar categorias
      const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (categoriesData) {
        setCategories(categoriesData);
      }

      // Carregar profissionais
      const { data: professionalsData } = await supabase
        .from('professionals')
        .select('*')
        .order('name');

      if (professionalsData) {
        setProfessionals(professionalsData);
      }

      // Carregar serviços com relacionamentos
      const { data: servicesData, error } = await supabase
        .from('services')
        .select(`
          *,
          professionals:professional_id (name, photo_url),
          categories:category_id (id, name, description, icon, color)
        `)
        .order('is_featured', { ascending: false })
        .order('display_order')
        .order('name');

      if (error) {
        console.error('Error loading services:', error);
      } else {
        setServices(servicesData || []);
      }
    } catch (error) {
      console.error('Error loading catalog data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredServices = services.filter((service) => {
    // Filtro de busca
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        service.name.toLowerCase().includes(searchLower) ||
        service.description?.toLowerCase().includes(searchLower) ||
        service.short_description?.toLowerCase().includes(searchLower) ||
        service.professionals?.name.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }

    // Filtro de categoria
    if (selectedCategory !== 'all') {
      if (service.category_id !== selectedCategory) return false;
    }

    // Filtro de profissional
    if (selectedProfessional !== 'all') {
      if (service.professional_id !== selectedProfessional) return false;
    }

    // Filtro de destaque
    if (showFeaturedOnly && !service.is_featured) {
      return false;
    }

    return true;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('all');
    setSelectedProfessional('all');
    setShowFeaturedOnly(false);
  };

  const hasActiveFilters = searchTerm || selectedCategory !== 'all' || selectedProfessional !== 'all' || showFeaturedOnly;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero Section do Catálogo */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-foreground mb-4">
            Catálogo de Serviços
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore nossos serviços e encontre o procedimento perfeito para você
          </p>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardContent className="p-4 md:p-6">
            <div className="space-y-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviços..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filtros em linha */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as categorias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as categorias</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as profissionais" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as profissionais</SelectItem>
                    {professionals.map((pro) => (
                      <SelectItem key={pro.id} value={pro.id}>
                        {pro.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant={showFeaturedOnly ? 'default' : 'outline'}
                  onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
                  className="w-full"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {showFeaturedOnly ? 'Em Destaque' : 'Ver Destaques'}
                </Button>

                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    onClick={clearFilters}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Limpar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultados */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredServices.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-muted-foreground text-lg mb-4">
                Nenhum serviço encontrado
              </p>
              {hasActiveFilters && (
                <Button variant="outline" onClick={clearFilters}>
                  Limpar filtros
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {filteredServices.length} {filteredServices.length === 1 ? 'serviço encontrado' : 'serviços encontrados'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredServices.map((service) => (
                <ServiceCatalogCard
                  key={service.id}
                  service={service}
                  onClick={() => {
                    navigate('/agendar', {
                      state: {
                        preselectedService: service.id,
                        preselectedProfessional: service.professional_id,
                      },
                    });
                  }}
                />
              ))}
            </div>
          </>
        )}

        {/* Seção de Informações do Estúdio */}
        <div className="mt-16">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Info className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl font-bold text-foreground mb-4">
              Informações do Estúdio
            </h2>
            <p className="text-muted-foreground">
              Conheça nossos protocolos, formas de pagamento e mais
            </p>
          </div>

          <Tabs defaultValue="protocol" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="protocol">Protocolo</TabsTrigger>
              <TabsTrigger value="biosecurity">Biossegurança</TabsTrigger>
              <TabsTrigger value="payment">Pagamento</TabsTrigger>
              <TabsTrigger value="address">Endereço</TabsTrigger>
            </TabsList>
            
            <TabsContent value="protocol">
              <StudioInfo showSections={['protocol']} />
            </TabsContent>
            
            <TabsContent value="biosecurity">
              <StudioInfo showSections={['biosecurity']} />
            </TabsContent>
            
            <TabsContent value="payment">
              <StudioInfo showSections={['payment']} />
            </TabsContent>
            
            <TabsContent value="address">
              <StudioInfo showSections={['address']} />
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Catalog;


