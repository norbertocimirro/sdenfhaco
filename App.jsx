import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, Activity, Home, AlertCircle, Check, ChevronRight, ChevronLeft, 
  Clipboard, Copy, Save, Loader2, List, Search, ArrowLeft, Lock, Key, Eye, EyeOff,
  Trash2, Archive, RefreshCcw, Plus, X, Camera, ChevronDown, ChevronUp, Image as ImageIcon,
  FileSpreadsheet, MapPin, Maximize2
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

// Usa a config real se não estiver no ambiente de teste da IA
const firebaseConfig = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : myRealFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- NOME DA COLEÇÃO NO BANCO DE DADOS (Caminho Simplificado) ---
const COLLECTION_NAME = 'prontuarios_haco';

const App = () => {
  const [view, setView] = useState('form'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('Conectando...');
  
  const [records, setRecords] = useState([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [expandedRecordId, setExpandedRecordId] = useState(null);

  const [formData, setFormData] = useState({
    nome: '', nascimento: '', saram: '', prontuario: '', origem: '',
    comorbidades: [], outraComorbidade: '', medicacoes: '', cirurgias: '',
    temCuidador: '', acompanhamentoAmbu: '', especialistaAmbu: '',
    lesoes: [], condutasPrevias: '', responsavel: ''
  });

  const [currentLesion, setCurrentLesion] = useState({
    localizacao: '', etiologia: '', estagio: '', medida: '', tempoEvolucao: '', foto: null
  });

  const totalSteps = 5;

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) { console.error(error); setAuthStatus('Erro Auth'); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthStatus(u ? 'Conectado' : 'Offline'); });
    return () => unsubscribe();
  }, []);

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));
  const handleLesionChange = (field, value) => setCurrentLesion(prev => ({ ...prev, [field]: value }));

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 800 * 1024) { alert("Imagem muito grande (Max 800KB)."); return; }
    const reader = new FileReader();
    reader.onloadend = () => setCurrentLesion(prev => ({ ...prev, foto: reader.result }));
    reader.readAsDataURL(file);
  };

  const addLesion = () => {
    if (!currentLesion.localizacao || !currentLesion.etiologia || !currentLesion.medida) { alert("Preencha campos obrigatórios da lesão."); return; }
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
    if (step === 4 && formData.lesoes.length === 0) { alert("Adicione uma lesão."); return; }
    if (step < totalSteps) { setStep(step + 1); document.getElementById('form-scroll-container')?.scrollTo({ top: 0, behavior: 'smooth' }); }
  };
  const prevStep = () => { if (step > 1) setStep(step - 1); };

  const handleAdminLogin = (e) => {
    e.preventDefault();
    if (loginData.user.trim().toLowerCase() === 'admin' && loginData.pass.trim() === 'lpp2026') {
      setIsAdminLoggedIn(true); setView('list'); setLoginError('');
    } else { setLoginError('Dados incorretos.'); }
  };

  const handleFinalize = async () => {
    if (!user) { alert("Sem conexão."); return; }
    if (!formData.nome || !formData.responsavel) { alert("Campos obrigatórios vazios."); return; }
    setIsSubmitting(true);
    try {
      // Salva na coleção simplificada 'prontuarios_haco'
      await addDoc(collection(db, COLLECTION_NAME), {
        ...formData, dataRegistro: new Date().toISOString(), userId: user.uid, archived: false
      });
      setIsSubmitting(false); setIsSuccess(true);
    } catch (error) { 
      setIsSubmitting(false); 
      console.error(error);
      alert("Erro ao salvar: Verifique as Permissões no Firebase."); 
    }
  };

  const fetchRecords = async () => {
    if (!user) return;
    setIsLoadingRecords(true);
    try {
      // Busca na coleção simplificada
      const qs = await getDocs(collection(db, COLLECTION_NAME));
      const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordenação
      data.sort((a, b) => new Date(b.dataRegistro || 0) - new Date(a.dataRegistro || 0));
      
      setRecords(data);
      if (data.length === 0) console.log("Nenhum registro encontrado na coleção:", COLLECTION_NAME);
      
    } catch (e) { 
      console.error("Erro fetch:", e);
      alert("Erro de Permissão: O aplicativo não consegue ler o banco. Verifique as 'Rules' no Firebase."); 
    } finally { setIsLoadingRecords(false); }
  };

  const handleArchiveRecord = async (id, status) => {
    if (!confirm(status ? "Arquivar?" : "Restaurar?")) return;
    try {
      await updateDoc(doc(db, COLLECTION_NAME, id), { archived: status });
      setRecords(prev => prev.map(r => r.id === id ? { ...r, archived: status } : r));
    } catch (e) { alert("Erro ao atualizar."); }
  };

  const handleDeleteRecord = async (id) => {
    if (!confirm("Excluir permanentemente?")) return;
    try {
      await deleteDoc(doc(db, COLLECTION_NAME, id));
      setRecords(prev => prev.filter(r => r.id !== id));
    } catch (e) { alert("Erro ao excluir."); }
  };

  const exportToCSV = () => {
    if (records.length === 0) return;
    let csv = "data:text/csv;charset=utf-8,Data,Nome,SARAM,Prontuario,Origem,Responsavel,Lesoes\n";
    records.forEach(rec => {
      const resumo = rec.lesoes?.map(l => `${l.localizacao} (${l.etiologia})`).join(' | ') || '';
      csv += `"${new Date(rec.dataRegistro).toLocaleDateString()}","${rec.nome}","${rec.saram}","${rec.prontuario}","${rec.origem}","${rec.responsavel}","${resumo}"\n`;
    });
    const link = document.createElement("a"); link.href = encodeURI(csv); link.download = "backup_pele.csv"; link.click();
  };

  useEffect(() => { if (view === 'list' && user) fetchRecords(); }, [view, user]);

  const copyToClipboard = (data) => {
    const text = `--- COMISSÃO DE PELE (HACO) ---\nPACIENTE: ${data.nome}\nSARAM: ${data.saram} | PRONT: ${data.prontuario}\nORIGEM: ${data.origem}\n\nLESÕES:\n${data.lesoes?.map((l,i)=>`${i+1}. ${l.localizacao} (${l.etiologia}) - ${l.medida}`).join('\n')}\n\nCONDUTA: ${data.condutasPrevias}\n\nResp: ${data.responsavel} - ${new Date(data.dataRegistro||Date.now()).toLocaleDateString()}`;
    navigator.clipboard.writeText(text); alert("Copiado!");
  };

  const filteredRecords = records.filter(rec => {
    const match = rec.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || rec.saram?.includes(searchTerm);
    // Se 'archived' não existir (registros antigos), considera como false (ativo)
    const isArchived = !!rec.archived;
    return match && (showArchived ? isArchived : !isArchived);
  });

  // --- COMPONENTES VISUAIS ---
  const InputGroup = ({ label, children }) => (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 mb-3">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">{label}</label>
      {children}
    </div>
  );

  const AppInput = ({ ...props }) => (
    <input 
      className="w-full text-base font-medium text-slate-900 placeholder:text-slate-300 outline-none bg-transparent h-10 border-b border-slate-100 focus:border-blue-500 transition-colors"
      {...props}
    />
  );

  const StepIndicator = () => (
    <div className="flex items-center gap-1 mb-4 px-1">
      {[1,2,3,4,5].map(s => (
        <div key={s} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`} />
      ))}
    </div>
  );

  // --- RENDERIZAÇÃO DE PASSOS ---
  const renderFormStep = () => {
    switch(step) {
      case 1: return (
        <div className="animate-fade-in space-y-2">
          <h2 className="text-xl font-bold text-slate-900 px-1 mb-2">Identificação</h2>
          <InputGroup label="Dados Pessoais">
            <AppInput placeholder="Nome Completo" value={formData.nome} onChange={e=>handleChange('nome', e.target.value)} />
            <div className="mt-3">
              <label className="text-[10px] text-slate-400 block mb-1">Data de Nascimento</label>
              <AppInput type="date" value={formData.nascimento} onChange={e=>handleChange('nascimento', e.target.value)} />
            </div>
          </InputGroup>
          <InputGroup label="Dados Militares / Hospitalares">
            <div className="grid grid-cols-2 gap-4">
              <AppInput type="tel" placeholder="SARAM" value={formData.saram} onChange={e=>handleChange('saram', e.target.value)} />
              <AppInput type="tel" placeholder="Prontuário" value={formData.prontuario} onChange={e=>handleChange('prontuario', e.target.value)} />
            </div>
          </InputGroup>
          <InputGroup label="Origem da Solicitação">
            <div className="grid grid-cols-3 gap-2">
              {['UPI','UTI','UPA','UCC','SAD','CAIS'].map(opt => (
                <button key={opt} type="button" onClick={()=>handleChange('origem', opt)} className={`py-3 rounded-xl text-sm font-bold transition-all ${formData.origem === opt ? 'bg-blue-600 text-white shadow-md transform scale-105' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'}`}>{opt}</button>
              ))}
            </div>
          </InputGroup>
        </div>
      );
      case 2: return (
        <div className="animate-fade-in space-y-2">
          <h2 className="text-xl font-bold text-slate-900 px-1 mb-2">Dados Clínicos</h2>
          <InputGroup label="Comorbidades">
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['HAS','DM','D. Arterial','D. Venosa','Neoplasia'].map(i => (
                <button key={i} type="button" onClick={()=>toggleComorbidade(i)} className={`p-3 text-sm font-medium rounded-xl border transition-all ${formData.comorbidades.includes(i)?'bg-blue-600 text-white border-blue-600':'bg-slate-50 text-slate-600 border-transparent'}`}>{i}</button>
              ))}
            </div>
            <AppInput placeholder="Outra comorbidade..." value={formData.outraComorbidade} onChange={e=>handleChange('outraComorbidade', e.target.value)} />
          </InputGroup>
          <InputGroup label="Histórico">
            <div className="space-y-4">
              <textarea rows="2" placeholder="Medicações..." className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-blue-100" value={formData.medicacoes} onChange={e=>handleChange('medicacoes', e.target.value)} />
              <textarea rows="2" placeholder="Cirurgias..." className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-blue-100" value={formData.cirurgias} onChange={e=>handleChange('cirurgias', e.target.value)} />
            </div>
          </InputGroup>
        </div>
      );
      case 3: return (
        <div className="animate-fade-in space-y-2">
          <h2 className="text-xl font-bold text-slate-900 px-1 mb-2">Dados Sociais</h2>
          <InputGroup label="Suporte Domiciliar">
            <p className="text-sm text-slate-600 mb-3">Possui cuidador apto?</p>
            <div className="flex gap-2">{['Sim', 'Não'].map(opt => (<button key={opt} type="button" onClick={()=>handleChange('temCuidador', opt)} className={`flex-1 py-3 rounded-xl font-bold ${formData.temCuidador===opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{opt}</button>))}</div>
          </InputGroup>
          <InputGroup label="Acompanhamento">
            <p className="text-sm text-slate-600 mb-3">Acomp. Ambulatorial?</p>
            <div className="flex gap-2 mb-4">{['Sim', 'Não'].map(opt => (<button key={opt} type="button" onClick={()=>handleChange('acompanhamentoAmbu', opt)} className={`flex-1 py-3 rounded-xl font-bold ${formData.acompanhamentoAmbu===opt ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-600'}`}>{opt}</button>))}</div>
            {formData.acompanhamentoAmbu === 'Sim' && (<AppInput placeholder="Qual especialista?" value={formData.especialistaAmbu} onChange={e=>handleChange('especialistaAmbu',e.target.value)} />)}
          </InputGroup>
        </div>
      );
      case 4: return (
        <div className="animate-fade-in space-y-4">
          <h2 className="text-xl font-bold text-slate-900 px-1 mb-2">Registro de Lesões</h2>
          {formData.lesoes.length > 0 && (
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x hide-scrollbar">
              {formData.lesoes.map((lesao, idx) => (
                <div key={lesao.id} className="snap-center shrink-0 w-72 bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex gap-3 items-center">
                  <div className="h-16 w-16 bg-slate-100 rounded-xl overflow-hidden shrink-0">
                    {lesao.foto ? <img src={lesao.foto} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-slate-300"><ImageIcon size={20}/></div>}
                  </div>
                  <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{lesao.localizacao}</p><p className="text-xs text-slate-500 truncate">{lesao.etiologia}</p><p className="text-[10px] font-bold text-blue-600 mt-1 bg-blue-50 inline-block px-1.5 rounded">{lesao.medida}</p></div>
                  <button onClick={() => removeLesion(lesao.id)} className="text-slate-300 hover:text-red-500"><X size={20}/></button>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nova Lesão</span><span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-1 rounded-full">#{formData.lesoes.length + 1}</span></div>
            <div className="space-y-4">
              <AppInput placeholder="Localização (ex: Sacral)" value={currentLesion.localizacao} onChange={e=>handleLesionChange('localizacao', e.target.value)} />
              <div className="relative"><select className="w-full appearance-none bg-slate-50 p-3 rounded-xl text-sm font-medium text-slate-700 outline-none" value={currentLesion.etiologia} onChange={e=>handleLesionChange('etiologia', e.target.value)}><option value="">Selecione a Etiologia...</option><option value="Lesão por pressão">Lesão por pressão (LPP)</option><option value="Lesão arterial">Lesão arterial</option><option value="Lesão venosa">Lesão venosa</option><option value="Queimadura">Queimadura</option><option value="Deiscência Cirúrgica">Deiscência</option><option value="Outro">Outro</option></select><ChevronDown className="absolute right-3 top-3.5 text-slate-400 pointer-events-none" size={16}/></div>
              {currentLesion.etiologia === 'Lesão por pressão' && (<div className="bg-orange-50 p-3 rounded-xl border border-orange-100"><label className="text-[10px] font-bold text-orange-700 uppercase mb-1 block">Classificação NPUAP</label><select className="w-full bg-white p-2 rounded-lg text-sm text-slate-700 outline-none" value={currentLesion.estagio} onChange={e=>handleLesionChange('estagio', e.target.value)}><option value="">Selecione...</option><option value="Estágio 1">Estágio 1</option><option value="Estágio 2">Estágio 2</option><option value="Estágio 3">Estágio 3</option><option value="Estágio 4">Estágio 4</option><option value="Não Classificável">Não Classificável</option><option value="Tecidos Profundos">Tecidos Profundos</option></select></div>)}
              <div className="grid grid-cols-2 gap-3"><AppInput placeholder="Medidas (CxLxP)" value={currentLesion.medida} onChange={e=>handleLesionChange('medida', e.target.value)} /><AppInput placeholder="Tempo (dias)" value={currentLesion.tempoEvolucao} onChange={e=>handleLesionChange('tempoEvolucao', e.target.value)} /></div>
              <label className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl cursor-pointer active:bg-slate-100 transition-colors"><div className="h-10 w-10 bg-white rounded-full flex items-center justify-center text-blue-500 shadow-sm border border-slate-100"><Camera size={20}/></div><div className="flex-1"><span className="text-sm font-bold text-slate-700 block">{currentLesion.foto ? 'Foto Anexada' : 'Tirar Foto'}</span><span className="text-[10px] text-slate-400 block">{currentLesion.foto ? 'Toque para trocar' : 'Opcional'}</span></div><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />{currentLesion.foto && <div className="h-10 w-10 rounded-lg overflow-hidden border border-white shadow-sm"><img src={currentLesion.foto} className="w-full h-full object-cover"/></div>}</label>
              <button type="button" onClick={addLesion} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Plus size={20}/> Salvar Lesão</button>
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Condutas / Cuidados</label><textarea rows="3" className="w-full p-3 bg-slate-50 rounded-xl text-sm outline-none resize-none focus:ring-2 focus:ring-blue-100" placeholder="Descreva os curativos e condutas..." value={formData.condutasPrevias} onChange={e=>handleChange('condutasPrevias',e.target.value)} /></div>
        </div>
      );
      case 5: return (
        <div className="animate-fade-in space-y-6 pt-4 text-center">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-blue-600 mb-2 shadow-sm"><Stethoscope size={36}/></div>
          <div><h2 className="text-2xl font-bold text-slate-900">Resumo Final</h2><p className="text-slate-500 text-sm">Confira os dados antes de enviar.</p></div>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 text-left space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-50"><span className="text-xs font-bold text-slate-400 uppercase">Paciente</span><span className="font-bold text-slate-800">{formData.nome}</span></div>
            <div className="flex justify-between items-center pb-3 border-b border-slate-50"><span className="text-xs font-bold text-slate-400 uppercase">Lesões</span><span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{formData.lesoes.length} registradas</span></div>
            <div><span className="text-xs font-bold text-slate-400 uppercase mb-2 block">Seu Nome (Responsável)</span><input type="text" className="w-full p-3 bg-slate-50 rounded-xl font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Digite seu nome..." value={formData.responsavel} onChange={e=>handleChange('responsavel',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}}/></div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-fade-in">
        <div className="w-24 h-24 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-6"><Check size={48}/></div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">Sucesso!</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Paciente registrado com segurança.</p>
        <div className="w-full max-w-xs space-y-3">
          <button onClick={()=>copyToClipboard(formData)} className="w-full py-4 bg-slate-50 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Copy size={20}/> Copiar Evolução</button>
          <button onClick={()=>{setIsSuccess(false); setStep(1); setFormData({...formData, nome:'', saram:'', prontuario:'', lesoes:[], responsavel:''});}} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform"><Plus size={20}/> Novo Cadastro</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-blue-100 flex justify-center">
      <div className="w-full max-w-md bg-white min-h-screen shadow-2xl relative flex flex-col">
        <div className="bg-white/90 backdrop-blur-md sticky top-0 z-50 px-5 py-4 flex justify-between items-center border-b border-slate-50">
          <div><h1 className="font-bold text-xl text-slate-800 tracking-tight">Comissão de Prevenção <br>de Lesões de Pele</h1><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Hospital de Aeronáutica de Canoas</p></div>
          <button onClick={() => { if(view==='form'){ if(isAdminLoggedIn) setView('list'); else setView('login'); } else setView('form'); }} className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors">{view==='form'?<Lock size={18}/>:<ArrowLeft size={18}/>}</button>
        </div>

        {view === 'login' && (
           <div className="flex-1 flex flex-col justify-center p-8">
             <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4"><Lock size={32}/></div><h2 className="text-2xl font-bold text-slate-800">Acesso Admin</h2></div>
             <form onSubmit={handleAdminLogin} className="space-y-4">
               <input type="text" placeholder="Usuário" className="w-full p-4 rounded-2xl bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500" value={loginData.user} onChange={e=>setLoginData({...loginData, user:e.target.value})}/>
               <input type="password" placeholder="Senha" className="w-full p-4 rounded-2xl bg-slate-50 font-medium outline-none focus:ring-2 focus:ring-blue-500" value={loginData.pass} onChange={e=>setLoginData({...loginData, pass:e.target.value})}/>
               {loginError && <p className="text-red-500 text-sm text-center font-bold">{loginError}</p>}
               <button className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">Entrar</button>
             </form>
           </div>
        )}

        {view === 'list' && isAdminLoggedIn && (
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="bg-white px-4 pb-4 pt-2 shadow-sm z-40 sticky top-[73px]">
               <div className="bg-slate-100 rounded-xl flex items-center px-4 py-3 mb-3"><Search className="text-slate-400 mr-3" size={20}/><input type="text" placeholder="Buscar prontuário..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="bg-transparent w-full outline-none font-medium"/></div>
               <div className="flex justify-between">
                 <button onClick={exportToCSV} className="text-green-600 text-xs font-bold flex items-center gap-1 bg-green-50 px-3 py-2 rounded-lg"><FileSpreadsheet size={16}/> CSV</button>
                 <div className="flex gap-2">
                   <button onClick={fetchRecords} className="text-blue-600 bg-blue-50 h-8 w-8 rounded-lg flex items-center justify-center"><RefreshCcw size={16} className={isLoadingRecords?'animate-spin':''}/></button>
                   <button onClick={()=>setShowArchived(!showArchived)} className={`h-8 w-8 rounded-lg flex items-center justify-center ${showArchived?'bg-slate-800 text-white':'bg-slate-100 text-slate-500'}`}>{showArchived?<List size={16}/>:<Archive size={16}/>}</button>
                 </div>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
               {filteredRecords.map(rec => (
                 <div key={rec.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
                    <div className="flex justify-between items-start mb-3">
                      <div><h3 className="font-bold text-slate-800 text-lg">{rec.nome}</h3><div className="flex gap-2 mt-1"><span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-md">{rec.origem}</span></div></div>
                      <span className="text-[10px] font-bold text-slate-400">{new Date(rec.dataRegistro).toLocaleDateString()}</span>
                    </div>
                    {expandedRecordId === rec.id ? (
                      <div className="space-y-4 animate-fade-in pt-2 border-t border-slate-50 mt-2">
                        <div className="grid grid-cols-2 gap-3 text-xs">
                           <div className="bg-slate-50 p-2 rounded-lg"><p className="text-slate-400 font-bold uppercase text-[10px]">SARAM</p><p className="font-bold">{rec.saram}</p></div>
                           <div className="bg-slate-50 p-2 rounded-lg"><p className="text-slate-400 font-bold uppercase text-[10px]">Prontuário</p><p className="font-bold">{rec.prontuario}</p></div>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-bold text-slate-400 uppercase">Lesões ({rec.lesoes?.length})</p>
                          {rec.lesoes?.map((l, i) => (
                            <div key={i} className="flex gap-3 bg-slate-50 p-2 rounded-xl">
                              {l.foto ? <div onClick={() => {const w = window.open(); w.document.write('<img src="'+l.foto+'" style="width:100%"/>');}} className="h-12 w-12 rounded-lg overflow-hidden shrink-0"><img src={l.foto} className="w-full h-full object-cover"/></div> : <div className="h-12 w-12 bg-white rounded-lg flex items-center justify-center shrink-0 border border-slate-100"><ImageIcon size={16} className="text-slate-300"/></div>}
                              <div className="text-xs"><p className="font-bold text-slate-800">{l.localizacao}</p><p className="text-slate-500">{l.etiologia}</p></div>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-2">
                           <button onClick={()=>copyToClipboard(rec)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold active:scale-95">Copiar Texto</button>
                           <button onClick={() => setExpandedRecordId(null)} className="px-4 bg-slate-100 rounded-xl"><ChevronUp size={16}/></button>
                        </div>
                        <div className="flex justify-center gap-6 pt-2 border-t border-slate-50">
                           <button onClick={()=>handleArchiveRecord(rec.id, !showArchived)} className="text-slate-400 hover:text-orange-500"><Archive size={18}/></button>
                           <button onClick={()=>handleDeleteRecord(rec.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setExpandedRecordId(rec.id)} className="w-full py-2 mt-2 bg-slate-50 text-blue-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1">Ver Detalhes <ChevronDown size={14}/></button>
                    )}
                 </div>
               ))}
               {filteredRecords.length === 0 && <div className="text-center py-10 text-slate-400 flex flex-col items-center gap-2"><Search size={30}/><p>Nenhum registro.</p></div>}
            </div>
          </div>
        )}

        {view === 'form' && (
          <div className="flex-1 flex flex-col relative bg-slate-50">
            <div id="form-scroll-container" className="p-5 flex-1 overflow-y-auto pb-28"> 
               <StepIndicator />
               <form onSubmit={e=>e.preventDefault()}>{renderFormStep()}</form>
            </div>
            <div className="absolute bottom-0 w-full bg-white border-t border-slate-100 p-4 pb-8 flex gap-3 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
               <button onClick={prevStep} disabled={step===1} className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all ${step===1 ? 'text-slate-200 bg-slate-50' : 'text-slate-600 bg-slate-100 active:scale-95'}`}><ChevronLeft size={24}/></button>
               {step < totalSteps ? (
                 <button onClick={nextStep} className="flex-1 h-14 bg-blue-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-200 active:scale-95 transition-transform flex items-center justify-center gap-2">Próximo <ChevronRight size={20}/></button>
               ) : (
                 <button onClick={handleFinalize} disabled={isSubmitting} className="flex-1 h-14 bg-green-600 text-white rounded-2xl font-bold text-lg shadow-xl shadow-green-200 active:scale-95 transition-transform flex items-center justify-center gap-2">
                   {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <>Finalizar <Save size={20}/></>}
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
