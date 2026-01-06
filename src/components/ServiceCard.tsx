import { Service } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  onClick?: () => void;
  selected?: boolean;
}

const ServiceCard = ({ service, onClick, selected }: ServiceCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-md ${
        selected ? 'ring-2 ring-primary bg-accent/30' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start">
          <div>
            <h4 className="font-medium text-foreground">{service.name}</h4>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Clock className="h-3 w-3" />
              <span>{service.duration} min</span>
            </div>
          </div>
          <span className="font-semibold text-primary">
            R$ {service.price.toFixed(2)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceCard;
