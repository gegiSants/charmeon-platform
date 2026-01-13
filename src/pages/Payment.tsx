import { useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { AlertCircle, Loader2, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // Sempre pagamento de sinal (30%)
  const [isProcessing, setIsProcessing] = useState(false);

  const canceled = searchParams.get('canceled');

  const bookingData = location.state as {
    appointmentId: string;
    clientName: string;
    clientPhone: string;
    professional: { id: string; name: string; sinal_padrao?: number | null };
    service: { id: string; name: string; price: number; sinal_fixo?: number | null };
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
  
  // Calcular valor do sinal:
  // 1. Se o serviço tem sinal_fixo, usa esse valor
  // 2. Senão, se a profissional tem sinal_padrao, usa esse valor
  // 3. Senão, usa 30% do valor total
  let sinalValue: number;
  if (bookingData.service.sinal_fixo && bookingData.service.sinal_fixo > 0) {
    sinalValue = bookingData.service.sinal_fixo;
  } else if (bookingData.professional.sinal_padrao && bookingData.professional.sinal_padrao > 0) {
    sinalValue = bookingData.professional.sinal_padrao;
  } else {
    sinalValue = totalValue * 0.3; // Padrão: 30%
  }
  
  const restanteValue = totalValue - sinalValue;
  const amount = sinalValue;

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Configuração do Supabase não encontrada');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/create-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          appointmentId: bookingData.appointmentId,
          clientName: bookingData.clientName,
          clientEmail: '', // PIX não precisa de email obrigatório
          clientPhone: bookingData.clientPhone,
          serviceName: bookingData.service.name,
          amount: amount,
          paymentType: 'sinal',
          professionalName: bookingData.professional.name,
          appointmentDate: format(new Date(bookingData.date), "dd/MM/yyyy", { locale: ptBR }),
          appointmentTime: bookingData.time,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Erro na resposta:', response.status, errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      // Se o valor for 0 (teste), pular pagamento e ir direto para sucesso
      if (data.skipPayment) {
        navigate('/pagamento-sucesso', {
          state: {
            ...bookingData,
            paymentType: 'sinal',
            amountPaid: amount,
            restante: restanteValue,
          },
        });
        return;
      }

      // Aceitar tanto QR Code quanto link de pagamento
      const paymentLink = data.initPoint || data.sandboxInitPoint;
      const hasQrCode = data.qrCode || data.qrCodeBase64;
      
      if (!paymentLink && !hasQrCode && !data.paymentId) {
        throw new Error('Dados de pagamento não foram gerados.');
      }

      navigate('/pagamento-pix', {
        state: {
          ...bookingData,
          paymentId: data.paymentId,
          preferenceId: data.preferenceId || data.paymentId,
          initPoint: data.initPoint,
          sandboxInitPoint: data.sandboxInitPoint,
          qrCode: data.qrCode,
          qrCodeBase64: data.qrCodeBase64,
          ticketUrl: data.ticketUrl,
          amount: amount,
          restante: restanteValue,
        },
      });
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

              {/* Opção de Pagamento - Apenas Sinal */}
              <div className="mb-6">
                <h4 className="font-semibold mb-4">Forma de Pagamento:</h4>
                <div className="p-4 rounded-lg border border-primary bg-accent/30">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Link2 className="h-4 w-4 text-primary" />
                        <span className="font-medium">Pagar Sinal (30%) - PIX</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Pague R$ {sinalValue.toFixed(2)} via PIX agora e R$ {restanteValue.toFixed(2)} no dia
                      </p>
                      <p className="text-xs text-primary mt-1 font-medium">
                        💰 Sem taxas adicionais
                      </p>
                    </div>
                    <span className="font-semibold text-primary">R$ {sinalValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Informativo */}
              <div className="bg-muted/50 rounded-lg p-4 mb-6">
                <p className="text-sm text-muted-foreground">
                  <strong>Importante:</strong> O valor do sinal garante sua reserva de horário. 
                  O restante deve ser pago presencialmente no dia do atendimento.
                  Em caso de não comparecimento, o sinal não será ressarcido.
                </p>
              </div>

              {/* Aviso sobre método de pagamento */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  <Link2 className="h-4 w-4" />
                  Pagamento via PIX - Sem taxas adicionais
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você receberá um link de pagamento para pagar via PIX
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
                    <Link2 className="h-4 w-4 mr-2" />
                    Pagar R$ {amount.toFixed(2)} via PIX
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                Pagamento seguro via PIX - Sem taxas adicionais
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
