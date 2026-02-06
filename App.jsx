import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, FileText, Activity, Pill, Scissors, 
  Home, Stethoscope, AlertCircle, Check, ChevronRight, ChevronLeft, 
  Clipboard, Copy, Save, Loader2, List, Search, ArrowLeft, Lock, Key, Eye, EyeOff,
  Trash2, Archive, RefreshCcw, Plus, X, Camera, ChevronDown, ChevronUp, Image as ImageIcon,
  Download, FileSpreadsheet, Database
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// --- ÁREA DE CONFIGURAÇÃO (ATENÇÃO GESTOR) ---
// Quando você colocar este código no GitHub ou Vercel,
// preencha os dados abaixo com as chaves do SEU projeto Firebase.
// Você consegue isso em: console.firebase.google.com > Configurações do Projeto
const myRealFirebaseConfig = {
  apiKey: "AIzaSyDrL5MNSRkPsCOkKTPT-aD5EpHV7158cFI",
  authDomain: "lpphaco.firebaseapp.com",
  projectId: "lpphaco",
  storageBucket: "lpphaco.firebasestorage.app",
  messagingSenderId: "142640845534",
  appId: "1:142640845534:web:580207dbbca7b805c3a84f"
};

// Lógica inteligente: Usa a config do ambiente de teste se existir, 
// senão usa a sua config real (para quando for pro GitHub)
const firebaseConfig = (typeof __firebase_config !== 'undefined') 
  ? JSON.parse(__firebase_config) 
  : myRealFirebaseConfig;

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
// No seu ambiente real, o appId pode ser fixo (ex: 'haco-pele')
const appId = typeof __app_id !== 'undefined' ? __app_id : 'haco-comissao-pele';

