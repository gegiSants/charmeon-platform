import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, Loader2, Link2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

const PaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);

  const appointmentId = searchParams.get('appointment_id');

  const bookingData = location.state as {
    clientName: string;
    service: { name: string };
    professional: { name: string };
    date: Date;
    time: string;
    paymentType: 'sinal' | 'total';
    amountPaid: number;
    restante: number;
    pending?: boolean;
  } | null;

  useEffect(() => {
    const verifyPayment = async () => {
      const paymentId = searchParams.get('payment_id');
      
      if (paymentId && appointmentId) {
        // Verificar pagamento Mercado Pago
        try {
          const { data, error } = await supabase.functions.invoke('verify-payment-mp', {
            body: { paymentId, appointmentId },
          });

          if (!error && data?.paid) {
            setVerified(true);
          }
        } catch (err) {
          console.error('Error verifying Mercado Pago payment:', err);
        }
      }
      setVerifying(false);
    };

    // Small delay to ensure payment is processed
    const timer = setTimeout(verifyPayment, 2000);
    return () => clearTimeout(timer);
  }, [appointmentId, searchParams]);

  if (verifying) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-16 text-center">
          <Loader2 className="h-16 w-16 text-primary mx-auto mb-4 animate-spin" />
          <h1 className="font-serif text-2xl font-semibold mb-2">Verificando pagamento...</h1>
          <p className="text-muted-foreground">Aguarde um momento</p>
        </main>
        <Footer />
      </div>
    );
  }

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
              {verified || bookingData?.pending ? 'Agendamento Confirmado!' : 'Pagamento Processado!'}
            </h1>
            
            {bookingData && bookingData.service && bookingData.professional && (
              <>
                <div className="bg-secondary/50 rounded-lg p-4 mb-6 text-left space-y-2">
                  <p><strong>Cliente:</strong> {bookingData.clientName}</p>
                  <p><strong>Serviço:</strong> {bookingData.service?.name}</p>
                  <p><strong>Profissional:</strong> {bookingData.professional?.name}</p>
                  <p>
                    <strong>Data:</strong>{' '}
                    {format(new Date(bookingData.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </p>
                  <p><strong>Horário:</strong> {bookingData.time}</p>
                  <p className="text-primary font-semibold">
                    <strong>Pago:</strong> R$ {bookingData.amountPaid.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <Link2 className="h-4 w-4" />
                    <span>Pagamento via PIX</span>
                  </p>
                </div>

                {bookingData.paymentType === 'sinal' && bookingData.restante > 0 && (
                  <div className="bg-accent/30 rounded-lg p-4 mb-6">
                    <p className="text-sm">
                      💰 <strong>Restante a pagar:</strong> R$ {bookingData.restante.toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      O valor restante deve ser pago presencialmente no dia do atendimento.
                    </p>
                  </div>
                )}
              </>
            )}

            <div className="bg-rose-soft/50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-sm mb-2">📋 Lembrete Importante:</h4>
              <ul className="text-xs text-muted-foreground text-left space-y-1">
                <li>• Avise com 48h de antecedência em caso de imprevisto</li>
                <li>• Não remova a cutícula na semana do agendamento</li>
                <li>• Em caso de atraso ou não comparecimento, o sinal não será ressarcido</li>
              </ul>
            </div>

            <Button onClick={() => navigate('/')} className="w-full">
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default PaymentSuccess;
