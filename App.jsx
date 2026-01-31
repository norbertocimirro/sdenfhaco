import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, FileText, Activity, Pill, Scissors, 
  Home, Stethoscope, AlertCircle, Check, ChevronRight, ChevronLeft, 
  Clipboard, Copy, Save, Loader2, List, Search, ArrowLeft, Lock, Key, Eye, EyeOff,
  Trash2, Archive, RefreshCcw, Plus, X, Camera, ChevronDown, ChevronUp, Image as ImageIcon,
  Download, FileSpreadsheet
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURAÇÃO REAL DO SEU PROJETO FIREBASE (HACO) ---
const myRealFirebaseConfig = {
  apiKey: "AIzaSyDrL5MNSRkPsCOkKTPT-aD5EpHV7158cFI",
  authDomain: "lpphaco.firebaseapp.com",
  projectId: "lpphaco",
  storageBucket: "lpphaco.firebasestorage.app",
  messagingSenderId: "142640845534",
  appId: "1:142640845534:web:580207dbbca7b805c3a84f"
};

// Lógica para usar a config real quando estiver no Vercel/GitHub
const firebaseConfig = (typeof __firebase_config !== 'undefined') 
  ? JSON.parse(__firebase_config) 
  : myRealFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'haco-comissao-pele-v1';