const App = () => {
  // Estados de Navegação e Auth
  const [view, setView] = useState('form'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Estados Gerais
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('Conectando...');
  
  // Estados Dashboard
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // --- ESTADO DO FORMULÁRIO (PACIENTE) ---
  const [formData, setFormData] = useState({
    nome: '',
    nascimento: '',
    saram: '',
    prontuario: '',
    origem: '',
    comorbidades: [],
    outraComorbidade: '',
    medicacoes: '',
    cirurgias: '',
    temCuidador: '',
    acompanhamentoAmbu: '',
    especialistaAmbu: '',
    lesoes: [], // ARRAY DE LESÕES
    condutasPrevias: '', 
    responsavel: ''
  });

  // --- ESTADO TEMPORÁRIO DA LESÃO ATUAL ---
  const [currentLesion, setCurrentLesion] = useState({
    localizacao: '',
    etiologia: '',
    estagio: '', 
    medida: '',
    tempoEvolucao: '',
    foto: null
  });

  const totalSteps = 5;

  // Autenticação
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Tenta usar token do ambiente de teste
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          // No seu ambiente real (GitHub), isso criará um usuário anônimo
          // Idealmente, no futuro, você ativará Login por Email no Firebase
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Auth error:", error);
        setAuthStatus('Erro Conexão');
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthStatus(u ? 'Conectado' : 'Aguardando...');
    });
    return () => unsubscribe();
  }, []);

  // --- HANDLERS ---
  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLesionChange = (field, value) => {
    setCurrentLesion(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 700 * 1024) {
      alert("A imagem é muito grande. Por favor, use uma imagem menor que 700KB.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setCurrentLesion(prev => ({ ...prev, foto: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const addLesion = () => {
    if (!currentLesion.localizacao || !currentLesion.etiologia || !currentLesion.medida) {
      alert("Preencha Localização, Etiologia e Medidas para adicionar a lesão.");
      return;
    }
    setFormData(prev => ({
      ...prev,
      lesoes: [...prev.lesoes, { ...currentLesion, id: Date.now() }]
    }));
    setCurrentLesion({
      localizacao: '',
      etiologia: '',
      estagio: '',
      medida: '',
      tempoEvolucao: '',
      foto: null
    });
  };

  const removeLesion = (id) => {
    setFormData(prev => ({
      ...prev,
      lesoes: prev.lesoes.filter(l => l.id !== id)
    }));
  };

  const toggleComorbidade = (item) => {
    setFormData(prev => {
      const current = prev.comorbidades;
      if (current.includes(item)) return { ...prev, comorbidades: current.filter(i => i !== item) };
      return { ...prev, comorbidades: [...current, item] };
    });
  };

  const nextStep = () => { 
    if (step === 4 && formData.lesoes.length === 0) {
      alert("Adicione pelo menos uma lesão antes de prosseguir.");
      return;
    }
    if (step < totalSteps) setStep(step + 1); 
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  // --- LOGIN ADMIN ---
  const handleAdminLogin = (e) => {
    e.preventDefault();
    const userClean = loginData.user.trim().toLowerCase();
    const passClean = loginData.pass.trim();
    // OBS: Em produção, o ideal é usar Firebase Auth (email/senha) real, não hardcoded.
    if (userClean === 'admin' && passClean === 'lpp2026') {
      setIsAdminLoggedIn(true);
      setView('list');
      setLoginError('');
      setLoginData({ user: '', pass: '' }); 
    } else {
      setLoginError('Acesso negado.');
    }
  };

  // --- BANCO DE DADOS ---
  const handleFinalize = async () => {
    if (!user) { alert("Sem conexão com o banco de dados."); return; }
    if (!formData.nome || !formData.responsavel) { alert("Nome e Responsável são obrigatórios."); return; }

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes'), {
        ...formData,
        dataRegistro: new Date().toISOString(),
        userId: user.uid,
        archived: false
      });
      setIsSubmitting(false);
      setIsSuccess(true);
    } catch (error) {
      setIsSubmitting(false);
      console.error(error);
      alert("Erro ao salvar. Tente novamente ou verifique sua conexão.");
    }
  };

  const fetchRecords = async () => {
    if (!user) return;
    setIsLoadingRecords(true);
    try {
      const qs = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes'));
      const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.dataRegistro || 0) - new Date(a.dataRegistro || 0));
      setRecords(data);
    } catch (e) { 
      console.error(e);
      alert("Erro ao buscar registros. Verifique se suas regras do Firestore permitem leitura."); 
    } finally { setIsLoadingRecords(false); }
  };

  const handleArchiveRecord = async (id, status) => {
    if (!confirm(status ? "Arquivar este registro?" : "Restaurar este registro?")) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes', id), { archived: status });
      setRecords(prev => prev.map(r => r.id === id ? { ...r, archived: status } : r));
    } catch (e) { alert("Erro ao atualizar."); }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm("ATENÇÃO: Excluir permanentemente este registro?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes', id));
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert("Erro ao excluir."); }
  };

  // --- EXPORTAÇÃO ---
  const exportToCSV = () => {
    if (records.length === 0) { alert("Sem dados para exportar."); return; }
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Data,Nome,SARAM,Prontuario,Origem,Responsavel,Qtd Lesoes,Detalhes\n";

    records.forEach(rec => {
      const dataReg = new Date(rec.dataRegistro).toLocaleDateString();
      let resumoLesoes = "";
      if (rec.lesoes && rec.lesoes.length > 0) {
        resumoLesoes = rec.lesoes.map(l => `${l.localizacao} (${l.etiologia})`).join(' | ');
      } else {
        resumoLesoes = `${rec.localizacaoLesao || ''} (${rec.etiologia || ''})`;
      }
      const clean = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : '""';
      const row = [clean(dataReg), clean(rec.nome), clean(rec.saram), clean(rec.prontuario), clean(rec.origem), clean(rec.responsavel), clean(rec.lesoes ? rec.lesoes.length : 1), clean(resumoLesoes)].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `comissao_pele_haco_${new Date().toLocaleDateString().replace(/\//g,'-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  useEffect(() => { if (view === 'list' && user) fetchRecords(); }, [view, user]);

  // --- COPY TO CLIPBOARD ---
  const copyToClipboard = (data) => {
    const lesoesText = data.lesoes && data.lesoes.length > 0 
      ? data.lesoes.map((l, i) => {
          const estagioInfo = l.etiologia === 'Lesão por pressão' && l.estagio ? ` - Estágio: ${l.estagio}` : '';
          return `   ${i+1}. ${l.localizacao} (${l.etiologia}${estagioInfo}) - ${l.medida}, Evolução: ${l.tempoEvolucao}`;
        }).join('\n')
      : `   - ${data.localizacaoLesao || '?'} (${data.etiologia || '?'}) - ${data.medidaLesao || '?'}`;

    const text = `
--- REGISTRO COMISSÃO DE PELE (HACO) ---
PACIENTE: ${data.nome}
SARAM: ${data.saram} | PRONT: ${data.prontuario}
ORIGEM: ${data.origem}
NASC: ${data.nascimento ? new Date(data.nascimento).toLocaleDateString('pt-BR') : '-'}

LESÕES:
${lesoesText}

CONDUTA: ${data.condutasPrevias}

CLÍNICA:
- Comorbidades: ${data.comorbidades?.join(', ')} ${data.outraComorbidade ? '- ' + data.outraComorbidade : ''}
- Medic: ${data.medicacoes}
- Cirurgias: ${data.cirurgias}
- Cuidador: ${data.temCuidador} | Acomp: ${data.acompanhamentoAmbu}

Resp: ${data.responsavel} - Data: ${new Date(data.dataRegistro || Date.now()).toLocaleDateString('pt-BR')}
-----------------------------------`.trim();
    navigator.clipboard.writeText(text);
    alert("Prontuário copiado!");
  };

  const filteredRecords = records.filter(rec => {
    const match = rec.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || rec.saram?.includes(searchTerm);
    return match && (showArchived ? rec.archived : !rec.archived);
  });

  // --- RENDERIZADORES ---
  const renderFormStep = () => {
    switch(step) {
      case 1: // ID
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><User className="text-blue-600"/> Identificação</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700">Nome Completo *</label>
                <input type="text" value={formData.nome} onChange={e=>handleChange('nome', e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Nome do Paciente"/>
              </div>
              <div><label className="text-sm font-medium text-slate-700">Nascimento *</label><input type="date" value={formData.nascimento} onChange={e=>handleChange('nascimento', e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"/></div>
              <div><label className="text-sm font-medium text-slate-700">SARAM *</label><input type="text" value={formData.saram} onChange={e=>handleChange('saram', e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"/></div>
              <div><label className="text-sm font-medium text-slate-700">Prontuário *</label><input type="text" value={formData.prontuario} onChange={e=>handleChange('prontuario', e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"/></div>
              <div><label className="text-sm font-medium text-slate-700">Origem *</label>
                <select value={formData.origem} onChange={e=>handleChange('origem', e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 bg-white">
                  <option value="">Selecione...</option>
                  <option value="UPI">UPI</option>
                  <option value="UTI">UTI</option>
                  <option value="UPA">UPA</option>
                  <option value="UCC">UCC</option>
                  <option value="SAD">SAD</option>
                  <option value="CAIS">CAIS</option>
                </select>
              </div>
            </div>
          </div>
        );
      case 2: // Clínico
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Activity className="text-blue-600"/> Histórico Clínico</h2>
            <div><label className="text-sm font-medium text-slate-700 mb-2 block">Comorbidades</label>
              <div className="grid grid-cols-2 gap-2">
                {['HAS','DM','D. Arterial Periférica','D. Venosa Periférica','Neoplasia','Outro'].map(i=>(
                  <button key={i} type="button" onClick={()=>toggleComorbidade(i)} className={`p-2 text-sm text-left rounded-lg border ${formData.comorbidades.includes(i)?'bg-blue-100 border-blue-500 text-blue-800':'bg-white hover:bg-slate-50'}`}>{i}</button>
                ))}
              </div>
              {formData.comorbidades.includes('Outro') && <input type="text" placeholder="Qual?" value={formData.outraComorbidade} onChange={e=>handleChange('outraComorbidade',e.target.value)} className="mt-2 w-full p-2 border-b-2 border-slate-200 outline-none"/>}
            </div>
            <div><label className="text-sm font-medium text-slate-700">Medicações</label><textarea rows="2" value={formData.medicacoes} onChange={e=>handleChange('medicacoes',e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none"/></div>
            <div><label className="text-sm font-medium text-slate-700">Cirurgias</label><textarea rows="2" value={formData.cirurgias} onChange={e=>handleChange('cirurgias',e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none"/></div>
          </div>
        );
      case 3: // Social
        return (
          <div className="space-y-4 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><Home className="text-blue-600"/> Apoio Social</h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="font-medium text-slate-800">Cuidador Domiciliar?</label>
              <div className="flex gap-4 mt-2">
                {['Sim','Não'].map(o=><label key={o} className="flex items-center gap-2"><input type="radio" name="cuid" checked={formData.temCuidador===o} onChange={()=>handleChange('temCuidador',o)}/> {o}</label>)}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <label className="font-medium text-slate-800">Acomp. Ambulatorial?</label>
              <div className="flex gap-4 mt-2 mb-2">
                {['Sim','Não'].map(o=><label key={o} className="flex items-center gap-2"><input type="radio" name="ambu" checked={formData.acompanhamentoAmbu===o} onChange={()=>handleChange('acompanhamentoAmbu',o)}/> {o}</label>)}
              </div>
              {formData.acompanhamentoAmbu==='Sim' && <input type="text" placeholder="Qual especialista?" value={formData.especialistaAmbu} onChange={e=>handleChange('especialistaAmbu',e.target.value)} className="w-full p-2 rounded border border-slate-300"/>}
            </div>
          </div>
        );
      case 4: // Lesões
        return (
          <div className="space-y-6 animate-fade-in">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><AlertCircle className="text-red-600"/> Cadastro de Lesões</h2>
            
            {formData.lesoes.length > 0 && (
              <div className="space-y-2 mb-4">
                <h3 className="text-sm font-bold text-slate-600 uppercase tracking-wide">Lesões Adicionadas ({formData.lesoes.length})</h3>
                {formData.lesoes.map((lesao, idx) => (
                  <div key={lesao.id} className="bg-red-50 p-3 rounded-lg border border-red-100 flex justify-between items-start">
                    <div className="flex gap-3">
                      {lesao.foto && <img src={lesao.foto} alt="Lesão" className="w-12 h-12 rounded object-cover border border-red-200" />}
                      <div>
                        <p className="font-bold text-red-900 text-sm">#{idx+1} {lesao.localizacao}</p>
                        <p className="text-xs text-red-700">{lesao.etiologia} {lesao.estagio && `- ${lesao.estagio}`} | {lesao.medida}</p>
                      </div>
                    </div>
                    <button onClick={() => removeLesion(lesao.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={16}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-slate-50 p-4 rounded-xl border border-blue-200 shadow-sm relative">
              <div className="absolute top-0 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded-br-lg font-bold">Nova Lesão</div>
              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Localização *</label>
                  <input type="text" value={currentLesion.localizacao} onChange={e=>handleLesionChange('localizacao', e.target.value)} className="w-full p-2 rounded border border-slate-300 outline-none" placeholder="Ex: Região Sacral"/>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Etiologia *</label>
                  <select value={currentLesion.etiologia} onChange={e=>handleLesionChange('etiologia', e.target.value)} className="w-full p-2 rounded border border-slate-300 bg-white outline-none">
                    <option value="">Selecione...</option>
                    <option value="Lesão por pressão">Lesão por pressão (LPP)</option>
                    <option value="Lesão arterial">Lesão arterial</option>
                    <option value="Lesão venosa">Lesão venosa</option>
                    <option value="Queimadura">Queimadura</option>
                    <option value="Deiscência Cirúrgica">Deiscência Cirúrgica</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
                {currentLesion.etiologia === 'Lesão por pressão' && (
                  <div className="md:col-span-2 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <label className="text-xs font-bold text-yellow-800 uppercase">Estágio LPP (NPUAP)</label>
                    <select value={currentLesion.estagio} onChange={e=>handleLesionChange('estagio', e.target.value)} className="w-full p-2 mt-1 rounded border border-yellow-300 bg-white outline-none">
                      <option value="">Selecione o estágio...</option>
                      <option value="Estágio 1">Estágio 1 (Pele íntegra, eritema)</option>
                      <option value="Estágio 2">Estágio 2 (Perda parcial espessura)</option>
                      <option value="Estágio 3">Estágio 3 (Perda total espessura)</option>
                      <option value="Estágio 4">Estágio 4 (Perda total + tecidos)</option>
                      <option value="Não Classificável">Não Classificável</option>
                      <option value="Tecidos Profundos">Lesão Tecidos Profundos</option>
                    </select>
                  </div>
                )}
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Medidas (cm) *</label>
                  <input type="text" value={currentLesion.medida} onChange={e=>handleLesionChange('medida', e.target.value)} className="w-full p-2 rounded border border-slate-300 outline-none" placeholder="CxLxP"/>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Tempo Evolução</label>
                  <input type="text" value={currentLesion.tempoEvolucao} onChange={e=>handleLesionChange('tempoEvolucao', e.target.value)} className="w-full p-2 rounded border border-slate-300 outline-none" placeholder="Ex: 5 dias"/>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Foto da Lesão</label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer bg-white border border-dashed border-slate-300 rounded-lg p-3 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors">
                      <Camera size={18} className="text-slate-400" />
                      <span className="text-sm text-slate-500">{currentLesion.foto ? 'Foto selecionada (Clique para trocar)' : 'Clique para tirar/anexar foto'}</span>
                      <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
                    </label>
                    {currentLesion.foto && (
                      <div className="relative w-12 h-12 shrink-0">
                        <img src={currentLesion.foto} alt="Preview" className="w-full h-full object-cover rounded border border-slate-200"/>
                        <button onClick={()=>setCurrentLesion(p=>({...p, foto:null}))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"><X size={10}/></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <button type="button" onClick={addLesion} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.98]">
                <Plus size={18}/> Adicionar esta lesão
              </button>
            </div>
            <div className="pt-4 border-t border-slate-200">
               <label className="text-sm font-bold text-slate-700 block mb-1">Condutas/Cuidados Gerais já Aplicados *</label>
               <textarea rows="2" value={formData.condutasPrevias} onChange={e=>handleChange('condutasPrevias',e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none" placeholder="Ex: Mudança de decúbito, Hidratação, Curativo com Alginato..."/>
            </div>
          </div>
        );
      case 5: // Final
        return (
          <div className="space-y-6 animate-fade-in text-center">
            <h2 className="text-xl font-bold text-slate-800 flex justify-center items-center gap-2"><Stethoscope className="text-blue-600"/> Resumo Final</h2>
            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100 text-left text-sm space-y-2">
              <p><strong>Paciente:</strong> {formData.nome}</p>
              <p><strong>Total de Lesões:</strong> {formData.lesoes.length}</p>
              <div className="pl-2 border-l-2 border-blue-300 space-y-1">
                {formData.lesoes.map((l,i) => (
                  <div key={i} className="flex items-center gap-2">
                    {l.foto && <ImageIcon size={12} className="text-blue-500"/>}
                    <p className="text-xs text-blue-800">#{i+1} {l.localizacao} ({l.etiologia})</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="text-left">
              <label className="text-sm font-bold text-slate-700">Responsável pelo Preenchimento *</label>
              <input type="text" value={formData.responsavel} onChange={e=>handleChange('responsavel',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} className="w-full p-3 rounded-lg border border-slate-300 outline-none" placeholder="Seu nome completo"/>
            </div>
          </div>
        );
      default: return null;
    }
  };

  // --- RENDERIZAR MAIN ---
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-2xl shadow-xl p-8 text-center border-t-4 border-green-500">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><Check className="text-green-600" size={32}/></div>
          <h2 className="text-2xl font-bold text-slate-800">Cadastro Realizado!</h2>
          <p className="text-slate-600 my-4">Dados de <strong>{formData.nome}</strong> salvos com {formData.lesoes.length} lesões.</p>
          <button onClick={()=>copyToClipboard(formData)} className="w-full bg-blue-50 text-blue-700 py-3 rounded-xl font-bold mb-3 border border-blue-200 flex justify-center gap-2"><Copy size={18}/> Copiar Evolução</button>
          <button onClick={()=>{setIsSuccess(false); setStep(1); setFormData({...formData, nome:'', saram:'', prontuario:'', lesoes:[], responsavel:''});}} className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex justify-center gap-2"><Clipboard size={18}/> Novo Cadastro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col min-h-[700px]">
        <div className="bg-blue-900 p-5 text-white flex justify-between items-start">
          <div>
            <h1 className="text-lg font-bold flex items-center gap-2"><Clipboard className="w-5 h-5"/>Notificação de Feridas e Lesões Por Pressão</h1>
            <p className="text-blue-200 text-[10px] uppercase tracking-wider">Hospital de Aeronáutica de Canoas</p>
          </div>
          <button onClick={() => { if(view==='form'){ if(isAdminLoggedIn) setView('list'); else setView('login'); } else setView('form'); }} className="bg-blue-800 text-xs py-2 px-3 rounded-lg flex items-center gap-2 border border-blue-700">{view==='form'?<><Lock size={12}/> Admin</>:<><ArrowLeft size={12}/> Cadastro</>}</button>
        </div>

        {view === 'login' && (
           <div className="flex-1 flex flex-col items-center justify-center p-8">
             <div className="w-full max-w-sm bg-slate-50 p-6 rounded-xl border border-slate-200">
               <h2 className="text-center font-bold text-slate-700 mb-4">Acesso Restrito</h2>
               <form onSubmit={handleAdminLogin} className="space-y-3">
                 <input type="text" placeholder="Usuário" className="w-full p-2 rounded border" value={loginData.user} onChange={e=>setLoginData({...loginData, user:e.target.value})}/>
                 <input type="password" placeholder="Senha" className="w-full p-2 rounded border" value={loginData.pass} onChange={e=>setLoginData({...loginData, pass:e.target.value})}/>
                 {loginError && <p className="text-red-500 text-xs text-center">{loginError}</p>}
                 <button className="w-full bg-blue-600 text-white py-2 rounded font-bold">Entrar</button>
               </form>
             </div>
           </div>
        )}

        {view === 'list' && isAdminLoggedIn && (
          <div className="flex-1 p-4 flex flex-col bg-slate-50">
            <div className="flex justify-between items-center mb-4">
               <h2 className="font-bold text-slate-700">Registros</h2>
               <div className="flex gap-2">
                 <button onClick={exportToCSV} className="text-green-700 text-xs flex gap-1 items-center bg-green-50 px-2 py-1 rounded border border-green-200 hover:bg-green-100 transition-colors" title="Baixar planilha de backup"><FileSpreadsheet size={14}/> Exportar Excel</button>
                 <button onClick={fetchRecords} className="text-blue-600 text-xs flex gap-1 items-center hover:bg-blue-50 px-2 py-1 rounded transition-colors"><RefreshCcw size={12} className={isLoadingRecords?'animate-spin':''}/> Atualizar</button>
               </div>
            </div>
            <div className="flex gap-2 mb-4">
               <input type="text" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="flex-1 p-2 rounded border text-sm"/>
               <button onClick={()=>setShowArchived(!showArchived)} className="bg-white border p-2 rounded text-slate-500">{showArchived?<List size={16}/>:<Archive size={16}/>}</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
               {filteredRecords.map(rec => (
                 <div key={rec.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-sm transition-all">
                    <div className="flex justify-between border-b pb-2 mb-2">
                      <div>
                        <strong className="text-slate-800 text-base">{rec.nome}</strong>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">SARAM: {rec.saram}</span>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded border border-blue-100">{rec.origem}</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-slate-100 px-2 py-1 rounded block mb-1">{new Date(rec.dataRegistro).toLocaleDateString()}</span>
                        <span className="text-[10px] text-slate-400">Total Lesões: {rec.lesoes ? rec.lesoes.length : 1}</span>
                      </div>
                    </div>

                    {expandedRecordId === rec.id ? (
                      <div className="animate-fade-in space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-4 text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                           <div><span className="block font-bold text-slate-400 uppercase text-[10px]">Nascimento</span> {rec.nascimento ? new Date(rec.nascimento).toLocaleDateString() : '-'}</div>
                           <div><span className="block font-bold text-slate-400 uppercase text-[10px]">Prontuário</span> {rec.prontuario}</div>
                           <div className="col-span-2"><span className="block font-bold text-slate-400 uppercase text-[10px]">Comorbidades</span> {rec.comorbidades?.join(', ') || '-'} {rec.outraComorbidade}</div>
                           <div className="col-span-2"><span className="block font-bold text-slate-400 uppercase text-[10px]">Medicações</span> {rec.medicacoes || '-'}</div>
                           <div className="col-span-2"><span className="block font-bold text-slate-400 uppercase text-[10px]">Cuidados Prévios</span> {rec.condutasPrevias || '-'}</div>
                        </div>
                        <div className="space-y-3">
                          <h4 className="font-bold text-slate-700 text-xs flex items-center gap-1"><AlertCircle size={12}/> Detalhe das Lesões</h4>
                          {rec.lesoes && rec.lesoes.length > 0 ? (
                            rec.lesoes.map((l, i) => (
                              <div key={i} className="bg-white border border-slate-200 rounded-lg p-3">
                                <div className="flex gap-3 items-start">
                                  {l.foto ? (
                                    <div className="w-20 h-20 shrink-0 bg-slate-100 rounded border border-slate-200 overflow-hidden cursor-pointer" onClick={() => {const w = window.open(); w.document.write('<img src="'+l.foto+'"/>');}}>
                                      <img src={l.foto} alt="Lesão" className="w-full h-full object-cover hover:scale-110 transition-transform"/>
                                    </div>
                                  ) : (
                                    <div className="w-20 h-20 shrink-0 bg-slate-50 rounded border border-slate-200 flex items-center justify-center text-slate-300"><ImageIcon size={24}/></div>
                                  )}
                                  <div className="flex-1">
                                    <p className="font-bold text-blue-900 text-sm">#{i+1} {l.localizacao}</p>
                                    <p className="text-xs text-slate-600 mt-1"><span className="font-semibold">Etiologia:</span> {l.etiologia}</p>
                                    {l.estagio && <p className="text-xs text-slate-600"><span className="font-semibold">Estágio:</span> {l.estagio}</p>}
                                    <p className="text-xs text-slate-600"><span className="font-semibold">Medidas:</span> {l.medida}</p>
                                    <p className="text-xs text-slate-600"><span className="font-semibold">Evolução:</span> {l.tempoEvolucao}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-xs p-2 bg-slate-50 border rounded">Dados resumidos antigos: {rec.localizacaoLesao} ({rec.etiologia})</div>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                           <span className="text-[10px] text-slate-400">Resp: {rec.responsavel}</span>
                           <button onClick={() => setExpandedRecordId(null)} className="text-blue-600 text-xs font-bold flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded">Ver Menos <ChevronUp size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                         <div className="flex gap-2">
                           <button onClick={()=>copyToClipboard(rec)} className="text-slate-500 hover:text-blue-600 transition-colors" title="Copiar"><Copy size={16}/></button>
                           <button onClick={()=>handleArchiveRecord(rec.id, !showArchived)} className="text-slate-500 hover:text-orange-500 transition-colors" title="Arquivar"><Archive size={16}/></button>
                           <button onClick={()=>handleDeleteRecord(rec.id)} className="text-slate-500 hover:text-red-500 transition-colors" title="Excluir"><Trash2 size={16}/></button>
                         </div>
                         <button onClick={() => setExpandedRecordId(rec.id)} className="bg-blue-600 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-700 transition-colors shadow-sm">Ver Detalhes Completos <ChevronDown size={14}/></button>
                      </div>
                    )}
                 </div>
               ))}
               {filteredRecords.length === 0 && <p className="text-center text-slate-400 text-xs mt-10">Nenhum registro encontrado.</p>}
            </div>
            
            <div className="mt-4 pt-4 border-t border-slate-200 text-xs text-slate-400 flex justify-between">
               <span>Status: <span className={authStatus === 'Conectado' ? 'text-green-600 font-bold' : 'text-red-500'}>{authStatus}</span></span>
               <span className="font-mono" title="ID do Banco">ID: {appId.slice(-6)}</span>
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="flex-1 flex flex-col">
            <div className="p-6 flex-1 overflow-y-auto">
               <div className="mb-6">
                 <div className="h-1 bg-slate-200 w-full rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${(step/totalSteps)*100}%`}}></div>
                 </div>
                 <p className="text-right text-xs text-blue-600 font-bold mt-1">Passo {step} de {totalSteps}</p>
               </div>
               
               <form onSubmit={e=>e.preventDefault()}>
                 {renderFormStep()}
               </form>
            </div>
            <div className="p-4 border-t border-slate-100 bg-white flex justify-between">
               <button onClick={prevStep} disabled={step===1} className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 ${step===1?'text-slate-300':'text-slate-600 hover:bg-slate-50'}`}><ChevronLeft size={16}/> Voltar</button>
               {step < totalSteps ? (
                 <button onClick={nextStep} className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-blue-700 shadow-sm">Próximo <ChevronRight size={16}/></button>
               ) : (
                 <button onClick={handleFinalize} disabled={isSubmitting} className="px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-bold flex items-center gap-1 hover:bg-green-700 shadow-sm">
                   {isSubmitting ? <Loader2 className="animate-spin" size={16}/> : <Save size={16}/>} Finalizar
                 </button>
               )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
