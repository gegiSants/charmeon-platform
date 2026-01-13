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
          {professional.photo ? (
            <img
              src={professional.photo}
              alt={professional.name}
              className="w-16 h-16 rounded-full object-cover border-2 border-accent"
              onError={(e) => {
                // Se a imagem falhar ao carregar, esconder e mostrar placeholder
                e.currentTarget.style.display = 'none';
                const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = 'flex';
                  placeholder.classList.remove('hidden');
                }
              }}
            />
          ) : null}
          <div
            className={`w-16 h-16 rounded-full bg-muted flex items-center justify-center border-2 border-accent ${professional.photo ? 'hidden' : ''}`}
            style={{ display: professional.photo ? 'none' : 'flex' }}
          >
            <span className="text-2xl font-semibold text-muted-foreground">
              {professional.name.charAt(0).toUpperCase()}
            </span>
          </div>
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
