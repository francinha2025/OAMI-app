import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, Users, Check, X } from 'lucide-react';

interface MultiPatientSelectorProps {
  patients: { id: string; name: string }[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  singleValue?: string;
  onSingleChange?: (id: string) => void;
  isMulti: boolean;
  onToggleMulti: (multi: boolean) => void;
  accentColor?: 'green' | 'blue' | 'purple' | 'pink' | 'violet' | 'emerald';
  label?: string;
}

export const MultiPatientSelector: React.FC<MultiPatientSelectorProps> = ({
  patients = [],
  selectedIds = [],
  onChange,
  singleValue = '',
  onSingleChange,
  isMulti,
  onToggleMulti,
  accentColor = 'green',
  label = 'Idoso(s)'
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Styles maps
  const colorClasses = {
    green: {
      ring: 'focus:ring-green-500',
      text: 'text-green-600 dark:text-green-400',
      bgSelected: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50',
      badge: 'bg-green-500 text-white',
      btn: 'bg-green-600 hover:bg-green-700 text-white'
    },
    blue: {
      ring: 'focus:ring-blue-500',
      text: 'text-blue-600 dark:text-blue-400',
      bgSelected: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800/50',
      badge: 'bg-blue-500 text-white',
      btn: 'bg-blue-600 hover:bg-blue-700 text-white'
    },
    purple: {
      ring: 'focus:ring-purple-500',
      text: 'text-purple-600 dark:text-purple-400',
      bgSelected: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800/50',
      badge: 'bg-purple-500 text-white',
      btn: 'bg-purple-600 hover:bg-purple-700 text-white'
    },
    pink: {
      ring: 'focus:ring-pink-500',
      text: 'text-pink-600 dark:text-pink-400',
      bgSelected: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800/50',
      badge: 'bg-pink-500 text-white',
      btn: 'bg-pink-600 hover:bg-pink-700 text-white'
    },
    violet: {
      ring: 'focus:ring-violet-500',
      text: 'text-violet-600 dark:text-violet-400',
      bgSelected: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50',
      badge: 'bg-violet-500 text-white',
      btn: 'bg-violet-600 hover:bg-violet-700 text-white'
    },
    emerald: {
      ring: 'focus:ring-emerald-500',
      text: 'text-emerald-600 dark:text-emerald-400',
      bgSelected: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50',
      badge: 'bg-emerald-500 text-white',
      btn: 'bg-emerald-600 hover:bg-emerald-700 text-white'
    }
  }[accentColor] || {
    ring: 'focus:ring-indigo-500',
    text: 'text-indigo-600',
    bgSelected: 'bg-indigo-50 border-indigo-200',
    badge: 'bg-indigo-500 text-white',
    btn: 'bg-indigo-600 hover:bg-indigo-700 text-white'
  };

  const filteredPatients = useMemo(() => {
    return patients.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [patients, searchTerm]);

  const handleToggleSelectAll = () => {
    if (selectedIds.length === patients.length) {
      onChange([]);
    } else {
      onChange(patients.map(p => p.id));
    }
  };

  const handleSelectOne = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(selectedId => selectedId !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-3 bg-gray-50/50 dark:bg-gray-850 p-4 border border-gray-100 dark:border-gray-800/80 rounded-2xl animate-fade-in" id="multi-patient-selector-container">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
          <Users size={14} className={colorClasses.text} /> {label}
        </label>
        
        <button
          type="button"
          onClick={() => {
            onToggleMulti(!isMulti);
          }}
          className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border transition-all ${
            isMulti 
              ? `${colorClasses.btn} border-transparent` 
              : 'border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
          }`}
        >
          {isMulti ? '✓ Selecionar Múltiplos Ativado' : 'Selecionar Múltiplos / Todos'}
        </button>
      </div>

      {!isMulti ? (
        <select 
          value={singleValue}
          onChange={e => {
            const val = e.target.value;
            if (onSingleChange) onSingleChange(val);
            onChange(val ? [val] : []);
          }}
          className={`w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 ${colorClasses.ring} transition-all text-gray-800 dark:text-white font-bold text-sm`}
        >
          <option value="">Selecione o Idoso...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      ) : (
        <div className="space-y-3 animate-fade-in" id="multi-patient-checkbox-list">
          {/* Controls: Search & Select All */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-4 top-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Pesquisar idoso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 sm:py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl outline-none text-xs sm:text-sm font-medium transition-all focus:border-gray-300 dark:focus:border-gray-600"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-4 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleToggleSelectAll}
                className="flex-1 sm:flex-initial px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl border border-transparent flex items-center justify-center gap-1.5 transition-all"
              >
                <CheckSquare size={13} className={colorClasses.text} />
                {selectedIds.length === patients.length ? 'Desmarcar Todos' : 'Selecionar Todos'}
              </button>
            </div>
          </div>

          {/* Counters */}
          <div className="flex justify-between items-center text-[10px] sm:text-xs">
            <span className="text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">
              Filtrados: {filteredPatients.length} de {patients.length}
            </span>
            <span className={`px-2 py-0.5 rounded-full font-black uppercase text-[9px] sm:text-[10px] ${colorClasses.badge}`}>
              {selectedIds.length} selecionado(s)
            </span>
          </div>

          {/* Checkbox Grid */}
          <div className="max-h-56 overflow-y-auto border border-gray-100 dark:border-gray-800 rounded-xl bg-white dark:bg-gray-900 grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
            {filteredPatients.length > 0 ? (
              filteredPatients.map(p => {
                const isSelected = selectedIds.includes(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectOne(p.id)}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected 
                        ? `${colorClasses.bgSelected} border-solid font-black text-gray-900 dark:text-white`
                        : 'border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium'
                    }`}
                  >
                    <div className="shrink-0">
                      {isSelected ? (
                        <div className={`w-4.5 h-4.5 rounded-md flex items-center justify-center ${colorClasses.badge}`}>
                          <Check size={11} strokeWidth={3} />
                        </div>
                      ) : (
                        <div className="w-4.5 h-4.5 rounded-md border border-gray-300 dark:border-gray-600 bg-transparent"></div>
                      )}
                    </div>
                    <span className="truncate">{p.name}</span>
                  </button>
                );
              })
            ) : (
              <div className="col-span-full py-6 text-center text-gray-400 text-xs italic">
                Nenhum idoso encontrado com essa busca.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
