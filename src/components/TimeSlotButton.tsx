import { TimeSlot } from '@/data/mockData';
import { Button } from '@/components/ui/button';

interface TimeSlotButtonProps {
  slot: TimeSlot;
  onClick?: () => void;
  selected?: boolean;
}

const TimeSlotButton = ({ slot, onClick, selected }: TimeSlotButtonProps) => {
  if (!slot.available) {
    return (
      <Button
        variant="outline"
        disabled
        className="opacity-50 cursor-not-allowed line-through"
      >
        {slot.time}
      </Button>
    );
  }

  return (
    <Button
      variant={selected ? 'default' : 'outline'}
      onClick={onClick}
      className={selected ? '' : 'hover:bg-accent hover:text-accent-foreground'}
    >
      {slot.time}
    </Button>
  );
};

export default TimeSlotButton;
