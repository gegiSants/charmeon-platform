import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const DAY_LABELS = [
  { value: 0, label: 'Dom' },
  { value: 1, label: 'Seg' },
  { value: 2, label: 'Ter' },
  { value: 3, label: 'Qua' },
  { value: 4, label: 'Qui' },
  { value: 5, label: 'Sex' },
  { value: 6, label: 'Sáb' },
];

interface Professional {
  id: string;
  name: string;
}

interface AvailabilityRule {
  id: string;
  professional_id: string;
  days_of_week: number[];
  start_time: string;
  end_time: string;
  slot_minutes: number;
  break_start: string | null;
  break_end: string | null;
  is_active: boolean;
  professionals?: { name: string } | null;
}

interface AvailabilityRulesSectionProps {
  professionals: Professional[];
  professionalFilter: string;
}

function timeToInput(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export default function AvailabilityRulesSection({
  professionals,
  professionalFilter,
}: AvailabilityRulesSectionProps) {
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    professionalId: '',
    days: [1, 2, 3, 4, 5] as number[],
    start: '08:00',
    end: '18:00',
    slot: '30',
    breakStart: '12:00',
    breakEnd: '13:00',
    hasBreak: true,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('availability_rules')
        .select('*, professionals:professional_id(name)')
        .order('created_at', { ascending: false });

      if (professionalFilter !== 'all') {
        query = query.eq('professional_id', professionalFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setRules((data as AvailabilityRule[]) || []);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar regras de disponibilidade');
      setRules([]);
    } finally {
      setLoading(false);
    }
  }, [professionalFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleDay = (day: number) => {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day].sort(),
    }));
  };

  const handleCreate = async () => {
    if (!form.professionalId) {
      toast.error('Selecione uma profissional');
      return;
    }
    if (form.days.length === 0) {
      toast.error('Selecione ao menos um dia da semana');
      return;
    }
    if (form.start >= form.end) {
      toast.error('Horário inicial deve ser antes do final');
      return;
    }

    const payload: Record<string, unknown> = {
      professional_id: form.professionalId,
      days_of_week: form.days,
      start_time: form.start,
      end_time: form.end,
      slot_minutes: parseInt(form.slot, 10),
      is_active: true,
      break_start: form.hasBreak ? form.breakStart : null,
      break_end: form.hasBreak ? form.breakEnd : null,
    };

    const { error } = await supabase.from('availability_rules').insert(payload);
    if (error) {
      console.error(error);
      toast.error(error.message || 'Erro ao criar regra');
      return;
    }
    toast.success('Regra criada! Os horários passam a ser gerados automaticamente.');
    setOpen(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover esta regra de disponibilidade?')) return;
    const { error } = await supabase.from('availability_rules').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao remover regra');
      return;
    }
    toast.success('Regra removida');
    load();
  };

  const handleToggle = async (rule: AvailabilityRule) => {
    const { error } = await supabase
      .from('availability_rules')
      .update({ is_active: !rule.is_active })
      .eq('id', rule.id);
    if (error) {
      toast.error('Erro ao atualizar regra');
      return;
    }
    load();
  };

  return (
    <Card className="mb-6 border-primary/20">
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <CardTitle className="font-serif text-lg">Regras recorrentes (recomendado)</CardTitle>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Defina uma vez: dias da semana, intervalo e intervalo de almoço. O sistema gera os slots sozinho.
            Use a lista abaixo só para exceções pontuais (um horário extra).
            <br />
            <span className="text-xs">
              Diferença de <strong>Bloqueios</strong>: regras/horários dizem quando a profissional <em>atende</em>;
              bloqueios tiram um dia ou horário específico (férias, encaixe, imprevisto).
            </span>
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" />
              Nova regra
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova regra de disponibilidade</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div>
                <Label>Profissional *</Label>
                <Select
                  value={form.professionalId}
                  onValueChange={(v) => setForm({ ...form, professionalId: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {professionals.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Dias da semana *</Label>
                <div className="flex flex-wrap gap-2">
                  {DAY_LABELS.map((d) => (
                    <Button
                      key={d.value}
                      type="button"
                      size="sm"
                      variant={form.days.includes(d.value) ? 'default' : 'outline'}
                      onClick={() => toggleDay(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Início</Label>
                  <Input
                    type="time"
                    value={form.start}
                    onChange={(e) => setForm({ ...form, start: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Fim</Label>
                  <Input
                    type="time"
                    value={form.end}
                    onChange={(e) => setForm({ ...form, end: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Intervalo dos slots</Label>
                <Select value={form.slot} onValueChange={(v) => setForm({ ...form, slot: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[15, 20, 30, 45, 60].map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} minutos</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="has-break"
                  checked={form.hasBreak}
                  onCheckedChange={(c) => setForm({ ...form, hasBreak: !!c })}
                />
                <Label htmlFor="has-break">Bloquear intervalo (almoço)</Label>
              </div>
              {form.hasBreak && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Início intervalo</Label>
                    <Input
                      type="time"
                      value={form.breakStart}
                      onChange={(e) => setForm({ ...form, breakStart: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Fim intervalo</Label>
                    <Input
                      type="time"
                      value={form.breakEnd}
                      onChange={(e) => setForm({ ...form, breakEnd: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={handleCreate}>Salvar regra</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : rules.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Nenhuma regra ainda. Cadastre uma para parar de adicionar horário por horário.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Slots</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">
                      {r.professionals?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.days_of_week
                        .map((d) => DAY_LABELS.find((x) => x.value === d)?.label || d)
                        .join(', ')}
                    </TableCell>
                    <TableCell className="text-sm">
                      {timeToInput(r.start_time)}–{timeToInput(r.end_time)}
                    </TableCell>
                    <TableCell className="text-sm">{r.slot_minutes} min</TableCell>
                    <TableCell className="text-sm">
                      {r.break_start
                        ? `${timeToInput(r.break_start)}–${timeToInput(r.break_end)}`
                        : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={r.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-muted'}
                      >
                        {r.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-1">
                      <Button variant="outline" size="sm" onClick={() => handleToggle(r)}>
                        {r.is_active ? 'Desativar' : 'Ativar'}
                      </Button>
                      <Button variant="outline" size="icon" className="text-destructive" onClick={() => handleDelete(r.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
