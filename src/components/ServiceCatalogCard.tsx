import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Sparkles, X } from 'lucide-react';
import { Service } from '@/hooks/useAppointments';

interface ServiceCatalogCardProps {
  service: Service & {
    professionals?: { name: string; photo_url?: string | null };
    categories?: { name: string; color?: string; icon?: string };
  };
  onClick?: () => void;
}

const ServiceCatalogCard = ({ service, onClick }: ServiceCatalogCardProps) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Não abrir modal se clicou no botão ou no link
    const target = e.target as HTMLElement;
    if (target.closest('a') || target.closest('button')) {
      return;
    }
    setIsDialogOpen(true);
  };

  return (
    <>
      <Card 
        className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden border-2 hover:border-primary/50 cursor-pointer"
        onClick={handleCardClick}
      >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-accent/20 to-primary/10">
        {service.photo_url ? (
          <img
            src={service.photo_url}
            alt={service.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Sparkles className="h-16 w-16 text-primary/30" />
          </div>
        )}
        {service.is_featured && (
          <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
            Destaque
          </Badge>
        )}
        {service.categories && (
          <Badge 
            variant="secondary" 
            className="absolute top-2 left-2"
            style={{ 
              backgroundColor: service.categories.color || undefined 
            }}
          >
            {service.categories.name}
          </Badge>
        )}
      </div>
      <CardContent className="p-4">
        <div className="space-y-3">
          <div>
            <h3 className="font-serif font-semibold text-lg text-foreground mb-1 line-clamp-1">
              {service.name}
            </h3>
            {service.short_description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {service.short_description}
              </p>
            )}
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-primary font-bold text-lg">
                {formatPrice(Number(service.price))}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>{service.duration} min</span>
              </div>
            </div>
          </div>

          {service.professionals?.name && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Por:</span>
              <span className="font-medium">{service.professionals.name}</span>
            </div>
          )}

          <Link to="/agendar" state={{ preselectedService: service.id, preselectedProfessional: service.professional_id }}>
            <Button className="w-full gap-2" onClick={onClick}>
              <Calendar className="h-4 w-4" />
              Agendar Agora
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>

    {/* Modal de Detalhes */}
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="font-serif text-2xl mb-2">
                {service.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mb-4">
                {service.categories && (
                  <Badge 
                    variant="secondary"
                    style={{ 
                      backgroundColor: service.categories.color || undefined 
                    }}
                  >
                    {service.categories.name}
                  </Badge>
                )}
                {service.is_featured && (
                  <Badge className="bg-primary text-primary-foreground">
                    Destaque
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Imagem */}
          {service.photo_url && (
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gradient-to-br from-accent/20 to-primary/10">
              <img
                src={service.photo_url}
                alt={service.name}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          )}

          {/* Descrição curta */}
          {service.short_description && (
            <div>
              <p className="text-muted-foreground">
                {service.short_description}
              </p>
            </div>
          )}

          {/* Descrição completa */}
          {service.description && (
            <div>
              <h4 className="font-semibold mb-2">Descrição Completa</h4>
              <p className="text-muted-foreground whitespace-pre-line">
                {service.description}
              </p>
            </div>
          )}

          {/* Informações do serviço */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Preço</p>
              <p className="text-primary font-bold text-xl">
                {formatPrice(Number(service.price))}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Duração</p>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{service.duration} minutos</span>
              </div>
            </div>
            {service.professionals?.name && (
              <div className="col-span-2">
                <p className="text-sm text-muted-foreground mb-1">Profissional</p>
                <p className="font-medium">{service.professionals.name}</p>
              </div>
            )}
          </div>

          {/* Botão de agendamento */}
          <div className="pt-4 border-t">
            <Link 
              to="/agendar" 
              state={{ preselectedService: service.id, preselectedProfessional: service.professional_id }}
              onClick={() => setIsDialogOpen(false)}
            >
              <Button className="w-full gap-2" size="lg">
                <Calendar className="h-4 w-4" />
                Agendar Agora
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
};

export default ServiceCatalogCard;

