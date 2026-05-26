import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, 
  Award, 
  Activity, 
  ClipboardList, 
  Trash2, 
  Edit2, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Filter,
  Eye,
  TrendingUp,
  Clock,
  Briefcase,
  Layers,
  Users2,
  AlertCircle,
  Bell,
  Trash
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { 
  User, 
  Professional, 
  Role,
  NursingEvolution, 
  PhysioEvolution, 
  PsychEvolution, 
  PedagogyEvolution, 
  SocialEvolution, 
  NutritionEvolution, 
  Workshop,
  AppNotification,
  Elderly
} from '../types';
import { db } from '../firebase';
import { doc, getDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

interface ProductivitySectionProps {
  user: User;
  professionals: Professional[];
  nursingEvolutions: NursingEvolution[];
  physioEvolutions: PhysioEvolution[];
  psychEvolutions: PsychEvolution[];
  pedagogyEvolutions: PedagogyEvolution[];
  socialEvolutions: SocialEvolution[];
  nutritionEvolutions: NutritionEvolution[];
  workshops: Workshop[];
  notifications: AppNotification[];
  elderly: Elderly[];
  onDeleteNotification: (id: string, e: React.MouseEvent) => void;
  onSaveEvolution: (collectionName: string, id: string, updatedData: any) => Promise<void>;
  onDeleteEvolution: (collectionName: string, id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  targetSector?: string;
  targetRole?: Role;
  psychActivities?: any[];
  pedagogyActivities?: any[];
  onViewActivity?: (activity: any) => void;
}

export const ProductivitySection = ({
  user,
  professionals = [],
  nursingEvolutions = [],
  physioEvolutions = [],
  psychEvolutions = [],
  pedagogyEvolutions = [],
  socialEvolutions = [],
  nutritionEvolutions = [],
  workshops = [],
  notifications = [],
  elderly = [],
  onDeleteNotification,
  onSaveEvolution,
  onDeleteEvolution,
  showToast,
  targetSector,
  targetRole,
  psychActivities = [],
  pedagogyActivities = [],
  onViewActivity
}: ProductivitySectionProps) => {

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editConduct, setEditConduct] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // 1. Resolve logged in professional clinical record
  const activeProf = useMemo(() => {
    // Determine target sector context
    const currentSector = targetSector || (
      user?.role === 'FISIOTERAPEUTA' ? 'Fisioterapia' :
      user?.role === 'ENFERMEIRA' ? 'Enfermagem' :
      user?.role === 'PSICOLOGA' ? 'Psicologia' :
      user?.role === 'PEDAGOGA' ? 'Pedagogia' :
      user?.role === 'ASSISTENTE_SOCIAL' ? 'Serviço Social' :
      user?.role === 'NUTRICIONISTA' ? 'Nutrição' : 'Geral'
    );
    const currentRole = targetRole || user?.role;

    // Check if the authenticated user matches this specific sector/role professional profile
    let found = professionals.find(p => 
      (p.role === currentRole || p.sector?.toLowerCase() === currentSector?.toLowerCase()) &&
      (user?.email && p.email && p.email.toLowerCase() === user.email.toLowerCase())
    );

    // If not found and user has Coordinator/Admin rights, load ANY professional of this sector/role (representing the sector view)
    if (!found && (user?.role === 'COORDENADORA' || user?.role === 'PRESIDENTE' || user?.role === 'AUXILIAR_ADMINISTRATIVO' || user?.email?.toLowerCase() === 'franciaraeabreucoelho@gmail.com')) {
      found = professionals.find(p => 
        p.role === currentRole || 
        p.sector?.toLowerCase() === currentSector?.toLowerCase()
      );
    }

    // Default lookup by email/name if still not resolved
    if (!found) {
      found = professionals.find(p => 
        (user?.email && p.email && p.email.toLowerCase() === user.email.toLowerCase()) ||
        (user?.name && p.name && p.name.toLowerCase() === user.name.toLowerCase()) ||
        (user?.id && p.id && p.id.toLowerCase() === user.id.toLowerCase())
      );
    }

    // Return the professional record, guaranteeing essential properties from Rule #1
    const finalProf = found ? {
      ...found,
      uid: found.uid || found.id || user?.id || 'uid-unknown',
      setor: found.sector || currentSector,
      permissões: found.permissions || ['Acesso Clínico'],
      cargo: found.role || currentRole,
      perfil: (found as any).perfil || found.role || currentRole,
    } : {
      id: 'p-' + (currentRole?.toLowerCase() || 'custom'),
      uid: user?.id || 'uid-dynamic',
      name: user?.name && user?.role === currentRole ? user.name : `Profissional ${currentSector}`,
      role: currentRole || 'COORDENADORA',
      cargo: currentRole || 'COORDENADORA',
      sector: currentSector,
      setor: currentSector,
      photoUrl: user?.photoUrl || '',
      permissions: ['Acesso Clínico', 'Evoluções Conjuntas'],
      permissões: ['Acesso Clínico', 'Evoluções Conjuntas'],
      perfil: currentSector,
      registrationNumber: 'REG-DYNAMIC',
      phone: '(11) 99999-0000',
      email: user?.email || `${currentRole?.toLowerCase()}@oami.org.br`,
      address: 'Sede Principal OAMI',
      admissionDate: new Date().toISOString(),
      status: 'ATIVO' as const,
      createdAt: new Date().toISOString()
    };

    return finalProf;
  }, [professionals, user, targetSector, targetRole]);

  // 2. Compute live Participation History and Productivity indexes
  const participationHistory = useMemo(() => {
    const list: any[] = [];
    
    const isAssociated = (creatorIdOrName: string | undefined | null, coWorkers: string[] | undefined | null) => {
      const lowerCW = (coWorkers || []).map(cw => String(cw).trim().toLowerCase());
      const lowerProfName = String(activeProf.name || '').trim().toLowerCase();
      const lowerProfEmail = String(activeProf.email || '').trim().toLowerCase();
      const lowerProfId = String(activeProf.id || '').trim().toLowerCase();
      const lowerProfUid = String((activeProf as any).uid || '').trim().toLowerCase();
      
      const isCreator = creatorIdOrName && (
        String(creatorIdOrName).toLowerCase() === lowerProfId ||
        String(creatorIdOrName).toLowerCase() === lowerProfUid ||
        String(creatorIdOrName).toLowerCase() === lowerProfName ||
        String(creatorIdOrName).toLowerCase() === lowerProfEmail ||
        String(user.name).toLowerCase() === String(creatorIdOrName).toLowerCase() ||
        String(user.id).toLowerCase() === String(creatorIdOrName).toLowerCase()
      );
      
      const isTagged = lowerCW.includes(lowerProfId) || 
                       lowerCW.includes(lowerProfUid) || 
                       lowerCW.includes(lowerProfName) || 
                       lowerCW.includes(lowerProfEmail);
                       
      return { isCreator, isTagged };
    };

    // Gather from nursingEvolutions
    (nursingEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy, e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Enfermagem`,
          type: 'EVOLUÇÃO',
          sector: 'Enfermagem',
          date: e.date,
          content: e.content || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy,
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'nursingEvolutions'
        });
      }
    });

    // Gather from physioEvolutions
    (physioEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy || 'Fisioterapeuta', e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Fisioterapia`,
          type: 'EVOLUÇÃO',
          sector: 'Fisioterapia',
          date: e.date,
          content: e.evolution || e.procedures || '',
          conduct: e.observations || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy || 'Fisioterapeuta',
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'physioEvolutions'
        });
      }
    });

    // Gather from psychEvolutions
    (psychEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy, e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Psicologia`,
          type: 'EVOLUÇÃO',
          sector: 'Psicologia',
          date: e.date,
          content: e.observation || '',
          conduct: e.intervention || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy,
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'psychEvolutions'
        });
      }
    });

    // Gather from pedagogyEvolutions
    (pedagogyEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy, e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Pedagogia (${e.activityTitle || 'Atividade'})`,
          type: 'EVOLUÇÃO',
          sector: 'Pedagogia',
          date: e.date,
          content: e.response || '',
          conduct: e.observations || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy,
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'pedagogyEvolutions'
        });
      }
    });

    // Gather from socialEvolutions
    (socialEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy, e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Serviço Social (${e.serviceType || 'Atendimento'})`,
          type: 'EVOLUÇÃO',
          sector: 'Serviço Social',
          date: e.date,
          content: e.observation || '',
          conduct: e.conduct || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy,
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'socialEvolutions'
        });
      }
    });

    // Gather from nutritionEvolutions
    (nutritionEvolutions || []).forEach(e => {
      const { isCreator, isTagged } = isAssociated(e.registeredBy, e.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: e.id,
          title: `Evolução de Nutrição`,
          type: 'EVOLUÇÃO',
          sector: 'Nutrição',
          date: e.date,
          content: e.observations || '',
          conduct: e.conduct || '',
          patientId: e.patientId,
          isCreator,
          isTagged,
          creatorIdOrName: e.registeredBy,
          coWorkers: e.coWorkers || [],
          raw: e,
          collectionName: 'nutritionEvolutions'
        });
      }
    });

    // Gather from workshops
    (workshops || []).forEach(w => {
      const { isCreator, isTagged } = isAssociated(w.registeredBy || '', w.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: w.id,
          title: `Oficina: ${w.title}`,
          type: 'OFICINA',
          sector: 'Oficinas',
          date: w.date,
          content: w.description || '',
          isCreator,
          isTagged,
          creatorIdOrName: w.registeredBy || '',
          coWorkers: w.coWorkers || [],
          raw: w,
          collectionName: 'workshops'
        });
      }
    });

    // Gather from psychActivities
    (psychActivities || []).forEach(a => {
      const { isCreator, isTagged } = isAssociated(a.registeredBy, a.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: a.id,
          title: `Atividade Prática: ${a.title}`,
          type: 'ATIVIDADE',
          sector: 'Psicologia',
          date: a.date,
          content: a.description || '',
          isCreator,
          isTagged,
          creatorIdOrName: a.registeredBy,
          coWorkers: a.coWorkers || [],
          raw: a,
          collectionName: 'psychActivities'
        });
      }
    });

    // Gather from pedagogyActivities
    (pedagogyActivities || []).forEach(a => {
      const { isCreator, isTagged } = isAssociated(a.registeredBy, a.coWorkers);
      if (isCreator || isTagged) {
        list.push({
          id: a.id,
          title: `Atividade Pedagógica: ${a.title}`,
          type: 'ATIVIDADE',
          sector: 'Pedagogia',
          date: a.date,
          content: a.description || '',
          isCreator,
          isTagged,
          creatorIdOrName: a.registeredBy,
          coWorkers: a.coWorkers || [],
          raw: a,
          collectionName: 'pedagogyActivities'
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [activeProf, user, nursingEvolutions, physioEvolutions, psychEvolutions, pedagogyEvolutions, socialEvolutions, nutritionEvolutions, workshops, psychActivities, pedagogyActivities]);

  // Productivity Metrics
  const productivityStats = useMemo(() => {
    const list = participationHistory;
    const created = list.filter(a => a.isCreator).length;
    const collaborated = list.filter(a => a.isTagged).length;
    const workshopsCount = list.filter(a => a.type === 'OFICINA').length;
    const total = list.length;
    
    // Collaboration percentage
    const colabIndex = total > 0 ? Math.round((collaborated / total) * 100) : 0;

    return {
      total,
      created,
      collaborated,
      workshopsCount,
      colabIndex
    };
  }, [participationHistory]);

  // Filter & Search participation history
  const filteredHistory = useMemo(() => {
    return participationHistory.filter(act => {
      // Search
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        act.title.toLowerCase().includes(searchLower) ||
        act.content.toLowerCase().includes(searchLower) ||
        (act.conduct || '').toLowerCase().includes(searchLower) ||
        (elderly.find(el => el.id === act.patientId)?.name || '').toLowerCase().includes(searchLower);

      // Tab/Type filter
      if (typeFilter === 'ALL') return matchesSearch;
      if (typeFilter === 'CREATOR') return matchesSearch && act.isCreator;
      if (typeFilter === 'COLLABORATOR') return matchesSearch && act.isTagged;
      if (typeFilter === 'OFICINA') return matchesSearch && act.type === 'OFICINA';
      return matchesSearch && act.type === typeFilter;
    });
  }, [participationHistory, searchTerm, typeFilter, elderly]);

  const handleEditClick = (act: any) => {
    setSelectedActivity(act);
    setEditContent(act.content);
    setEditConduct(act.conduct || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedActivity) return;
    setSavingEdit(true);
    try {
      // Modify raw data based on collection schema
      const updatedFields: any = {};
      const colName = selectedActivity.collectionName;
      
      if (colName === 'nursingEvolutions') {
        updatedFields.content = editContent;
      } else if (colName === 'physioEvolutions') {
        updatedFields.evolution = editContent;
        updatedFields.observations = editConduct;
      } else if (colName === 'psychEvolutions') {
        updatedFields.observation = editContent;
        updatedFields.intervention = editConduct;
      } else if (colName === 'pedagogyEvolutions') {
        updatedFields.response = editContent;
        updatedFields.observations = editConduct;
      } else if (colName === 'socialEvolutions') {
        updatedFields.observation = editContent;
        updatedFields.conduct = editConduct;
      } else if (colName === 'nutritionEvolutions') {
        updatedFields.observations = editContent;
        updatedFields.conduct = editConduct;
      } else if (colName === 'workshops') {
        updatedFields.description = editContent;
      } else if (colName === 'psychActivities' || colName === 'pedagogyActivities') {
        updatedFields.description = editContent;
      }

      await onSaveEvolution(colName, selectedActivity.id, updatedFields);
      showToast('Atividade atualizada com sucesso em tempo real!');
      setIsEditModalOpen(false);
      setSelectedActivity(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao atualizar atividade.', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteClick = (act: any) => {
    if (window.confirm(`Tem certeza que deseja excluir esta atividade de ${act.sector}? Esta ação propagará a remoção para todos os profissionais colaboradores.`)) {
      setSavingEdit(true);
      onDeleteEvolution(act.collectionName, act.id)
        .then(() => {
          showToast('Atividade excluída com sucesso em tempo real!');
          setSelectedActivity(null);
        })
        .catch(() => showToast('Erro ao excluir atividade', 'error'))
        .finally(() => setSavingEdit(false));
    }
  };

  return (
    <div className="space-y-8">
      {/* 1. Header & Professional Profile Card */}
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-6 md:p-8 border border-gray-100 dark:border-gray-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-green-50 dark:bg-green-950/40 rounded-3xl flex items-center justify-center text-green-600 border border-green-100 dark:border-green-900 overflow-hidden shadow-inner shrink-0">
              {activeProf.photoUrl ? (
                <img src={activeProf.photoUrl} alt={activeProf.name} className="w-full h-full object-cover animate-in fade-in duration-300" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon size={40} className="stroke-1 text-green-600 dark:text-green-400" />
              )}
            </div>
            
            <div className="space-y-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white capitalize tracking-tight leading-none">{activeProf.name}</h2>
                <span className="text-[10px] font-black bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full uppercase">
                  Cargo: {ROLE_LABELS[activeProf.role as any] || activeProf.role || activeProf.cargo}
                </span>
                <span className="text-[10px] font-black bg-green-50 dark:bg-green-900/40 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full uppercase">
                  Setor: {activeProf.setor || activeProf.sector || 'Clínico'}
                </span>
              </div>
              
              <p className="text-xs text-gray-500 font-bold font-mono">
                CRESS/COREN/CREFITO: {activeProf.registrationNumber} • Perfil do Usuário: <span className="text-blue-600 dark:text-blue-400">{activeProf.perfil || 'Não Definido'}</span>
              </p>
              
              <div className="flex flex-wrap gap-2 pt-2">
                <span className="text-[9px] font-black tracking-widest text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400 uppercase px-2 py-1 rounded-lg">
                  Permissões:
                </span>
                {(activeProf.permissões || activeProf.permissions || ['Acesso Geral']).map((permission, i) => (
                  <span key={i} className="text-[9px] font-black tracking-widest text-gray-400 uppercase border border-gray-150 dark:border-gray-800 px-2 py-1 rounded-lg">
                    {permission}
                  </span>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col text-right items-start lg:items-end shrink-0">
            <span className="text-[10px] uppercase font-black text-gray-450 dark:text-gray-500 tracking-wider">Identificador Único (UID)</span>
            <span className="text-xs font-black font-mono text-green-600 dark:text-green-400 mt-1 select-all">{activeProf.uid || activeProf.id}</span>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Membro desde: {format(parseISO(activeProf.admissionDate || new Date().toISOString()), 'dd/MM/yyyy')}</p>
          </div>
        </div>
      </div>

      {/* 2. Productivity Individual Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-150 dark:border-gray-800 flex items-center gap-4 group">
          <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
            <TrendingUp size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest">Ações Totais</p>
            <h4 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{productivityStats.total}</h4>
            <p className="text-[9px] text-gray-400 font-bold">Participação consolidada</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-150 dark:border-gray-800 flex items-center gap-4 group animate-in zoom-in-50 duration-300">
          <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
            <CheckCircle2 size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest">Responsável Direto</p>
            <h4 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{productivityStats.created}</h4>
            <p className="text-[9px] text-gray-400 font-bold">Atividades criadas</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-150 dark:border-gray-800 flex items-center gap-4 group">
          <div className="w-12 h-12 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
            <Users2 size={24} />
          </div>
          <div className="text-left">
            <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest">Colaborador Convidado</p>
            <h4 className="text-2xl font-black text-gray-800 dark:text-white mt-1">{productivityStats.collaborated}</h4>
            <p className="text-[9px] text-gray-400 font-bold">Tagged in co-workers</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-150 dark:border-gray-800 flex items-center gap-4 group">
          <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl flex items-center justify-center transition-all group-hover:scale-105">
            <Clock size={24} />
          </div>
          <div className="text-left w-full">
            <div className="flex justify-between items-center pr-2">
              <p className="text-[10px] font-black text-gray-450 dark:text-gray-500 uppercase tracking-widest">Índice Colaborativo</p>
              <span className="text-xs font-black text-orange-600 dark:text-orange-400">{productivityStats.colabIndex}%</span>
            </div>
            
            <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full mt-2 overflow-hidden shadow-inner flex">
              <div 
                className="bg-orange-500 h-full rounded-full transition-all duration-1000 origin-left"
                style={{ width: `${productivityStats.colabIndex}%` }}
              />
            </div>
            <p className="text-[9px] text-gray-400 font-bold mt-1">Interações multidisciplinares</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* 3. Real-time Participation History List Panel (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 flex flex-col space-y-6 shadow-sm">
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-6">
              <div className="text-left">
                <h3 className="text-lg font-black text-gray-800 dark:text-white">Histórico de Participações</h3>
                <p className="text-xs text-gray-400">Atividades compartilhadas em que você participou ou colaborou</p>
              </div>
              
              <div className="flex flex-wrap md:flex-nowrap gap-2 w-full md:w-auto">
                {/* Search */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl max-w-full md:max-w-xs text-xs">
                  <Search size={14} className="text-gray-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar idoso, conteúdo..." 
                    className="bg-transparent border-none outline-none font-bold text-gray-800 dark:text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                {/* Mode Filter */}
                <select 
                  className="px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-xl border-none outline-none text-xs font-bold text-gray-600 dark:text-white"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                >
                  <option value="ALL">Mostrar Todas</option>
                  <option value="CREATOR">Como Autor (Criador)</option>
                  <option value="COLLABORATOR">Como Colaborador</option>
                  <option value="OFICINA">Oficinas / Atividades</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              {filteredHistory.length > 0 ? (
                filteredHistory.map((act) => {
                  const patient = elderly.find(e => e.id === act.patientId);
                  return (
                    <motion.div 
                      key={act.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-gray-50/50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800 flex justify-between items-start gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/80 transition-all group"
                    >
                      <div className="space-y-2 text-left min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded">
                            {act.sector}
                          </span>
                          
                          {act.isCreator ? (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded">
                              Responsável Direto
                            </span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-wider bg-purple-500/10 text-purple-600 dark:text-purple-400 px-2 py-0.5 rounded flex items-center gap-1">
                              <Users2 size={9} /> Colaborador
                            </span>
                          )}

                          <span className="text-[10px] font-medium text-gray-400 flex items-center gap-1 ml-auto">
                            <Calendar size={10} />
                            {format(parseISO(act.date), "dd/MM/yyyy")}
                          </span>
                        </div>
                        
                        <h4 className="text-sm font-black text-gray-800 dark:text-white leading-tight">
                          {act.title}
                        </h4>
                        
                        {patient && (
                          <div className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-bold">
                            <UserIcon size={12} />
                            Paciente: {patient.name}
                          </div>
                        )}
                        
                        <p className="text-xs text-gray-650 dark:text-gray-300 line-clamp-3 bg-white dark:bg-gray-900/50 p-3 rounded-xl border border-gray-100 dark:border-gray-800 font-medium">
                          {act.content}
                        </p>

                        {act.conduct && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-450 italic mt-1 font-medium">
                            <strong>Conduta:</strong> {act.conduct}
                          </p>
                        )}

                        <div className="flex flex-col gap-1 border-t border-gray-100 dark:border-gray-800/60 pt-2 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <div>
                            <span className="font-bold text-gray-405 dark:text-gray-500">Quem Criou:</span>{' '}
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                              {(() => {
                                const creator = act.creatorIdOrName || '';
                                const matched = professionals.find(p => 
                                  p.id === creator || 
                                  p.email?.toLowerCase() === creator.toLowerCase() ||
                                  p.name?.toLowerCase() === creator.toLowerCase()
                                );
                                return matched ? matched.name : creator;
                              })()}
                            </span>
                          </div>
                          {act.coWorkers && act.coWorkers.length > 0 && (
                            <div>
                              <span className="font-bold text-gray-455 dark:text-gray-500">Colaboradores de {act.sector}:</span>{' '}
                              <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {act.coWorkers.map((cwId: string) => {
                                  const matched = professionals.find(p => 
                                    p.id === cwId || 
                                    p.email?.toLowerCase() === cwId.toLowerCase() ||
                                    p.name?.toLowerCase() === cwId.toLowerCase()
                                  );
                                  return matched ? matched.name : cwId;
                                }).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1.5 self-center shrink-0">
                        <button 
                          onClick={() => {
                            if (onViewActivity) {
                              onViewActivity({
                                id: act.id,
                                type: act.type,
                                title: act.title,
                                date: act.date,
                                isCreator: act.isCreator,
                                sector: act.sector,
                                coWorkers: act.coWorkers || [],
                                registeredBy: act.creatorIdOrName,
                                rawItem: act.raw || act
                              });
                            }
                          }}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-black rounded-xl border border-green-200/50 dark:border-green-800/50 transition-all active:scale-95 shadow-sm"
                          title="Visualizar evolução completa"
                        >
                          <Eye size={13} className="shrink-0" />
                          <span className="hidden sm:inline">Visualizar</span>
                        </button>

                        {act.isCreator && (
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity max-sm:opacity-100">
                            <button 
                              onClick={() => handleEditClick(act)}
                              className="p-2 bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors"
                              title="Editar Atividade"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button 
                              onClick={() => handleDeleteClick(act)}
                              className="p-2 bg-white dark:bg-gray-800 text-gray-650 dark:text-gray-400 hover:text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl border border-gray-100 dark:border-gray-700 transition-colors"
                              title="Excluir Atividade"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })
              ) : (
                <div className="text-center py-20 bg-gray-50/50 dark:bg-gray-850 rounded-3xl border border-dashed border-gray-150 dark:border-gray-800">
                  <ClipboardList className="mx-auto text-gray-300 dark:text-gray-750 mb-3" size={40} />
                  <p className="text-sm font-bold text-gray-400">Nenhum registro de participação encontrado.</p>
                  <p className="text-xs text-gray-400/80 mt-1">Busque por outro termo ou cadastre ações técnicas.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4. Real-time Notification Manager with Delete Panel (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-[2.5rem] border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col space-y-6">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-800 pb-6">
              <div className="text-left">
                <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <Bell size={18} className="text-orange-500" />
                  Notificações Ativas
                </h3>
                <p className="text-xs text-gray-400">Suas notificações de colaboração em tempo real</p>
              </div>
            </div>

            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <motion.div 
                    key={n.id}
                    layout
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 rounded-2xl border text-left relative flex justify-between items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${!n.read ? 'bg-orange-50/30 dark:bg-orange-500/10 border-orange-200 dark:border-orange-950/40' : 'bg-gray-50/50 dark:bg-gray-850 border-gray-100 dark:border-gray-800'}`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0" />
                        <p className="text-xs font-black text-gray-800 dark:text-white leading-tight truncate">{n.title}</p>
                      </div>
                      <p className="text-[10px] text-gray-555 dark:text-gray-400 leading-snug line-clamp-3">{n.message}</p>
                      <p className="text-[8px] text-gray-400 font-bold uppercase tracking-wider">{format(parseISO(n.date), "HH:mm '•' dd/MM")}</p>
                    </div>

                    <button 
                      onClick={(e) => onDeleteNotification(n.id, e)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/45 shrink-0 self-start transition-colors"
                      title="Excluir Notificação"
                    >
                      <Trash size={12} />
                    </button>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-16">
                  <CheckCircle2 className="mx-auto text-green-400 mb-2 stroke-1" size={32} />
                  <p className="text-xs text-gray-450 font-bold">Tudo em dia!</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Nenhuma notificação nova ou salva.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. Dynamic Shared Record Editing Modal */}
      <AnimatePresence>
        {isEditModalOpen && selectedActivity && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-center items-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 p-8 text-left space-y-6"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-gray-950 dark:text-white">Editar Atividade Compartilhada</h3>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-0.5 font-mono">Setor de Origem: {selectedActivity.sector}</p>
                </div>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Conteúdo / Descrição</label>
                  <textarea 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-800 dark:text-white h-32"
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                  />
                </div>

                {selectedActivity.collectionName !== 'nursingEvolutions' && selectedActivity.collectionName !== 'workshops' && (
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-500 uppercase tracking-widest ml-1">Conduta / Observações Técnicas</label>
                    <textarea 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border-none outline-none focus:ring-2 focus:ring-green-500 font-bold text-gray-800 dark:text-white h-24"
                      value={editConduct}
                      onChange={(e) => setEditConduct(e.target.value)}
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="flex-1 py-3 px-4 bg-green-600 text-white font-bold rounded-xl hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
                >
                  {savingEdit ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Simple small Close helper inline
const X = ({ size = 20 }: { size?: number }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

const ROLE_LABELS: Record<string, string> = {
  PRESIDENTE: 'Presidente (OAMI)',
  COORDENADORA: 'Coordenadora Clínica',
  ASSISTENTE_SOCIAL: 'Assistente Social',
  PSICOLOGA: 'Psicóloga Clínica',
  PEDAGOGA: 'Pedagoga Cooperada',
  ENFERMEIRA: 'Enfermeira-Chefe',
  TECNICO_ENFERMAGEM: 'Técnico de Enfermagem',
  FISIOTERAPEUTA: 'Fisioterapeuta Responsável',
  NUTRICIONISTA: 'Nutricionista Responsável',
  FABRICANTE_FRALDAS: 'Operador de Fraldas (SGPF)',
  PROJETISTA: 'Gestor de Projetos',
  AUXILIAR_ADMINISTRATIVO: 'Auxiliar Administrativo',
  ANY: 'Acesso Geral'
};