const App = () => {
  // --- ESTADOS GERAIS ---
  const [view, setView] = useState('form'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  
  // Estados do Formulário
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('Conectando...');
  
  // Estados da Gestão
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  // --- ESTADO DO PRONTUÁRIO ---
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
    lesoes: [], 
    condutasPrevias: '', 
    responsavel: ''
  });

  // --- ESTADO DA NOVA LESÃO (TEMPORÁRIO) ---
  const [currentLesion, setCurrentLesion] = useState({
    localizacao: '',
    etiologia: '',
    estagio: '', 
    medida: '',
    tempoEvolucao: '',
    foto: null
  });

  const totalSteps = 5;

  // --- AUTENTICAÇÃO ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
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
      setAuthStatus(u ? 'Conectado' : 'Offline');
    });
    return () => unsubscribe();
  }, []);

  // --- FUNÇÕES AUXILIARES ---
  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleLesionChange = (field, value) => setCurrentLesion(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) { // 800KB limite para evitar travar o banco gratuito
      alert("A imagem é muito grande. Tente usar uma resolução menor (Máx 800KB).");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => setCurrentLesion(prev => ({ ...prev, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  const addLesion = () => {
    if (!currentLesion.localizacao || !currentLesion.etiologia || !currentLesion.medida) {
      alert("Preencha Localização, Etiologia e Medidas.");
      return;
    }
    setFormData(prev => ({ ...prev, lesoes: [...prev.lesoes, { ...currentLesion, id: Date.now() }] }));
    setCurrentLesion({ localizacao: '', etiologia: '', estagio: '', medida: '', tempoEvolucao: '', foto: null });
  };

  const removeLesion = (id) => setFormData(prev => ({ ...prev, lesoes: prev.lesoes.filter(l => l.id !== id) }));

  const toggleComorbidade = (item) => {
    setFormData(prev => {
      const current = prev.comorbidades;
      if (current.includes(item)) return { ...prev, comorbidades: current.filter(i => i !== item) };
      return { ...prev, comorbidades: [...current, item] };
    });
  };

  const nextStep = () => { 
    if (step === 4 && formData.lesoes.length === 0) { alert("Adicione pelo menos uma lesão."); return; }
    if (step < totalSteps) {
      setStep(step + 1);
      // Rola para o topo suavemente ao mudar de passo
      window.scrollTo(0, 0);
    }
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    const userClean = loginData.user.trim().toLowerCase();
    const passClean = loginData.pass.trim();
    if (userClean === 'admin' && passClean === 'lpp2026') {
      setIsAdminLoggedIn(true);
      setView('list');
      setLoginError('');
      setLoginData({ user: '', pass: '' }); 
    } else {
      setLoginError('Dados incorretos.');
    }
  };

  // --- FINALIZAR E SALVAR ---
  const handleFinalize = async () => {
    if (!user) { alert("Erro de conexão com o banco de dados."); return; }
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
      alert("Erro ao salvar. Verifique se a imagem não é muito pesada ou sua conexão.");
    }
  };

  // --- GESTÃO DE DADOS ---
  const fetchRecords = async () => {
    if (!user) return;
    setIsLoadingRecords(true);
    try {
      const qs = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes'));
      const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.dataRegistro || 0) - new Date(a.dataRegistro || 0));
      setRecords(data);
    } catch (e) { alert("Erro ao ler dados."); } 
    finally { setIsLoadingRecords(false); }
  };

  const handleArchiveRecord = async (id, status) => {
    if (!confirm(status ? "Arquivar?" : "Restaurar?")) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes', id), { archived: status });
      setRecords(prev => prev.map(r => r.id === id ? { ...r, archived: status } : r));
    } catch (e) { alert("Erro ao atualizar."); }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm("Excluir permanentemente?")) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes', id));
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert("Erro ao excluir."); }
  };

  const exportToCSV = () => {
    if (records.length === 0) { alert("Sem dados."); return; }
    let csv = "data:text/csv;charset=utf-8,Data,Nome,SARAM,Prontuario,Origem,Responsavel,Qtd Lesoes,Detalhes\n";
    records.forEach(rec => {
      const dataReg = new Date(rec.dataRegistro).toLocaleDateString();
      let resumo = rec.lesoes && rec.lesoes.length > 0 ? rec.lesoes.map(l => `${l.localizacao} (${l.etiologia})`).join(' | ') : `${rec.localizacaoLesao || ''}`;
      const c = (t) => t ? `"${t.toString().replace(/"/g, '""')}"` : '""';
      csv += `${c(dataReg)},${c(rec.nome)},${c(rec.saram)},${c(rec.prontuario)},${c(rec.origem)},${c(rec.responsavel)},${c(rec.lesoes?.length)},${c(resumo)}\n`;
    });
    const link = document.createElement("a");
    link.href = encodeURI(csv);
    link.download = `backup_pele_${new Date().toLocaleDateString().replace(/\//g,'-')}.csv`;
    link.click();
  };

  useEffect(() => { if (view === 'list' && user) fetchRecords(); }, [view, user]);

  const copyToClipboard = (data) => {
    const lesoesText = data.lesoes?.map((l, i) => `   ${i+1}. ${l.localizacao} (${l.etiologia}${l.estagio?` - ${l.estagio}`:''}) - ${l.medida}, Evol: ${l.tempoEvolucao}`).join('\n') || '   - Dados incompletos';
    const text = `--- REGISTRO COMISSÃO DE PELE (HACO) ---\nPACIENTE: ${data.nome}\nSARAM: ${data.saram} | PRONT: ${data.prontuario}\nORIGEM: ${data.origem}\nNASC: ${data.nascimento ? new Date(data.nascimento).toLocaleDateString('pt-BR') : '-'}\n\nLESÕES:\n${lesoesText}\n\nCONDUTA: ${data.condutasPrevias}\n\nCLÍNICA:\n- Comorbidades: ${data.comorbidades?.join(', ')} ${data.outraComorbidade||''}\n- Medic: ${data.medicacoes}\n- Cirurgias: ${data.cirurgias}\n- Cuidador: ${data.temCuidador} | Acomp: ${data.acompanhamentoAmbu}\n\nResp: ${data.responsavel} - Data: ${new Date(data.dataRegistro||Date.now()).toLocaleDateString('pt-BR')}\n-----------------------------------`;
    navigator.clipboard.writeText(text);
    alert("Copiado!");
  };

  const filteredRecords = records.filter(rec => {
    const match = rec.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || rec.saram?.includes(searchTerm);
    return match && (showArchived ? rec.archived : !rec.archived);
  });

  const renderFormStep = () => {
    switch(step) {
      case 1: 
        return (
          <div className="space-y-5 animate-fade-in pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><User className="text-blue-600" size={20}/> Identificação</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-600 mb-1 block">Nome Completo *</label>
                <input type="text" value={formData.nome} onChange={e=>handleChange('nome', e.target.value)} className="w-full p-4 rounded-xl border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" placeholder="Nome do Paciente"/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-slate-600 mb-1 block">Nascimento *</label><input type="date" value={formData.nascimento} onChange={e=>handleChange('nascimento', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"/></div>
                <div><label className="text-sm font-semibold text-slate-600 mb-1 block">SARAM *</label><input type="text" inputMode="numeric" value={formData.saram} onChange={e=>handleChange('saram', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"/></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-sm font-semibold text-slate-600 mb-1 block">Prontuário *</label><input type="text" inputMode="numeric" value={formData.prontuario} onChange={e=>handleChange('prontuario', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none"/></div>
                <div><label className="text-sm font-semibold text-slate-600 mb-1 block">Origem *</label>
                  <select value={formData.origem} onChange={e=>handleChange('origem', e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none">
                    <option value="">Selecione...</option><option value="UPI">UPI</option><option value="UTI">UTI</option><option value="UPA">UPA</option><option value="UCC">UCC</option><option value="SAD">SAD</option><option value="CAIS">CAIS</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );
      case 2: 
        return (
          <div className="space-y-5 animate-fade-in pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Activity className="text-blue-600" size={20}/> Clínico</h2>
            <div><label className="text-sm font-semibold text-slate-600 mb-2 block">Comorbidades</label>
              <div className="grid grid-cols-2 gap-2">
                {['HAS','DM','D. Art. Periférica','D. Ven. Periférica','Neoplasia','Outro'].map(i=>(
                  <button key={i} type="button" onClick={()=>toggleComorbidade(i)} className={`p-3 text-xs sm:text-sm font-medium text-center rounded-xl border transition-all active:scale-95 ${formData.comorbidades.includes(i)?'bg-blue-600 text-white border-blue-600 shadow-md':'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>{i}</button>
                ))}
              </div>
              {formData.comorbidades.includes('Outro') && <input type="text" placeholder="Especifique a comorbidade" value={formData.outraComorbidade} onChange={e=>handleChange('outraComorbidade',e.target.value)} className="mt-3 w-full p-3 border-b-2 border-slate-200 outline-none bg-transparent focus:border-blue-500 transition-colors"/>}
            </div>
            <div><label className="text-sm font-semibold text-slate-600 mb-1 block">Medicações</label><textarea rows="3" value={formData.medicacoes} onChange={e=>handleChange('medicacoes',e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none" placeholder="Uso contínuo..."/></div>
            <div><label className="text-sm font-semibold text-slate-600 mb-1 block">Cirurgias</label><textarea rows="2" value={formData.cirurgias} onChange={e=>handleChange('cirurgias',e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 bg-slate-50 outline-none" placeholder="Histórico..."/></div>
          </div>
        );
      case 3: 
        return (
          <div className="space-y-5 animate-fade-in pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><Home className="text-blue-600" size={20}/> Social</h2>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="text-sm font-bold text-slate-800 block mb-2">Cuidador Domiciliar?</label>
              <div className="flex gap-2">
                {['Sim','Não'].map(o=><button key={o} type="button" onClick={()=>handleChange('temCuidador',o)} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${formData.temCuidador===o ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}>{o}</button>)}
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 shadow-sm">
              <label className="text-sm font-bold text-slate-800 block mb-2">Acomp. Ambulatorial?</label>
              <div className="flex gap-2 mb-3">
                {['Sim','Não'].map(o=><button key={o} type="button" onClick={()=>handleChange('acompanhamentoAmbu',o)} className={`flex-1 py-2 rounded-lg font-medium transition-colors ${formData.acompanhamentoAmbu===o ? 'bg-blue-600 text-white shadow-md' : 'bg-white border text-slate-600'}`}>{o}</button>)}
              </div>
              {formData.acompanhamentoAmbu==='Sim' && <input type="text" placeholder="Qual especialista?" value={formData.especialistaAmbu} onChange={e=>handleChange('especialistaAmbu',e.target.value)} className="w-full p-3 rounded-lg border border-slate-300 outline-none focus:ring-2 focus:ring-blue-500"/>}
            </div>
          </div>
        );
      case 4: 
        return (
          <div className="space-y-6 animate-fade-in pb-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2 border-b pb-2"><AlertCircle className="text-red-600" size={20}/> Lesões</h2>
            {formData.lesoes.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Lesões Adicionadas ({formData.lesoes.length})</h3>
                {formData.lesoes.map((lesao, idx) => (
                  <div key={lesao.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex justify-between items-start">
                    <div className="flex gap-3">
                      {lesao.foto ? <img src={lesao.foto} alt="Lesão" className="w-14 h-14 rounded-lg object-cover border border-slate-100" /> : <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon size={20} className="text-slate-300"/></div>}
                      <div><p className="font-bold text-slate-800 text-sm">#{idx+1} {lesao.localizacao}</p><p className="text-xs text-slate-500">{lesao.etiologia}</p></div>
                    </div>
                    <button onClick={() => removeLesion(lesao.id)} className="text-red-400 p-2 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                  </div>
                ))}
              </div>
            )}
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] uppercase px-3 py-1 rounded-br-lg font-bold tracking-wide">Nova Lesão</div>
              <div className="space-y-3 mt-6">
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Localização</label><input type="text" value={currentLesion.localizacao} onChange={e=>handleLesionChange('localizacao', e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 outline-none" placeholder="Ex: Sacral"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Etiologia</label><select value={currentLesion.etiologia} onChange={e=>handleLesionChange('etiologia', e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 bg-white outline-none"><option value="">Selecione...</option><option value="Lesão por pressão">Lesão por pressão (LPP)</option><option value="Lesão arterial">Lesão arterial</option><option value="Lesão venosa">Lesão venosa</option><option value="Queimadura">Queimadura</option><option value="Deiscência Cirúrgica">Deiscência</option><option value="Outro">Outro</option></select></div>
                {currentLesion.etiologia === 'Lesão por pressão' && (
                  <div className="bg-white p-3 rounded-lg border border-blue-200"><label className="text-xs font-bold text-blue-800 uppercase mb-1 block">Estágio LPP</label><select value={currentLesion.estagio} onChange={e=>handleLesionChange('estagio', e.target.value)} className="w-full p-2 rounded border border-slate-200 bg-slate-50 outline-none"><option value="">Selecione...</option><option value="Estágio 1">Estágio 1</option><option value="Estágio 2">Estágio 2</option><option value="Estágio 3">Estágio 3</option><option value="Estágio 4">Estágio 4</option><option value="Não Classificável">Não Classificável</option><option value="Tecidos Profundos">Tecidos Profundos</option></select></div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Medidas</label><input type="text" value={currentLesion.medida} onChange={e=>handleLesionChange('medida', e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 outline-none" placeholder="CxLxP"/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Evolução</label><input type="text" value={currentLesion.tempoEvolucao} onChange={e=>handleLesionChange('tempoEvolucao', e.target.value)} className="w-full p-3 rounded-lg border border-slate-200 outline-none" placeholder="Ex: 5 dias"/></div>
                </div>
                <div><label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Foto</label><label className="cursor-pointer bg-white border border-dashed border-slate-300 rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors active:bg-blue-50"><Camera size={24} className="text-blue-500" /><span className="text-sm font-medium text-slate-600">{currentLesion.foto ? 'Foto Selecionada (Toque para trocar)' : 'Toque para tirar foto'}</span><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" /></label>{currentLesion.foto && <div className="mt-2 relative inline-block"><img src={currentLesion.foto} alt="Preview" className="h-20 w-20 object-cover rounded-lg border shadow-sm"/><button onClick={()=>setCurrentLesion(p=>({...p, foto:null}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow"><X size={12}/></button></div>}</div>
              </div>
              <button type="button" onClick={addLesion} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:transform active:scale-95 transition-all"><Plus size={20}/> Adicionar Lesão</button>
            </div>
            <div><label className="text-sm font-semibold text-slate-600 block mb-2">Condutas/Cuidados *</label><textarea rows="3" value={formData.condutasPrevias} onChange={e=>handleChange('condutasPrevias',e.target.value)} className="w-full p-3 rounded-xl border border-slate-300 outline-none" placeholder="Ex: Mudança decúbito 2/2h, Curativo..."/></div>
          </div>
        );
      case 5: 
        return (
          <div className="space-y-6 animate-fade-in text-center pb-4">
            <h2 className="text-xl font-bold text-slate-800 flex justify-center items-center gap-2"><Stethoscope className="text-blue-600"/> Resumo</h2>
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-left space-y-3">
              <div><span className="text-xs text-slate-400 uppercase font-bold">Paciente</span><p className="font-medium text-slate-800 text-lg">{formData.nome}</p></div>
              <div><span className="text-xs text-slate-400 uppercase font-bold">Resumo Lesões</span><p className="font-medium text-slate-800">{formData.lesoes.length} lesão(ões) registrada(s)</p></div>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100"><span className="text-xs text-slate-400 uppercase font-bold block mb-1">Responsável</span><input type="text" value={formData.responsavel} onChange={e=>handleChange('responsavel',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} className="w-full bg-transparent border-b border-slate-300 focus:border-blue-500 outline-none py-1 font-medium text-blue-900" placeholder="Digite seu nome..."/></div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm"><Check className="text-green-600" size={40}/></div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Salvo!</h2>
          <p className="text-slate-500 mb-8">Dados enviados com sucesso.</p>
          <button onClick={()=>copyToClipboard(formData)} className="w-full bg-slate-100 text-slate-700 py-4 rounded-xl font-bold mb-3 flex justify-center gap-2 active:scale-95 transition-transform"><Copy size={20}/> Copiar Evolução</button>
          <button onClick={()=>{setIsSuccess(false); setStep(1); setFormData({...formData, nome:'', saram:'', prontuario:'', lesoes:[], responsavel:''});}} className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"><Clipboard size={20}/> Novo Paciente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center sm:justify-center sm:p-4 font-sans">
      <div className="w-full sm:max-w-xl bg-white sm:rounded-2xl shadow-xl flex flex-col min-h-screen sm:min-h-[700px] relative overflow-hidden">
        {/* HEADER */}
        <div className="bg-blue-900 p-5 text-white flex justify-between items-center sticky top-0 z-20 shadow-md">
          <div><h1 className="text-lg font-bold flex items-center gap-2"><Clipboard className="w-5 h-5 text-blue-300"/> Comissão Pele</h1><p className="text-blue-200 text-[10px] uppercase tracking-wider font-semibold">HACO - Mobile</p></div>
          <button onClick={() => { if(view==='form'){ if(isAdminLoggedIn) setView('list'); else setView('login'); } else setView('form'); }} className="bg-white/10 backdrop-blur-md text-xs py-2 px-3 rounded-lg flex items-center gap-2 border border-white/20 active:bg-white/20 transition-colors">{view==='form'?<><Lock size={14}/> Admin</>:<><ArrowLeft size={14}/> Form</>}</button>
        </div>

        {/* LOGIN SCREEN */}
        {view === 'login' && (
           <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
             <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg border border-slate-100">
               <div className="flex justify-center mb-6"><div className="p-4 bg-blue-50 rounded-full"><Lock className="text-blue-600" size={32}/></div></div>
               <h2 className="text-center font-bold text-2xl text-slate-800 mb-6">Acesso Restrito</h2>
               <form onSubmit={handleAdminLogin} className="space-y-4">
                 <input type="text" placeholder="Usuário" className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={loginData.user} onChange={e=>setLoginData({...loginData, user:e.target.value})}/>
                 <input type="password" placeholder="Senha" className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500" value={loginData.pass} onChange={e=>setLoginData({...loginData, pass:e.target.value})}/>
                 {loginError && <p className="text-red-500 text-sm font-medium text-center bg-red-50 p-2 rounded-lg">{loginError}</p>}
                 <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-transform">Entrar no Sistema</button>
               </form>
             </div>
           </div>
        )}

        {/* ADMIN LIST SCREEN */}
        {view === 'list' && isAdminLoggedIn && (
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="p-4 bg-white shadow-sm z-10 space-y-3">
               <div className="flex justify-between items-center"><h2 className="font-bold text-lg text-slate-700">Prontuários</h2><div className="flex gap-2"><button onClick={exportToCSV} className="text-green-700 bg-green-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><FileSpreadsheet size={14}/> CSV</button><button onClick={fetchRecords} className="text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1"><RefreshCcw size={14} className={isLoadingRecords?'animate-spin':''}/></button></div></div>
               <div className="flex gap-2"><div className="flex-1 relative"><Search className="absolute left-3 top-3 text-slate-400" size={16}/><input type="text" placeholder="Buscar paciente..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full pl-10 p-2.5 rounded-lg border border-slate-200 bg-slate-50 text-sm outline-none"/></div><button onClick={()=>setShowArchived(!showArchived)} className={`px-3 rounded-lg border ${showArchived ? 'bg-slate-200 text-slate-700' : 'bg-white text-slate-500'}`}>{showArchived?<List size={18}/>:<Archive size={18}/>}</button></div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {filteredRecords.map(rec => (
                 <div key={rec.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex flex-col gap-1 pb-3 border-b border-slate-100">
                      <div className="flex justify-between items-start">
                        <strong className="text-slate-800 text-base">{rec.nome}</strong>
                        <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-1 rounded-full font-bold">{new Date(rec.dataRegistro).toLocaleDateString()}</span>
                      </div>
                      <div className="flex gap-2 text-xs">
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">SARAM: {rec.saram}</span>
                        <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{rec.origem}</span>
                      </div>
                    </div>
                    {expandedRecordId === rec.id ? (
                      <div className="pt-3 animate-fade-in space-y-4">
                        <div className="bg-slate-50 p-3 rounded-xl space-y-2 text-xs text-slate-600">
                           <p><strong>Nasc:</strong> {rec.nascimento ? new Date(rec.nascimento).toLocaleDateString() : '-'}</p>
                           <p><strong>Comorb:</strong> {rec.comorbidades?.join(', ') || '-'}</p>
                           <p><strong>Medic:</strong> {rec.medicacoes || '-'}</p>
                           <p><strong>Conduta:</strong> {rec.condutasPrevias || '-'}</p>
                        </div>
                        <div className="space-y-3">
                          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Lesões Registradas</h4>
                          {rec.lesoes?.map((l, i) => (
                            <div key={i} className="flex gap-3 bg-white border border-slate-100 p-2 rounded-lg">
                              {l.foto ? <div onClick={() => {const w = window.open(); w.document.write('<img src="'+l.foto+'" style="width:100%"/>');}} className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 overflow-hidden"><img src={l.foto} className="h-full w-full object-cover"/></div> : <div className="h-16 w-16 shrink-0 rounded-lg bg-slate-50 flex items-center justify-center"><ImageIcon className="text-slate-300"/></div>}
                              <div className="text-xs space-y-0.5">
                                <p className="font-bold text-slate-800">{l.localizacao}</p>
                                <p className="text-slate-500">{l.etiologia} {l.estagio && `(${l.estagio})`}</p>
                                <p className="text-slate-500">Dim: {l.medida}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="pt-2 border-t flex justify-between items-center">
                           <span className="text-[10px] text-slate-400">Resp: {rec.responsavel}</span>
                           <button onClick={() => setExpandedRecordId(null)} className="text-blue-600 text-xs font-bold flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg">Menos <ChevronUp size={14}/></button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-center mt-3">
                         <div className="flex gap-1">
                           <button onClick={()=>copyToClipboard(rec)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full"><Copy size={18}/></button>
                           <button onClick={()=>handleDeleteRecord(rec.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={18}/></button>
                         </div>
                         <button onClick={() => setExpandedRecordId(rec.id)} className="bg-slate-800 text-white text-xs px-4 py-2 rounded-lg font-bold flex items-center gap-1 active:scale-95 transition-transform">Ver Detalhes <ChevronDown size={14}/></button>
                      </div>
                    )}
                 </div>
               ))}
               {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2"><Search size={30}/><p>Nenhum registro.</p></div>}
            </div>
          </div>
        )}

        {/* FORMULÁRIO COM STICKY FOOTER */}
        {view === 'form' && (
          <div className="flex-1 flex flex-col relative">
            <div className="p-5 flex-1 overflow-y-auto pb-24"> 
               <div className="mb-6 sticky top-0 bg-white/95 backdrop-blur py-2 z-10">
                 <div className="flex justify-between text-xs font-bold text-slate-400 mb-1"><span>Progresso</span><span>{step}/{totalSteps}</span></div>
                 <div className="h-2 bg-slate-100 w-full rounded-full overflow-hidden"><div className="h-full bg-blue-600 transition-all duration-300" style={{width: `${(step/totalSteps)*100}%`}}></div></div>
               </div>
               <form onSubmit={e=>e.preventDefault()}>{renderFormStep()}</form>
            </div>
            
            {/* Sticky Mobile Footer Navigation */}
            <div className="p-4 border-t border-slate-100 bg-white/90 backdrop-blur-md sticky bottom-0 z-20 flex justify-between items-center shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
               <button onClick={prevStep} disabled={step===1} className={`px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-1 transition-colors ${step===1?'text-slate-300':'text-slate-600 active:bg-slate-100'}`}><ChevronLeft size={20}/> Voltar</button>
               {step < totalSteps ? (
                 <button onClick={nextStep} className="px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform">Próximo <ChevronRight size={20}/></button>
               ) : (
                 <button onClick={handleFinalize} disabled={isSubmitting} className="px-8 py-3 bg-green-600 text-white rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform">
                   {isSubmitting ? <Loader2 className="animate-spin" size={20}/> : <Save size={20}/>} Finalizar
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
