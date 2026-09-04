import React, { useState, useMemo } from 'react';
import {
  FileText,
  FileDown,
  Printer,
  Calendar,
  Layers,
  Activity,
  Image as ImageIcon,
  Search,
  Sparkles,
  BarChart3,
  CheckCircle2
} from 'lucide-react';
import {
  format,
  parseISO,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  endOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { GeneralReportProps } from './reportsTypes';
import { GeneralReportSection } from './GeneralReportSection';
import { generateModernPDF } from '../../lib/pdfUtils';
import { generateModernWord } from '../../lib/wordUtils';
import { generateModernExcel } from '../../lib/excelUtils';
import { ROLE_LABELS } from '../../constants';
import { safeReplace } from '../../lib/utils';
import { Role } from '../../types';

export const ReportsSection: React.FC<GeneralReportProps> = (props) => {
  // Tab within Reports: 'general' (Relatório Geral) or 'periodic' (Relatórios Periódicos)
  const [activeSubTab, setActiveSubTab] = useState<'general' | 'periodic'>('general');

  // Periodic report generator states
  const [generating, setGenerating] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'semi-annually' | 'annually'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

  const evolutions = props.evolutions || [];
  const socialEvolutions = props.socialEvolutions || [];
  const psychEvolutions = props.psychEvolutions || [];
  const pedagogyEvolutions = props.pedagogyEvolutions || [];
  const physioEvolutions = props.physioEvolutions || [];
  const nursingEvolutions = props.nursingEvolutions || [];
  const pias = props.pias || [];
  const elderly = props.elderly || [];
  const showToast = props.showToast || ((msg: string) => console.log(msg));

  const unifiedEvolutions = useMemo(() => {
    const all: any[] = [
      ...evolutions.map(e => ({ ...e, id: `gen-${e.id}`, professionalRole: e.professionalRole, source: 'Geral' })),
      ...socialEvolutions.map(e => ({ ...e, id: `soc-${e.id}`, date: e.date, professionalRole: 'ASSISTENTE_SOCIAL', source: 'Social' })),
      ...psychEvolutions.map(e => ({ ...e, id: `psy-${e.id}`, date: e.date, professionalRole: 'PSICOLOGA', source: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, id: `ped-${e.id}`, date: e.date, professionalRole: 'PEDAGOGA', source: 'Pedagogia' })),
      ...physioEvolutions.map(e => ({ ...e, id: `phy-${e.id}`, date: e.date, professionalRole: 'FISIOTERAPEUTA', source: 'Fisioterapia' })),
      ...nursingEvolutions.map(e => ({ ...e, id: `nur-${e.id}`, date: e.date, professionalRole: 'ENFERMEIRA', source: 'Enfermagem' })),
    ];
    return all;
  }, [evolutions, socialEvolutions, psychEvolutions, pedagogyEvolutions, physioEvolutions, nursingEvolutions]);

  const filteredData = useMemo(() => {
    let start: Date;
    let end: Date;

    if (reportPeriod === 'daily') {
      start = parseISO(selectedDate);
      end = endOfDay(start);
    } else if (reportPeriod === 'weekly') {
      const base = parseISO(selectedDate);
      start = startOfWeek(base, { weekStartsOn: 0 });
      end = endOfWeek(base, { weekStartsOn: 0 });
    } else if (reportPeriod === 'monthly') {
      const base = parseISO(`${selectedMonth}-01`);
      start = startOfMonth(base);
      end = endOfMonth(base);
    } else if (reportPeriod === 'semi-annually') {
      const isSecondHalf = new Date().getMonth() >= 6;
      start = isSecondHalf ? parseISO(`${selectedYear}-07-01`) : parseISO(`${selectedYear}-01-01`);
      end = isSecondHalf ? endOfMonth(parseISO(`${selectedYear}-12-01`)) : endOfMonth(parseISO(`${selectedYear}-06-01`));
    } else {
      start = parseISO(`${selectedYear}-01-01`);
      end = endOfMonth(parseISO(`${selectedYear}-12-01`));
    }

    const filterFn = (dateStr?: string) => {
      if (!dateStr) return false;
      const d = parseISO(dateStr.slice(0, 10));
      return d >= start && d <= end;
    };

    return {
      evolutions: unifiedEvolutions.filter(ev => filterFn(ev.date)),
      pias: pias.filter(p => filterFn(p.date)),
      periodLabel: reportPeriod === 'daily' ? format(start, 'dd/MM/yyyy') : 
                   reportPeriod === 'weekly' ? `${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}` :
                   reportPeriod === 'monthly' ? format(start, 'MMMM yyyy', { locale: ptBR }) :
                   reportPeriod === 'semi-annually' ? `${start.getMonth() === 0 ? '1º' : '2º'} Semestre ${selectedYear}` :
                   selectedYear
    };
  }, [reportPeriod, selectedDate, selectedMonth, selectedYear, unifiedEvolutions, pias]);

  const getReportData = () => {
    const { evolutions: periodEvolutions, pias: periodPIAs } = filteredData;
    const roles = [...new Set(periodEvolutions.map(e => e.professionalRole))];
    const columns = ['Categoria', 'Informação'];
    const data = [
      ['RESUMO DAS AÇÕES', ''],
      ['Total de Idosos Atendidos', elderly.filter(e => e.status === 'ATIVO').length.toString()],
      ['Evoluções Registradas no Período', periodEvolutions.length.toString()],
      ['Novos PIAs/Revisões', periodPIAs.length.toString()],
      ['', ''],
      ['ATENDIMENTOS POR ÁREA', ''],
      ...roles.map(role => [
        ROLE_LABELS[role as Role] || role,
        `${periodEvolutions.filter(e => e.professionalRole === role).length} atendimentos`
      ])
    ];
    return { columns, data };
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      await generateModernPDF({
        title: 'Relatório OAMI',
        subtitle: `Período: ${periodLabel} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showToast('Erro ao gerar PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateWord = async () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      await generateModernWord({
        title: 'Relatório OAMI',
        subtitle: `Período: ${periodLabel} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório Word gerado com sucesso!');
    } catch (error) {
      console.error("Word Generation Error:", error);
      showToast('Erro ao gerar Word', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      generateModernExcel({
        title: 'Relatório OAMI',
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error("Excel Generation Error:", error);
      showToast('Erro ao gerar Excel', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div id="reports-main-hub" className="space-y-6">
      {/* Top Level Mode Selector (Relatório Geral vs Relatórios Periódicos) */}
      <div className="flex items-center gap-3 border-b border-gray-200 dark:border-gray-800 pb-3 print:hidden">
        <button
          id="tab-btn-general-report"
          onClick={() => setActiveSubTab('general')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs sm:text-sm transition-all relative ${
            activeSubTab === 'general'
              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/25'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <Sparkles size={16} className={activeSubTab === 'general' ? 'text-amber-300' : 'text-emerald-500'} />
          <span>Relatório Geral e Integrado</span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider bg-black/15 dark:bg-white/20 font-black">
            Todos os Lançamentos
          </span>
        </button>

        <button
          id="tab-btn-periodic-report"
          onClick={() => setActiveSubTab('periodic')}
          className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-xs sm:text-sm transition-all ${
            activeSubTab === 'periodic'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md'
              : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
          }`}
        >
          <BarChart3 size={16} />
          <span>Relatórios Periódicos (Doc/Word)</span>
        </button>
      </div>

      {/* 1. RELATÓRIO GERAL E INTEGRADO DO SISTEMA OAMI */}
      {activeSubTab === 'general' && (
        <GeneralReportSection {...props} />
      )}

      {/* 2. RELATÓRIOS PERIÓDICOS (ATENDIMENTOS E PIAs) */}
      {activeSubTab === 'periodic' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios Periódicos</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gere documentos executivos de atividades e atendimentos por período.</p>
              </div>
              <div className="flex flex-wrap gap-3 w-full md:w-auto">
                <select 
                  className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                  value={reportPeriod}
                  onChange={(e) => setReportPeriod(e.target.value as any)}
                >
                  <option value="daily">Diário</option>
                  <option value="weekly">Semanal</option>
                  <option value="monthly">Mensal</option>
                  <option value="semi-annually">Semestral</option>
                  <option value="annually">Anual</option>
                </select>

                {reportPeriod === 'daily' && (
                  <input 
                    type="date" 
                    className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                )}

                {reportPeriod === 'weekly' && (
                  <input 
                    type="date" 
                    className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                )}

                {reportPeriod === 'monthly' && (
                  <input 
                    type="month" 
                    className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                  />
                )}

                {(reportPeriod === 'semi-annually' || reportPeriod === 'annually') && (
                  <select 
                    className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(e.target.value)}
                  >
                    {[2023, 2024, 2025, 2026, 2027].map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={generateWord}
                    disabled={generating}
                    className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Exportar Word (Docx)"
                  >
                    <FileDown size={18} /> Word
                  </button>
                  <button 
                    onClick={generateExcel}
                    disabled={generating}
                    className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Exportar Excel"
                  >
                    <FileDown size={18} /> Excel
                  </button>
                  <button 
                    onClick={generatePDF}
                    disabled={generating}
                    className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                    title="Exportar PDF"
                  >
                    <FileDown size={18} /> PDF
                  </button>
                  <button 
                    onClick={() => window.print()}
                    className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                    title="Imprimir Relatório"
                  >
                    <Printer size={18} /> Imprimir
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
                <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
                  <Activity size={20} />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-1">Ações Técnicas</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Resumo de todas as evoluções e atendimentos do período: <span className="font-bold text-green-600">{filteredData.periodLabel}</span>.</p>
              </div>
              <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
                  <ImageIcon size={20} />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-1">Galeria de Fotos</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">Inclusão automática das fotos registradas no período.</p>
              </div>
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
                <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 mb-4">
                  <Search size={20} />
                </div>
                <h4 className="font-bold text-gray-800 dark:text-white mb-1">Dados Consolidados</h4>
                <div className="text-[10px] space-y-1 text-gray-500 mt-2">
                  <p>• Evoluções: {filteredData.evolutions.length}</p>
                  <p>• Atendimentos: {filteredData.evolutions.length}</p>
                  <p>• PIAs no período: {filteredData.pias.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
export default ReportsSection;
