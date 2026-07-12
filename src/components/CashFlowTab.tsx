import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProfessionals } from '@/hooks/useAppointments';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Plus, Loader2, Pencil, Trash2, Download, TrendingUp, TrendingDown,
  Wallet, Clock, RefreshCw, WalletCards,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

type EntryType = 'income' | 'expense';
type SourceType = 'manual' | 'appointment' | 'appointment_balance';
type PeriodPreset = 'today' | 'week' | 'month' | 'last_month' | 'custom';

function sourceLabel(source: SourceType): string {
  if (source === 'appointment') return 'Automático';
  if (source === 'appointment_balance') return 'Manual — confirmado pela profissional';
  return 'Manual';
}

function isSystemEntry(source: SourceType): boolean {
  return source === 'appointment' || source === 'appointment_balance';
}

interface Category {
  id: string;
  name: string;
  entry_type: 'income' | 'expense' | 'both';
  is_system: boolean;
}

interface CashEntry {
  id: string;
  entry_type: EntryType;
  category_id: string;
  amount: number;
  entry_date: string;
  description: string | null;
  professional_id: string | null;
  source: SourceType;
  appointment_id: string | null;
  created_at: string;
  cash_flow_categories?: { name: string } | null;
  professionals?: { name: string } | null;
}

interface EntryForm {
  entry_type: EntryType;
  category_id: string;
  amount: string;
  entry_date: string;
  description: string;
  professional_id: string;
  new_category_name: string;
}

