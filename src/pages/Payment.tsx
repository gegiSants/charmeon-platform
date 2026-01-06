import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Wallet, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<'sinal' | 'total'>('sinal');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const bookingData = location.state as {
    clientName: string;
    clientPhone: string;
    professional: { name: string };
    service: { name: string; price: number };
    date: Date;
    time: string;
  } | null;

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Nenhum agendamento encontrado</h1>
          <p className="text-muted-foreground mb-6">Por favor, faça um novo agendamento.</p>
          <Button onClick={() => navigate('/agendar')}>Fazer Agendamento</Button>
        </main>
        <Footer />
      </div>
    );
  }

  const sinalValue = bookingData.service.price * 0.3;
  const restanteValue = bookingData.service.price - sinalValue;
  const totalValue = bookingData.service.price;

  const handlePayment = () => {
    setIsProcessing(true);
    // Simula processamento de pagamento
    setTimeout(() => {
      setIsProcessing(false);
      setIsConfirmed(true);
      toast.success('Pagamento confirmado!');
    }, 2000);
  };

  if (isConfirmed) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16">
          <Card className="max-w-lg mx-auto text-center">
            <CardContent className="pt-8 pb-8">
              <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
                <CheckCircle className="h-10 w-10 text-green-600" />
              </div>
              <h1 className="font-serif text-2xl font-semibold text-foreground mb-4">
                Agendamento Confirmado!
              </h1>
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left space-y-2">
                <p><strong>Cliente:</strong> {bookingData.clientName}</p>
                <p><strong>Serviço:</strong> {bookingData.service.name}</p>
                <p><strong>Profissional:</strong> {bookingData.professional.name}</p>
                <p>
                  <strong>Data:</strong>{' '}
                  {format(new Date(bookingData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </p>
                <p><strong>Horário:</strong> {bookingData.time}</p>
                <p className="text-primary font-semibold">
                  <strong>Pago:</strong> R$ {paymentType === 'sinal' ? sinalValue.toFixed(2) : totalValue.toFixed(2)}
                </p>
              </div>

              {paymentType === 'sinal' && (
                <div className="bg-accent/30 rounded-lg p-4 mb-6">
                  <p className="text-sm">
                    💰 <strong>Restante a pagar:</strong> R$ {restanteValue.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O valor restante deve ser pago presencialmente no dia do atendimento.
                  </p>
                </div>
              )}

              <div className="bg-rose-soft/50 rounded-lg p-4 mb-6">
                <h4 className="font-semibold text-sm mb-2">📋 Lembrete Importante:</h4>
                <ul className="text-xs text-muted-foreground text-left space-y-1">
                  <li>• Avise com 48h de antecedência em caso de imprevisto</li>
                  <li>• Não remova a cutícula na semana do agendamento</li>
                  <li>• Em caso de atraso ou não comparecimento, o sinal não será ressarcido</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <Button onClick={() => navigate('/')} variant="outline" className="flex-1">
                  Voltar ao Início
                </Button>
                <a
                  href="https://wa.me/5511990278446"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button className="w-full">Falar no WhatsApp</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl">Pagamento</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Resumo */}
              <div className="bg-secondary/50 rounded-lg p-4 mb-6 space-y-2">
                <h4 className="font-semibold mb-3">Resumo do Agendamento</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Serviço:</span>
                  <span>{bookingData.service.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Profissional:</span>
                  <span>{bookingData.professional.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Data:</span>
                  <span>{format(new Date(bookingData.date), "dd/MM/yyyy", { locale: ptBR })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Horário:</span>
                  <span>{bookingData.time}</span>
                </div>
                <div className="border-t border-border pt-2 mt-2 flex justify-between">
                  <span className="font-semibold">Valor Total:</span>
                  <span className="font-semibold text-primary">R$ {totalValue.toFixed(2)}</span>
                </div>
              </div>

              {/* Opções de Pagamento */}
              <div className="mb-6">
                <h4 className="font-semibold mb-4">Escolha como pagar:</h4>
                <RadioGroup
                  value={paymentType}
                  onValueChange={(value) => setPaymentType(value as 'sinal' | 'total')}
                  className="space-y-3"
                >
                  <Label
                    htmlFor="sinal"
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      paymentType === 'sinal' ? 'border-primary bg-accent/30' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="sinal" id="sinal" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-primary" />
                        <span className="font-medium">Pagar Sinal (30%)</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pague R$ {sinalValue.toFixed(2)} agora e R$ {restanteValue.toFixed(2)} no dia
                      </p>
                    </div>
                    <span className="font-semibold text-primary">R$ {sinalValue.toFixed(2)}</span>
                  </Label>

                  <Label
                    htmlFor="total"
                    className={`flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-colors ${
                      paymentType === 'total' ? 'border-primary bg-accent/30' : 'border-border'
                    }`}
                  >
                    <RadioGroupItem value="total" id="total" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4 text-primary" />
                        <span className="font-medium">Pagar Total</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pague o valor integral agora
                      </p>
                    </div>
                    <span className="font-semibold text-primary">R$ {totalValue.toFixed(2)}</span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Informativo */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Importante:</strong> O valor do sinal garante sua reserva de horário. 
                  O restante deve ser pago presencialmente no dia do atendimento.
                  Em caso de não comparecimento, o sinal não será ressarcido.
                </p>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handlePayment}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  'Processando...'
                ) : (
                  <>
                    Pagar R$ {paymentType === 'sinal' ? sinalValue.toFixed(2) : totalValue.toFixed(2)}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;
