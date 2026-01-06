import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CreditCard, Wallet, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentType, setPaymentType] = useState<'sinal' | 'total'>('sinal');
  const [isProcessing, setIsProcessing] = useState(false);

  const canceled = searchParams.get('canceled');

  const bookingData = location.state as {
    appointmentId: string;
    clientName: string;
    clientPhone: string;
    professional: { id: string; name: string };
    service: { id: string; name: string; price: number };
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

  const totalValue = Number(bookingData.service.price);
  const sinalValue = totalValue * 0.3;
  const restanteValue = totalValue - sinalValue;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const amount = paymentType === 'sinal' ? sinalValue : totalValue;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          appointmentId: bookingData.appointmentId,
          clientName: bookingData.clientName,
          serviceName: bookingData.service.name,
          amount: amount,
          paymentType: paymentType,
          professionalName: bookingData.professional.name,
          appointmentDate: format(new Date(bookingData.date), "dd/MM/yyyy", { locale: ptBR }),
          appointmentTime: bookingData.time,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe Checkout in new tab
        window.open(data.url, '_blank');
        toast.success('Redirecionando para pagamento...');
        
        // Navigate to success page after short delay
        setTimeout(() => {
          navigate('/pagamento-sucesso', { 
            state: { 
              ...bookingData, 
              paymentType,
              amountPaid: amount,
              restante: paymentType === 'sinal' ? restanteValue : 0,
              pending: true
            } 
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          {canceled && (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
              <p className="text-sm">Pagamento cancelado. Você pode tentar novamente.</p>
            </div>
          )}

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
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pagar R$ {paymentType === 'sinal' ? sinalValue.toFixed(2) : totalValue.toFixed(2)}
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Pagamento seguro processado por Stripe
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Payment;