const emptyForm = (): EntryForm => ({
  entry_type: 'expense',
  category_id: '',
  amount: '',
  entry_date: format(new Date(), 'yyyy-MM-dd'),
  description: '',
  professional_id: 'none',
  new_category_name: '',
});

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDateBR(dateStr: string) {
  try {
    const [y, m, d] = dateStr.split('-');
    if (y && m && d) return `${d}/${m}/${y}`;
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

function getPeriodRange(preset: PeriodPreset, customFrom: string, customTo: string) {
  const today = new Date();
  switch (preset) {
    case 'today': {
      const d = format(today, 'yyyy-MM-dd');
      return { from: d, to: d };
    }
    case 'week':
      return {
        from: format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      };
    case 'month':
      return {
        from: format(startOfMonth(today), 'yyyy-MM-dd'),
        to: format(endOfMonth(today), 'yyyy-MM-dd'),
      };
    case 'last_month': {
      const last = subMonths(today, 1);
      return {
        from: format(startOfMonth(last), 'yyyy-MM-dd'),
        to: format(endOfMonth(last), 'yyyy-MM-dd'),
      };
    }
    case 'custom':
      return {
        from: customFrom || format(startOfMonth(today), 'yyyy-MM-dd'),
        to: customTo || format(endOfMonth(today), 'yyyy-MM-dd'),
      };
  }
}

const CashFlowTab = () => {
  const { professionals } = useProfessionals();
  const [entries, setEntries] = useState<CashEntry[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toReceive, setToReceive] = useState(0);

  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [customFrom, setCustomFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
  const [customTo, setCustomTo] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  const [typeFilter, setTypeFilter] = useState<'all' | EntryType>('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [professionalFilter, setProfessionalFilter] = useState('all');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CashEntry | null>(null);
  const [form, setForm] = useState<EntryForm>(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const range = useMemo(
    () => getPeriodRange(period, customFrom, customTo),
    [period, customFrom, customTo],
  );

  const loadCategories = useCallback(async () => {
    const { data, error } = await supabase
      .from('cash_flow_categories')
      .select('*')
      .order('name');

    if (error) {
      console.error(error);
      toast.error('Erro ao carregar categorias. Aplique a migration de fluxo de caixa no Supabase.');
      return;
    }
    setCategories((data as Category[]) || []);
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('cash_flow_entries')
        .select(`
          *,
          cash_flow_categories:category_id (name),
          professionals:professional_id (name)
        `)
        .gte('entry_date', range.from)
        .lte('entry_date', range.to)
        .order('entry_date', { ascending: false });

      if (typeFilter !== 'all') query = query.eq('entry_type', typeFilter);
      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter);
      if (professionalFilter !== 'all') query = query.eq('professional_id', professionalFilter);

      const { data, error } = await query;
      if (error) throw error;
      setEntries((data as CashEntry[]) || []);

      // A receber: restante de agendamentos não cancelados
      const { data: apts } = await supabase
        .from('appointments')
        .select('total_amount, amount_paid, status')
        .neq('status', 'cancelled');

      const pending = (apts || []).reduce((sum, a) => {
        const rest = Number(a.total_amount) - Number(a.amount_paid);
        return rest > 0 ? sum + rest : sum;
      }, 0);
      setToReceive(pending);
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? err.message : 'Erro ao carregar lançamentos';
      toast.error(msg);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [range.from, range.to, typeFilter, categoryFilter, professionalFilter]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const summary = useMemo(() => {
    const income = entries
      .filter((e) => e.entry_type === 'income')
      .reduce((s, e) => s + Number(e.amount), 0);
    const expense = entries
      .filter((e) => e.entry_type === 'expense')
      .reduce((s, e) => s + Number(e.amount), 0);
    return { income, expense, balance: income - expense };
  }, [entries]);

  // Gráfico usa os mesmos lançamentos filtrados da tabela
  const chartData = useMemo(() => {
    const fromDate = parseISO(range.from);
    const toDate = parseISO(range.to);
    const daySpan = Math.max(
      1,
      Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)) + 1,
    );
    const groupByMonth = daySpan > 45;

    const buckets = new Map<string, { label: string; entradas: number; saidas: number; sort: string }>();

    entries.forEach((e) => {
      const key = groupByMonth ? e.entry_date.slice(0, 7) : e.entry_date;
      const label = groupByMonth
        ? format(parseISO(`${key}-01`), 'MMM/yy', { locale: ptBR })
        : formatDateBR(e.entry_date);
      const current = buckets.get(key) || { label, entradas: 0, saidas: 0, sort: key };
      if (e.entry_type === 'income') current.entradas += Number(e.amount);
      else current.saidas += Number(e.amount);
      buckets.set(key, current);
    });

    return Array.from(buckets.values())
      .sort((a, b) => a.sort.localeCompare(b.sort))
      .map(({ label, entradas, saidas }) => ({ label, entradas, saidas }));
  }, [entries, range.from, range.to]);

  const chartTitle = useMemo(() => {
    if (range.from === range.to) return `Entradas × Saídas — ${formatDateBR(range.from)}`;
    return `Entradas × Saídas — ${formatDateBR(range.from)} a ${formatDateBR(range.to)}`;
  }, [range.from, range.to]);

  const filteredCategories = useMemo(
    () => categories.filter(
      (c) => c.entry_type === 'both' || c.entry_type === form.entry_type || c.name === 'Outro',
    ),
    [categories, form.entry_type],
  );

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (entry: CashEntry) => {
    if (isSystemEntry(entry.source)) {
      toast.error('Lançamentos automáticos não podem ser editados');
      return;
    }
    setEditing(entry);
    setForm({
      entry_type: entry.entry_type,
      category_id: entry.category_id,
      amount: String(entry.amount),
      entry_date: entry.entry_date,
      description: entry.description || '',
      professional_id: entry.professional_id || 'none',
      new_category_name: '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const amountNum = parseFloat(form.amount.replace(',', '.'));
    if (!amountNum || amountNum <= 0) {
      toast.error('Informe um valor maior que zero');
      return;
    }
    if (!form.entry_date) {
      toast.error('Informe a data');
      return;
    }

    setSaving(true);
    try {
      let categoryId = form.category_id;

      if (form.new_category_name.trim()) {
        const { data: created, error: catErr } = await supabase
          .from('cash_flow_categories')
          .insert({
            name: form.new_category_name.trim(),
            entry_type: form.entry_type,
            is_system: false,
          })
          .select()
          .single();

        if (catErr) {
          const existing = categories.find(
            (c) => c.name.toLowerCase() === form.new_category_name.trim().toLowerCase(),
          );
          if (existing) categoryId = existing.id;
          else throw catErr;
        } else {
          categoryId = created.id;
          await loadCategories();
        }
      }

      if (!categoryId) {
        toast.error('Selecione ou crie uma categoria');
        setSaving(false);
        return;
      }

      const payload = {
        entry_type: form.entry_type,
        category_id: categoryId,
        amount: amountNum,
        entry_date: form.entry_date,
        description: form.description.trim() || null,
        professional_id: form.professional_id === 'none' ? null : form.professional_id,
        source: 'manual' as const,
      };

      if (editing) {
        const { error } = await supabase
          .from('cash_flow_entries')
          .update(payload)
          .eq('id', editing.id);
        if (error) throw error;
        toast.success('Lançamento atualizado');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
          .from('cash_flow_entries')
          .insert({ ...payload, created_by: user?.id ?? null });
        if (error) throw error;
        toast.success('Lançamento adicionado');
      }

      setDialogOpen(false);
      setEditing(null);
      setForm(emptyForm());
      await loadEntries();
    } catch (err: unknown) {
      console.error(err);
      toast.error(err instanceof Error ? err.message : 'Erro ao salvar lançamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from('cash_flow_entries')
        .delete()
        .eq('id', deleteId);
      if (error) throw error;
      toast.success('Lançamento excluído');
      setDeleteId(null);
      await loadEntries();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Erro ao excluir');
    }
  };

  const exportCsv = () => {
    if (entries.length === 0) {
      toast.error('Nenhum lançamento para exportar');
      return;
    }
    const header = ['Data', 'Categoria', 'Descrição', 'Profissional', 'Tipo', 'Valor', 'Origem'];
    const rows = entries.map((e) => [
      formatDateBR(e.entry_date),
      e.cash_flow_categories?.name || '',
      (e.description || '').replace(/"/g, '""'),
      e.professionals?.name || '',
      e.entry_type === 'income' ? 'Entrada' : 'Saída',
      Number(e.amount).toFixed(2).replace('.', ','),
      sourceLabel(e.source),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${c}"`).join(';'))
      .join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caixa-charmeon-${range.from}_${range.to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV exportado');
  };

  return (
    <div className="space-y-6">
      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}><CardContent className="pt-6"><Skeleton className="h-16 w-full" /></CardContent></Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Entradas</p>
                    <p className="text-2xl font-semibold text-emerald-600">{formatBRL(summary.income)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-emerald-100 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saídas</p>
                    <p className="text-2xl font-semibold text-rose-600">{formatBRL(summary.expense)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center">
                    <TrendingDown className="h-5 w-5 text-rose-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Saldo</p>
                    <p className={`text-2xl font-semibold ${summary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatBRL(summary.balance)}
                    </p>
                  </div>
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${summary.balance >= 0 ? 'bg-emerald-100' : 'bg-rose-100'}`}>
                    <Wallet className={`h-5 w-5 ${summary.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">A receber</p>
                    <p className="text-2xl font-semibold text-amber-600">{formatBRL(toReceive)}</p>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="font-serif text-lg">{chartTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados no período/filtros selecionados
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip
                  formatter={(value: number) => formatBRL(value)}
                  contentStyle={{ borderRadius: 8 }}
                />
                <Legend />
                <Bar dataKey="entradas" name="Entradas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="saidas" name="Saídas" fill="#e11d48" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader className="flex flex-col gap-4">
          <div className="flex flex-row items-center justify-between flex-wrap gap-4">
            <CardTitle className="font-serif flex items-center gap-2">
              <WalletCards className="h-5 w-5 text-primary" />
              Fluxo de Caixa
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => loadEntries()} variant="outline" size="sm">
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar
              </Button>
              <Button onClick={exportCsv} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Lançamento
                  </Button>
                </DialogTrigger>
                <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editing ? 'Editar Lançamento' : 'Adicionar Lançamento'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-2">
                      <Label>Tipo *</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant={form.entry_type === 'income' ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => setForm({ ...form, entry_type: 'income', category_id: '' })}
                        >
                          Entrada
                        </Button>
                        <Button
                          type="button"
                          variant={form.entry_type === 'expense' ? 'default' : 'outline'}
                          className="flex-1"
                          onClick={() => setForm({ ...form, entry_type: 'expense', category_id: '' })}
                        >
                          Saída
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Categoria *</Label>
                      <Select
                        value={form.category_id || undefined}
                        onValueChange={(v) => setForm({ ...form, category_id: v, new_category_name: '' })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredCategories.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        placeholder="Ou digite uma nova categoria"
                        value={form.new_category_name}
                        onChange={(e) => setForm({ ...form, new_category_name: e.target.value, category_id: '' })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Valor (R$) *</Label>
                        <Input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={form.amount}
                          onChange={(e) => setForm({ ...form, amount: e.target.value })}
                          placeholder="0,00"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Data *</Label>
                        <Input
                          type="date"
                          value={form.entry_date}
                          onChange={(e) => setForm({ ...form, entry_date: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Profissional (opcional)</Label>
                      <Select
                        value={form.professional_id}
                        onValueChange={(v) => setForm({ ...form, professional_id: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Nenhum" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Nenhum</SelectItem>
                          {professionals.map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Descrição</Label>
                      <Textarea
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        placeholder="Opcional"
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Salvar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <Select value={period} onValueChange={(v: PeriodPreset) => setPeriod(v)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Esta semana</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
                <SelectItem value="last_month">Mês anterior</SelectItem>
                <SelectItem value="custom">Personalizado</SelectItem>
              </SelectContent>
            </Select>

            {period === 'custom' && (
              <>
                <Input type="date" className="w-[150px]" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
                <Input type="date" className="w-[150px]" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
              </>
            )}

            <Select value={typeFilter} onValueChange={(v: 'all' | EntryType) => setTypeFilter(v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="income">Entradas</SelectItem>
                <SelectItem value="expense">Saídas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas categorias</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Profissional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as profissionais</SelectItem>
                {professionals.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 space-y-4">
              <WalletCards className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <p className="text-muted-foreground">Nenhum lançamento neste período</p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Lançamento
              </Button>
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Profissional</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Origem</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell className="text-sm">{formatDateBR(e.entry_date)}</TableCell>
                        <TableCell className="text-sm">{e.cash_flow_categories?.name || '—'}</TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {e.description || '—'}
                        </TableCell>
                        <TableCell className="text-sm">{e.professionals?.name || '—'}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={
                              e.entry_type === 'income'
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-100'
                            }
                          >
                            {e.entry_type === 'income' ? 'Entrada' : 'Saída'}
                          </Badge>
                        </TableCell>
                        <TableCell className={`text-sm font-medium ${e.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {e.entry_type === 'income' ? '+' : '−'}{formatBRL(Number(e.amount))}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="max-w-[180px] whitespace-normal text-left">
                            {sourceLabel(e.source)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {e.source === 'manual' ? (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {entries.map((e) => (
                  <Card key={e.id} className="shadow-sm">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-sm">{e.cash_flow_categories?.name}</p>
                          <p className="text-xs text-muted-foreground">{formatDateBR(e.entry_date)}</p>
                        </div>
                        <Badge
                          className={
                            e.entry_type === 'income'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }
                        >
                          {e.entry_type === 'income' ? 'Entrada' : 'Saída'}
                        </Badge>
                      </div>
                      {e.description && (
                        <p className="text-sm text-muted-foreground">{e.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <p className={`font-semibold ${e.entry_type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatBRL(Number(e.amount))}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs max-w-[140px] whitespace-normal text-left">
                            {sourceLabel(e.source)}
                          </Badge>
                          {e.source === 'manual' && (
                            <>
                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(e.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Lançamentos automáticos de agendamento não podem ser excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CashFlowTab;
