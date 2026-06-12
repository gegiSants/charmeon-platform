import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { 
  MapPin, 
  Shield, 
  CreditCard, 
  FileText,
  Loader2,
} from 'lucide-react';

interface StudioInfo {
  id: string;
  phone: string;
  instagram: string;
  email?: string;
  address?: string;
  address_complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  google_maps_url?: string;
  business_hours?: string;
  saturday_note?: string;
  service_protocol?: string;
  rescheduling_policy?: string;
  cancellation_policy?: string;
  late_policy?: string;
  deposit_policy?: string;
  biosecurity_title?: string;
  biosecurity_description?: string;
  payment_methods?: string[];
  payment_note?: string;
  about_text?: string;
}

interface StudioInfoProps {
  showSections?: ('all' | 'biosecurity' | 'protocol' | 'payment' | 'address')[];
}

const StudioInfo = ({ showSections = ['all'] }: StudioInfoProps) => {
  const [info, setInfo] = useState<StudioInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudioInfo();
  }, []);

  const loadStudioInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('studio_info')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error loading studio info:', error);
      } else {
        setInfo(data);
      }
    } catch (error) {
      console.error('Error loading studio info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!info) {
    return null;
  }

  const showAll = showSections.includes('all');
  const showBiosecurity = showAll || showSections.includes('biosecurity');
  const showProtocol = showAll || showSections.includes('protocol');
  const showPayment = showAll || showSections.includes('payment');
  const showAddress = showAll || showSections.includes('address');

  const fullAddress = [
    info.address,
    info.address_complement,
    info.neighborhood,
    info.city && info.state ? `${info.city} - ${info.state}` : null,
    info.zip_code
  ].filter(Boolean).join(', ');

  return (
    <div className="space-y-6">
      {/* Biossegurança */}
      {showBiosecurity && info.biosecurity_description && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">
                {info.biosecurity_title || 'Biossegurança'}
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground leading-relaxed">
              {info.biosecurity_description}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Protocolo de Atendimentos */}
      {showProtocol && (info.service_protocol || info.rescheduling_policy || info.late_policy) && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Protocolo de Atendimentos</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {info.business_hours && (
              <div>
                <p className="font-semibold mb-1">Horário de Atendimento:</p>
                <p className="text-muted-foreground">
                  {info.business_hours}
                  {info.saturday_note && (
                    <span className="block text-sm mt-1">{info.saturday_note}</span>
                  )}
                </p>
              </div>
            )}

            {info.rescheduling_policy && (
              <div>
                <p className="font-semibold mb-1">Remarcação:</p>
                <p className="text-muted-foreground text-sm">{info.rescheduling_policy}</p>
              </div>
            )}

            {info.late_policy && (
              <div>
                <p className="font-semibold mb-1 text-destructive">Atrasos:</p>
                <p className="text-muted-foreground text-sm">{info.late_policy}</p>
              </div>
            )}

            {info.cancellation_policy && (
              <div>
                <p className="font-semibold mb-1">Cancelamento:</p>
                <p className="text-muted-foreground text-sm">{info.cancellation_policy}</p>
              </div>
            )}

            {info.deposit_policy && (
              <div>
                <p className="font-semibold mb-1">Sinal:</p>
                <p className="text-muted-foreground text-sm">{info.deposit_policy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Formas de Pagamento */}
      {showPayment && info.payment_methods && info.payment_methods.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Formas de Pagamento</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2 mb-4">
              {info.payment_methods.map((method, index) => (
                <Badge key={index} variant="secondary" className="text-sm">
                  {method}
                </Badge>
              ))}
            </div>
            {info.payment_note && (
              <p className="text-sm text-muted-foreground italic">
                {info.payment_note}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-2">
              <strong>Nota:</strong> O sinal é pago via PIX através do sistema. 
              Os demais valores podem ser pagos pessoalmente no dia do atendimento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Endereço */}
      {showAddress && fullAddress && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              <CardTitle className="font-serif">Endereço</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{fullAddress}</p>
            {info.google_maps_url && (
              <a
                href={info.google_maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline text-sm"
              >
                Ver no Google Maps →
              </a>
            )}
          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default StudioInfo;

