import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, Loader2, CheckCircle, Copy, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const PixPayment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [qrCode, setQrCode] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaid, setIsPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const bookingData = location.state as {
    appointmentId: string;
    clientName: string;
    clientPhone: string;
    professional: { id: string; name: string };
    service: { id: string; name: string; price: number };
    date: Date;
    time: string;
    paymentId?: string;
    qrCode?: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    amount: number;
    restante: number;
  } | null;

  useEffect(() => {
    if (!bookingData) {
      navigate('/pagamento');
      return;
    }

    // Se já temos o QR Code, usar diretamente
    if (bookingData.qrCode || bookingData.qrCodeBase64) {
      setQrCode(bookingData.qrCode || bookingData.qrCodeBase64 || '');
      setPixCode(bookingData.qrCode || bookingData.qrCodeBase64 || '');
      setIsLoading(false);
      startPaymentPolling();
    } else {
      toast.error('QR Code PIX não disponível');
      setIsLoading(false);
    }
  }, []);

  const startPaymentPolling = () => {
    if (!bookingData?.paymentId || !bookingData?.appointmentId) return;
    
    setCheckingPayment(true);
    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase.functions.invoke('verify-payment-mp', {
          body: {
            paymentId: bookingData.paymentId,
            appointmentId: bookingData.appointmentId,
          },
        });

        if (!error && data?.paid) {
          clearInterval(interval);
          setIsPaid(true);
          setCheckingPayment(false);
          handlePaymentSuccess();
        }
      } catch (err) {
        console.error('Error checking payment:', err);
      }
    }, 5000);

    setTimeout(() => {
      clearInterval(interval);
      setCheckingPayment(false);
    }, 1800000);
  };

  const handlePaymentSuccess = async () => {
    navigate('/pagamento-sucesso', {
      state: {
        ...bookingData,
        paymentType: 'sinal',
        amountPaid: bookingData?.amount,
        restante: bookingData?.restante,
        pending: false,
      },
    });
  };

  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      toast.success('Código PIX copiado!');
    }
  };

  if (!bookingData) {
    return null;
  }

  const sinalValue = bookingData.amount;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-lg mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="font-serif text-xl flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pagamento via PIX
              </CardTitle>
            </CardHeader>
            <CardContent>
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
                  <span className="font-semibold">Valor:</span>
                  <span className="font-semibold text-primary">R$ {sinalValue.toFixed(2)}</span>
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                  <p className="text-muted-foreground">Carregando QR Code PIX...</p>
                </div>
              ) : isPaid ? (
                <div className="text-center py-8">
                  <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">Pagamento Confirmado!</h3>
                  <p className="text-muted-foreground">Redirecionando...</p>
                </div>
              ) : qrCode ? (
                <div className="space-y-6">
                  <div className="bg-primary/5 rounded-lg p-6 text-center">
                    <p className="text-sm font-medium mb-4">Escaneie o QR Code com seu app de pagamento</p>
                    <div className="bg-white p-4 rounded-lg inline-block mb-4">
                      {bookingData?.qrCodeBase64 ? (
                        <img 
                          src={bookingData.qrCodeBase64}
                          alt="QR Code PIX"
                          className="w-64 h-64 mx-auto"
                        />
                      ) : (
                        <img 
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrCode)}`}
                          alt="QR Code PIX"
                          className="w-64 h-64 mx-auto"
                        />
                      )}
                    </div>
                    <div className="bg-muted rounded-lg p-3 mb-4">
                      <p className="text-xs text-muted-foreground mb-2">Ou copie o código PIX:</p>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 text-xs break-all text-left">{pixCode}</code>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={copyPixCode}
                          className="shrink-0"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      O QR Code expira em 30 minutos
                    </p>
                    {bookingData?.ticketUrl && (
                      <div className="mt-4">
                        <a
                          href={bookingData.ticketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          Abrir comprovante em nova aba
                        </a>
                      </div>
                    )}
                  </div>

                  {checkingPayment && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        <p className="text-sm text-blue-600">
                          Aguardando confirmação do pagamento...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">Erro ao gerar QR Code PIX</p>
                  <Button onClick={() => navigate('/pagamento', { state: bookingData })}>
                    Tentar Novamente
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PixPayment;
