import { Professional } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';

interface ProfessionalCardProps {
  professional: Professional;
  onClick?: () => void;
  selected?: boolean;
}

const ProfessionalCard = ({ professional, onClick, selected }: ProfessionalCardProps) => {
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
        selected ? 'ring-2 ring-primary shadow-lg' : ''
      }`}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <img
            src={professional.photo}
            alt={professional.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-accent"
          />
          <div>
            <h3 className="font-serif font-semibold text-foreground">{professional.name}</h3>
            <p className="text-sm text-muted-foreground">{professional.specialty}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ProfessionalCard;
