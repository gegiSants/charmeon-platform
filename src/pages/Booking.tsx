import { useState, useEffect } from 'react';
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
import { useProfessionals, useServices, generateTimeSlots, createAppointment, getClientEmail, TimeSlot, Professional, Service } from '@/hooks/useAppointments';
import { ChevronRight, ChevronLeft, User, Phone, Loader2, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

type BookingStep = 'info' | 'professional' | 'service' | 'datetime' | 'confirm';

const Booking = () => {
  const navigate = useNavigate();
  const { professionals, loading: loadingProfessionals } = useProfessionals();
  const [step, setStep] = useState<BookingStep>('info');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { services, loading: loadingServices } = useServices(selectedProfessional);

  const stepOrder: BookingStep[] = ['info', 'professional', 'service', 'datetime', 'confirm'];
  const currentStepIndex = stepOrder.indexOf(step);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 2) return `(${numbers}`;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handlePhoneChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    if (formatted.length <= 15) {
      setClientPhone(formatted);
      
      // Verificar se já existe email para este telefone
      const cleanPhone = formatted.replace(/\D/g, '');
      if (cleanPhone.length >= 10) {
        setCheckingEmail(true);
        try {
          const email = await getClientEmail(cleanPhone);
          if (email) {
            setExistingEmail(email);
            setClientEmail(email);
          } else {
            setExistingEmail(null);
            setClientEmail('');
          }
        } catch (error) {
          console.error('Erro ao buscar email:', error);
          setExistingEmail(null);
        } finally {
          setCheckingEmail(false);
        }
      } else {
        setExistingEmail(null);
        setClientEmail('');
      }
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedTime(null);
    if (date && selectedProfessional) {
      setLoadingSlots(true);
      const slots = await generateTimeSlots(date, selectedProfessional);
      setTimeSlots(slots);
      setLoadingSlots(false);
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
        const hasValidName = clientName.trim().length >= 3;
        const hasValidPhone = clientPhone.replace(/\D/g, '').length >= 10;
        const hasEmail = existingEmail || (clientEmail.trim() && clientEmail.includes('@'));
        return hasValidName && hasValidPhone && hasEmail;
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

  const handleConfirm = async () => {
    const selectedProData = professionals.find(p => p.id === selectedProfessional);
    const selectedServiceData = services.find(s => s.id === selectedService);
    
    if (!selectedProData || !selectedServiceData || !selectedDate || !selectedTime) {
      toast.error('Dados incompletos. Por favor, revise o agendamento.');
      return;
    }

    // Se não tem email existente, validar se foi preenchido
    if (!existingEmail && !clientEmail.trim()) {
      toast.error('Por favor, informe seu email para receber a confirmação do agendamento.');
      return;
    }

    setIsSubmitting(true);
    try {
      const appointment = await createAppointment({
        clientName,
        clientPhone,
        clientEmail: clientEmail.trim() || existingEmail || undefined,
        professionalId: selectedProfessional!,
        serviceId: selectedService!,
        date: selectedDate,
        time: selectedTime,
        paymentType: 'sinal', // Default, will be chosen on payment page
        totalAmount: Number(selectedServiceData.price),
      });

      toast.success('Agendamento criado! Redirecionando para pagamento...');
      navigate('/pagamento', {
        state: {
          appointmentId: appointment.id,
          clientName,
          clientPhone,
          professional: selectedProData,
          service: selectedServiceData,
          date: selectedDate,
          time: selectedTime,
        },
      });
    } catch (error) {
      console.error('Error creating appointment:', error);
      toast.error('Erro ao criar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedProData = professionals.find(p => p.id === selectedProfessional);
  const selectedServiceData = services.find(s => s.id === selectedService);

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
                      disabled={checkingEmail}
                    />
                    {checkingEmail && (
                      <p className="text-xs text-muted-foreground mt-1">Verificando email cadastrado...</p>
                    )}
                  </div>
                  <div>
                    {existingEmail ? (
                      <div className="bg-muted/50 rounded-lg p-3">
                        <Label className="flex items-center gap-2 mb-2">
                          <Mail className="h-4 w-4" />
                          Email cadastrado
                        </Label>
                        <p className="text-sm font-medium text-foreground">{existingEmail}</p>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="mt-2 text-xs"
                          onClick={() => {
                            setExistingEmail(null);
                            setClientEmail('');
                          }}
                        >
                          Usar outro email
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Label htmlFor="email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email *
                          <span className="text-xs text-muted-foreground font-normal ml-2">
                            (obrigatório para confirmação)
                          </span>
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          value={clientEmail}
                          onChange={(e) => setClientEmail(e.target.value)}
                          placeholder="seu@email.com"
                          className="mt-1"
                          required
                        />
                        {clientEmail && !clientEmail.includes('@') && (
                          <p className="text-xs text-destructive mt-1">Email inválido</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Step: Professional */}
              {step === 'professional' && (
                <div className="space-y-4">
                  {loadingProfessionals ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    professionals.map((pro) => (
                      <ProfessionalCard
                        key={pro.id}
                        professional={{
                          id: pro.id,
                          name: pro.name,
                          specialty: pro.specialty,
                          photo: pro.photo_url || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop&crop=face',
                          phone: pro.phone,
                          services: [],
                        }}
                        selected={selectedProfessional === pro.id}
                        onClick={() => {
                          setSelectedProfessional(pro.id);
                          setSelectedService(null);
                        }}
                      />
                    ))
                  )}
                </div>
              )}

              {/* Step: Service */}
              {step === 'service' && (
                <div className="space-y-3">
                  {loadingServices ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : (
                    services.map((service) => (
                      <ServiceCard
                        key={service.id}
                        service={{
                          id: service.id,
                          name: service.name,
                          price: Number(service.price),
                          duration: service.duration,
                          professionalId: service.professional_id,
                        }}
                        selected={selectedService === service.id}
                        onClick={() => setSelectedService(service.id)}
                      />
                    ))
                  )}
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
                      {loadingSlots ? (
                        <div className="flex justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
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
                        R$ {Number(selectedServiceData?.price).toFixed(2)}
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
                  <Button onClick={handleConfirm} disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        Confirmar e Pagar
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </>
                    )}
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
