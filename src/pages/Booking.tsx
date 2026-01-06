import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ProfessionalCard from '@/components/ProfessionalCard';
import ServiceCard from '@/components/ServiceCard';
import TimeSlotButton from '@/components/TimeSlotButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { professionals, services, generateTimeSlots, TimeSlot } from '@/data/mockData';
import { ChevronRight, ChevronLeft, User, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type BookingStep = 'info' | 'professional' | 'service' | 'datetime' | 'confirm';

const Booking = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState<BookingStep>('info');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);

  const stepOrder: BookingStep[] = ['info', 'professional', 'service', 'datetime', 'confirm'];
  const currentStepIndex = stepOrder.indexOf(step);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 15) {
      setClientPhone(formatted);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
    if (date) {
      setTimeSlots(generateTimeSlots(date));
    }
  };

  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < stepOrder.length) {
      setStep(stepOrder[nextIndex]);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(stepOrder[prevIndex]);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 'info':
        return clientName.trim().length >= 3 && clientPhone.replace(/\D/g, '').length >= 10;
      case 'professional':
        return selectedProfessional !== null;
      case 'service':
        return selectedService !== null;
      case 'datetime':
        return selectedDate !== undefined && selectedTime !== null;
      default:
        return true;
    }
  };

  const handleConfirm = () => {
    toast.success('Agendamento realizado! Redirecionando para pagamento...');
    navigate('/pagamento', {
      state: {
        clientName,
        clientPhone,
        professional: professionals.find(p => p.id === selectedProfessional),
        service: services.find(s => s.id === selectedService),
        date: selectedDate,
        time: selectedTime,
      },
    });
  };

  const selectedProData = professionals.find(p => p.id === selectedProfessional);
  const selectedServiceData = services.find(s => s.id === selectedService);
  const availableServices = services.filter(s => s.professionalId === selectedProfessional);

  const stepTitles: Record<BookingStep, string> = {
    info: 'Suas Informações',
    professional: 'Escolha a Profissional',
    service: 'Escolha o Serviço',
    datetime: 'Escolha Data e Horário',
    confirm: 'Confirme seu Agendamento',
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Steps */}
          <div className="flex justify-between mb-8">
            {stepOrder.map((s, index) => (
              <div
                key={s}
                className={`flex items-center ${index < stepOrder.length - 1 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                    index <= currentStepIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {index + 1}
                </div>
                {index < stepOrder.length - 1 && (
                  <div
                    className={`flex-1 h-1 mx-2 transition-colors ${
                      index < currentStepIndex ? 'bg-primary' : 'bg-muted'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">{stepTitles[step]}</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Step: Info */}
              {step === 'info' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name" className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Nome Completo
                    </Label>
                    <Input
                      id="name"
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Digite seu nome"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone" className="flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Telefone (WhatsApp) *
                    </Label>
                    <Input
                      id="phone"
                      value={clientPhone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              {/* Step: Professional */}
              {step === 'professional' && (
                <div className="space-y-4">
                  {professionals.map((pro) => (
                    <ProfessionalCard
                      key={pro.id}
                      professional={pro}
                      selected={selectedProfessional === pro.id}
                      onClick={() => {
                        setSelectedProfessional(pro.id);
                        setSelectedService(null);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Step: Service */}
              {step === 'service' && (
                <div className="space-y-3">
                  {availableServices.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      selected={selectedService === service.id}
                      onClick={() => setSelectedService(service.id)}
                    />
                  ))}
                </div>
              )}

              {/* Step: DateTime */}
              {step === 'datetime' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-3">Selecione a data:</h4>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={handleDateSelect}
                      disabled={(date) => date < new Date() || date.getDay() === 0}
                      locale={ptBR}
                      className="rounded-md border mx-auto"
                    />
                  </div>

                  {selectedDate && (
                    <div>
                      <h4 className="font-medium mb-3">
                        Horários disponíveis para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}:
                      </h4>
                      <div className="grid grid-cols-4 gap-2">
                        {timeSlots.map((slot) => (
                          <TimeSlotButton
                            key={slot.time}
                            slot={slot}
                            selected={selectedTime === slot.time}
                            onClick={() => setSelectedTime(slot.time)}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Horários riscados não estão disponíveis
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Step: Confirm */}
              {step === 'confirm' && (
                <div className="space-y-4">
                  <div className="bg-secondary/50 rounded-lg p-4 space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cliente:</span>
                      <span className="font-medium">{clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Telefone:</span>
                      <span className="font-medium">{clientPhone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Profissional:</span>
                      <span className="font-medium">{selectedProData?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Serviço:</span>
                      <span className="font-medium">{selectedServiceData?.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Data:</span>
                      <span className="font-medium">
                        {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horário:</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-semibold">Valor:</span>
                      <span className="font-semibold text-primary">
                        R$ {selectedServiceData?.price.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8">
                {currentStepIndex > 0 ? (
                  <Button variant="outline" onClick={goToPreviousStep}>
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Voltar
                  </Button>
                ) : (
                  <div />
                )}

                {step === 'confirm' ? (
                  <Button onClick={handleConfirm}>
                    Confirmar e Pagar
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                ) : (
                  <Button onClick={goToNextStep} disabled={!canProceed()}>
                    Próximo
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Booking;
