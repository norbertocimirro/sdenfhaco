import React, { useState, useEffect } from 'react';
import { 
  User, Calendar, FileText, Activity, Pill, Scissors, 
  Home, Stethoscope, AlertCircle, Check, ChevronRight, ChevronLeft, 
  Clipboard, Copy, Save, Loader2, List, Search, ArrowLeft, Lock, Key, Eye, EyeOff,
  Trash2, Archive, RefreshCcw, Plus, X, Camera, ChevronDown, ChevronUp, Image as ImageIcon,
  Download, FileSpreadsheet, MapPin, Maximize2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';

// --- CONFIGURAÇÃO REAL (MANTIDA) ---
const myRealFirebaseConfig = {
  apiKey: "AIzaSyDrL5MNSRkPsCOkKTPT-aD5EpHV7158cFI",
  authDomain: "lpphaco.firebaseapp.com",
  projectId: "lpphaco",
  storageBucket: "lpphaco.firebasestorage.app",
  messagingSenderId: "142640845534",
  appId: "1:142640845534:web:580207dbbca7b805c3a84f"
};

const firebaseConfig = (typeof __firebase_config !== 'undefined') ? JSON.parse(__firebase_config) : myRealFirebaseConfig;
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'haco-comissao-pele-v1';

const App = () => {
  const [view, setView] = useState('form'); 
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [loginData, setLoginData] = useState({ user: '', pass: '' });
  const [loginError, setLoginError] = useState('');
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [authStatus, setAuthStatus] = useState('...');
  
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
      } catch (error) { console.error(error); setAuthStatus('Erro'); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setAuthStatus(u ? 'Online' : 'Offline'); });
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
    if (!currentLesion.localizacao || !currentLesion.etiologia || !currentLesion.medida) { alert("Preencha os campos obrigatórios."); return; }
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
    if (step < totalSteps) { setStep(step + 1); window.scrollTo(0, 0); }
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
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes'), {
        ...formData, dataRegistro: new Date().toISOString(), userId: user.uid, archived: false
      });
      setIsSubmitting(false); setIsSuccess(true);
    } catch (error) { setIsSubmitting(false); alert("Erro ao salvar."); }
  };

  const fetchRecords = async () => {
    if (!user) return;
    setIsLoadingRecords(true);
    try {
      const qs = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'registros_lesoes'));
      const data = qs.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => new Date(b.dataRegistro || 0) - new Date(a.dataRegistro || 0));
      setRecords(data);
    } catch (e) { alert("Erro ao ler."); } finally { setIsLoadingRecords(false); }
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
    return match && (showArchived ? rec.archived : !rec.archived);
  });

  // --- RENDERIZAÇÃO ---
  const renderFormStep = () => {
    switch(step) {
      case 1: return (
        <div className="space-y-5 animate-fade-in pb-20">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4"><User className="text-blue-600"/> Identificação</h2>
          <div className="space-y-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nome Completo</label><input type="text" value={formData.nome} onChange={e=>handleChange('nome', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white text-lg font-medium focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" placeholder="Ex: João Silva"/></div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nascimento</label><input type="date" value={formData.nascimento} onChange={e=>handleChange('nascimento', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">SARAM</label><input type="tel" value={formData.saram} onChange={e=>handleChange('saram', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none font-mono"/></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Prontuário</label><input type="tel" value={formData.prontuario} onChange={e=>handleChange('prontuario', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none font-mono"/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Origem</label><select value={formData.origem} onChange={e=>handleChange('origem', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none appearance-none"><option value="">Selecione...</option><option value="UPI">UPI</option><option value="UTI">UTI</option><option value="UPA">UPA</option><option value="UCC">UCC</option><option value="SAD">SAD</option><option value="CAIS">CAIS</option></select></div>
            </div>
          </div>
        </div>
      );
      case 2: return (
        <div className="space-y-5 animate-fade-in pb-20">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4"><Activity className="text-blue-600"/> Clínico</h2>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2 block">Comorbidades</label>
            <div className="grid grid-cols-2 gap-2">
              {['HAS','DM','D. Arterial','D. Venosa','Neoplasia','Outro'].map(i=>(<button key={i} type="button" onClick={()=>toggleComorbidade(i)} className={`p-3 text-sm font-medium rounded-xl border transition-all ${formData.comorbidades.includes(i)?'bg-blue-600 text-white border-blue-600 shadow-md':'bg-white text-slate-600 border-slate-200'}`}>{i}</button>))}
            </div>
            {formData.comorbidades.includes('Outro') && <input type="text" placeholder="Qual?" value={formData.outraComorbidade} onChange={e=>handleChange('outraComorbidade',e.target.value)} className="mt-3 w-full p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"/>}
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Medicações</label><textarea rows="2" value={formData.medicacoes} onChange={e=>handleChange('medicacoes',e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"/></div>
          <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Cirurgias</label><textarea rows="2" value={formData.cirurgias} onChange={e=>handleChange('cirurgias',e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none"/></div>
        </div>
      );
      case 3: return (
        <div className="space-y-5 animate-fade-in pb-20">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-4"><Home className="text-blue-600"/> Social</h2>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-sm font-semibold text-slate-800 block mb-3">Cuidador Domiciliar?</label>
            <div className="flex gap-2">{['Sim','Não'].map(o=><button key={o} type="button" onClick={()=>handleChange('temCuidador',o)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.temCuidador===o?'bg-blue-600 text-white shadow-md':'bg-slate-50 text-slate-600'}`}>{o}</button>)}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-sm font-semibold text-slate-800 block mb-3">Acomp. Ambulatorial?</label>
            <div className="flex gap-2 mb-3">{['Sim','Não'].map(o=><button key={o} type="button" onClick={()=>handleChange('acompanhamentoAmbu',o)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${formData.acompanhamentoAmbu===o?'bg-blue-600 text-white shadow-md':'bg-slate-50 text-slate-600'}`}>{o}</button>)}</div>
            {formData.acompanhamentoAmbu==='Sim' && <input type="text" placeholder="Qual especialista?" value={formData.especialistaAmbu} onChange={e=>handleChange('especialistaAmbu',e.target.value)} className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"/>}
          </div>
        </div>
      );
      case 4: return (
        <div className="space-y-5 animate-fade-in pb-20">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 mb-2"><AlertCircle className="text-red-600"/> Lesões</h2>
          {formData.lesoes.length > 0 && (
            <div className="flex overflow-x-auto gap-3 pb-2 -mx-2 px-2 snap-x">
              {formData.lesoes.map((lesao, idx) => (
                <div key={lesao.id} className="snap-center shrink-0 w-64 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-2">
                  <div className="flex items-center gap-2 justify-between">
                    <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-1 rounded-full">#{idx+1}</span>
                    <button onClick={() => removeLesion(lesao.id)} className="text-slate-400 hover:text-red-500"><X size={16}/></button>
                  </div>
                  <div className="flex gap-3">
                    {lesao.foto ? <img src={lesao.foto} className="w-16 h-16 rounded-lg object-cover bg-slate-100"/> : <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300"><ImageIcon/></div>}
                    <div className="flex-1 min-w-0"><p className="font-bold text-slate-800 text-sm truncate">{lesao.localizacao}</p><p className="text-xs text-slate-500 truncate">{lesao.etiologia}</p><p className="text-xs text-slate-400 mt-1">{lesao.medida}</p></div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-md">
            <div className="flex justify-between items-center mb-4"><span className="text-xs font-bold bg-blue-600 text-white px-2 py-1 rounded-md uppercase tracking-wider">Nova Lesão</span></div>
            <div className="space-y-4">
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Localização</label><input type="text" value={currentLesion.localizacao} onChange={e=>handleLesionChange('localizacao', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" placeholder="Ex: Sacral"/></div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Etiologia</label><select value={currentLesion.etiologia} onChange={e=>handleLesionChange('etiologia', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none"><option value="">Selecione...</option><option value="Lesão por pressão">Lesão por pressão</option><option value="Lesão arterial">Lesão arterial</option><option value="Lesão venosa">Lesão venosa</option><option value="Queimadura">Queimadura</option><option value="Deiscência Cirúrgica">Deiscência</option><option value="Outro">Outro</option></select></div>
              {currentLesion.etiologia === 'Lesão por pressão' && (
                <div className="bg-blue-50 p-3 rounded-xl"><label className="text-xs font-bold text-blue-700 uppercase tracking-wide">Estágio LPP</label><select value={currentLesion.estagio} onChange={e=>handleLesionChange('estagio', e.target.value)} className="w-full mt-1 p-2 rounded-lg border border-blue-200 bg-white outline-none text-sm"><option value="">Selecione...</option><option value="Estágio 1">Estágio 1</option><option value="Estágio 2">Estágio 2</option><option value="Estágio 3">Estágio 3</option><option value="Estágio 4">Estágio 4</option><option value="Não Classificável">Não Classificável</option><option value="Tecidos Profundos">Tecidos Profundos</option></select></div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Medidas</label><input type="text" value={currentLesion.medida} onChange={e=>handleLesionChange('medida', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" placeholder="CxLxP"/></div>
                <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Evolução</label><input type="text" value={currentLesion.tempoEvolucao} onChange={e=>handleLesionChange('tempoEvolucao', e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-slate-50 outline-none" placeholder="Dias"/></div>
              </div>
              <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-1 block">Foto</label><label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 cursor-pointer active:bg-blue-50 transition-colors"><div className="flex flex-col items-center gap-1 text-slate-400"><Camera size={24}/><span className="text-xs font-medium">{currentLesion.foto ? 'Foto OK (Toque para trocar)' : 'Adicionar Foto'}</span></div><input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" /></label>{currentLesion.foto && <div className="mt-2 relative inline-block"><img src={currentLesion.foto} className="h-20 w-20 object-cover rounded-lg border shadow-sm"/><button onClick={()=>setCurrentLesion(p=>({...p, foto:null}))} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><X size={12}/></button></div>}</div>
              <button type="button" onClick={addLesion} className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"><Plus size={18}/> Salvar Lesão</button>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Condutas</label><textarea rows="3" value={formData.condutasPrevias} onChange={e=>handleChange('condutasPrevias',e.target.value)} className="w-full mt-1 p-3 rounded-xl border border-slate-200 bg-white shadow-sm outline-none" placeholder="Descreva os cuidados..."/></div>
          </div>
        </div>
      );
      case 5: return (
        <div className="space-y-6 animate-fade-in pb-20 text-center">
          <div className="bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col items-center gap-4">
            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2"><Stethoscope size={32}/></div>
            <div><h2 className="text-2xl font-bold text-slate-800">Quase lá!</h2><p className="text-slate-500">Confira os dados antes de finalizar.</p></div>
            <div className="w-full bg-slate-50 p-4 rounded-xl text-left text-sm border border-slate-100 space-y-2">
              <div className="flex justify-between border-b pb-2"><span>Paciente</span><span className="font-bold text-slate-800">{formData.nome}</span></div>
              <div className="flex justify-between border-b pb-2"><span>Lesões</span><span className="font-bold text-slate-800">{formData.lesoes.length}</span></div>
              <div className="flex justify-between"><span>Origem</span><span className="font-bold text-slate-800">{formData.origem}</span></div>
            </div>
            <div className="w-full text-left"><label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1">Seu Nome (Responsável)</label><input type="text" value={formData.responsavel} onChange={e=>handleChange('responsavel',e.target.value)} onKeyDown={e=>{if(e.key==='Enter')e.preventDefault()}} className="w-full mt-1 p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-blue-900 font-bold outline-none focus:ring-2 focus:ring-blue-500" placeholder="Digite seu nome completo..."/></div>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 selection:bg-blue-100">
      <div className="w-full max-w-lg mx-auto bg-white min-h-screen shadow-2xl relative flex flex-col">
        {/* HEADER */}
        <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><Clipboard size={20}/></div>
            <div><h1 className="font-bold text-slate-800 leading-tight">Comissão Pele</h1><p className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">HACO</p></div>
          </div>
          <button onClick={() => { if(view==='form'){ if(isAdminLoggedIn) setView('list'); else setView('login'); } else setView('form'); }} className="p-2 bg-slate-50 rounded-lg text-slate-500 hover:bg-slate-100 active:scale-95 transition-all">{view==='form'?<Lock size={20}/>:<ArrowLeft size={20}/>}</button>
        </div>

        {/* LOGIN */}
        {view === 'login' && (
           <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50">
             <div className="w-full bg-white p-8 rounded-3xl shadow-xl">
               <div className="text-center mb-8"><div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mx-auto mb-4"><Lock size={32}/></div><h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2><p className="text-slate-400 text-sm">Área exclusiva para membros da comissão.</p></div>
               <form onSubmit={handleAdminLogin} className="space-y-4">
                 <input type="text" placeholder="Usuário" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={loginData.user} onChange={e=>setLoginData({...loginData, user:e.target.value})}/>
                 <input type="password" placeholder="Senha" className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all" value={loginData.pass} onChange={e=>setLoginData({...loginData, pass:e.target.value})}/>
                 {loginError && <p className="text-red-500 text-xs text-center font-bold">{loginError}</p>}
                 <button className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 active:scale-95 transition-all">Entrar</button>
               </form>
             </div>
           </div>
        )}

        {/* ADMIN LIST */}
        {view === 'list' && isAdminLoggedIn && (
          <div className="flex-1 flex flex-col bg-slate-50">
            <div className="bg-white p-4 border-b border-slate-100 space-y-3 sticky top-[65px] z-40">
               <div className="flex gap-2">
                 <div className="flex-1 bg-slate-100 rounded-xl flex items-center px-3"><Search className="text-slate-400" size={18}/><input type="text" placeholder="Buscar..." value={searchTerm} onChange={e=>setSearchTerm(e.target.value)} className="w-full p-3 bg-transparent outline-none text-sm font-medium"/></div>
                 <button onClick={()=>setShowArchived(!showArchived)} className={`p-3 rounded-xl border ${showArchived?'bg-slate-200 text-slate-800 border-slate-300':'bg-white text-slate-400 border-slate-200'}`}>{showArchived?<List size={20}/>:<Archive size={20}/>}</button>
               </div>
               <div className="flex gap-2 overflow-x-auto pb-1">
                 <button onClick={exportToCSV} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100 whitespace-nowrap"><FileSpreadsheet size={14}/> CSV</button>
                 <button onClick={fetchRecords} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 whitespace-nowrap"><RefreshCcw size={14} className={isLoadingRecords?'animate-spin':''}/> Atualizar</button>
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
               {filteredRecords.map(rec => (
                 <div key={rec.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg leading-tight">{rec.nome}</h3>
                        <div className="flex gap-2 mt-2">
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-md">{rec.saram}</span>
                          <span className="text-[10px] font-bold bg-purple-50 text-purple-600 px-2 py-1 rounded-md">{rec.origem}</span>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{new Date(rec.dataRegistro).toLocaleDateString()}</span>
                    </div>
                    
                    {expandedRecordId === rec.id ? (
                      <div className="p-4 bg-slate-50/50 animate-fade-in">
                        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                           <div className="bg-white p-2 rounded-lg border border-slate-100"><p className="text-slate-400 font-bold uppercase text-[10px]">Nascimento</p><p className="font-medium">{rec.nascimento ? new Date(rec.nascimento).toLocaleDateString() : '-'}</p></div>
                           <div className="bg-white p-2 rounded-lg border border-slate-100"><p className="text-slate-400 font-bold uppercase text-[10px]">Comorbidades</p><p className="font-medium truncate">{rec.comorbidades?.join(', ') || '-'}</p></div>
                        </div>
                        
                        <div className="space-y-3 mb-4">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wide ml-1">Galeria de Lesões</p>
                          <div className="flex overflow-x-auto gap-3 pb-2">
                            {rec.lesoes?.map((l, i) => (
                              <div key={i} className="shrink-0 w-40 bg-white p-2 rounded-xl border border-slate-200 shadow-sm">
                                <div className="h-24 bg-slate-100 rounded-lg overflow-hidden mb-2 relative">
                                  {l.foto ? <img src={l.foto} className="w-full h-full object-cover" onClick={() => {const w = window.open(); w.document.write('<img src="'+l.foto+'" style="width:100%"/>');}}/> : <div className="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon/></div>}
                                  <span className="absolute top-1 left-1 bg-black/50 text-white text-[10px] px-1.5 rounded">#{i+1}</span>
                                </div>
                                <p className="font-bold text-xs truncate">{l.localizacao}</p>
                                <p className="text-[10px] text-slate-500 truncate">{l.etiologia}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2 border-t border-slate-200">
                           <button onClick={()=>copyToClipboard(rec)} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 active:scale-95"><Copy size={14}/> Copiar</button>
                           <button onClick={() => setExpandedRecordId(null)} className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-600">Fechar</button>
                        </div>
                        <div className="flex justify-center gap-4 mt-4 pt-2">
                           <button onClick={()=>handleArchiveRecord(rec.id, !showArchived)} className="text-[10px] text-slate-400 hover:text-orange-500 flex items-center gap-1"><Archive size={12}/> {showArchived?'Restaurar':'Arquivar'}</button>
                           <button onClick={()=>handleDeleteRecord(rec.id)} className="text-[10px] text-slate-400 hover:text-red-500 flex items-center gap-1"><Trash2 size={12}/> Excluir</button>
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 py-3 bg-slate-50 flex justify-between items-center">
                         <div className="flex -space-x-2">
                           {rec.lesoes?.slice(0,3).map((l,i)=><div key={i} className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-[8px] font-bold text-blue-600">{i+1}</div>)}
                           {rec.lesoes?.length > 3 && <div className="w-6 h-6 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-[8px] font-bold text-slate-600">+{rec.lesoes.length-3}</div>}
                         </div>
                         <button onClick={() => setExpandedRecordId(rec.id)} className="text-xs font-bold text-blue-600 flex items-center gap-1">Ver Detalhes <ChevronDown size={14}/></button>
                      </div>
                    )}
                 </div>
               ))}
               {filteredRecords.length === 0 && <div className="text-center py-20 opacity-50"><Search size={40} className="mx-auto mb-2 text-slate-300"/><p>Nada encontrado</p></div>}
            </div>
          </div>
        )}

        {/* FORMULÁRIO */}
        {view === 'form' && (
          <div className="flex-1 flex flex-col relative">
            <div id="form-container" className="flex-1 overflow-y-auto p-5 pb-32">
               {isSuccess ? (
                 <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
                   <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6 shadow-lg shadow-green-200"><Check size={48}/></div>
                   <h2 className="text-3xl font-bold text-slate-800 mb-2">Sucesso!</h2>
                   <p className="text-slate-500 mb-8 max-w-xs mx-auto">Os dados do paciente foram registrados com segurança.</p>
                   <div className="w-full space-y-3">
                     <button onClick={()=>copyToClipboard(formData)} className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"><Copy size={20}/> Copiar Evolução</button>
                     <button onClick={()=>{setIsSuccess(false); setStep(1); setFormData({...formData, nome:'', saram:'', prontuario:'', lesoes:[], responsavel:''});}} className="w-full py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-xl shadow-blue-200 active:scale-95 transition-transform"><Plus size={20}/> Novo Cadastro</button>
                   </div>
                 </div>
               ) : (
                 <form onSubmit={e=>e.preventDefault()}>
                   <div className="mb-6 flex justify-between items-center">
                     <div className="flex gap-1">
                       {[1,2,3,4,5].map(s => (
                         <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${s <= step ? 'bg-blue-600' : 'bg-slate-200'}`}></div>
                       ))}
                     </div>
                     <span className="text-xs font-bold text-slate-400">Passo {step}/5</span>
                   </div>
                   {renderFormStep()}
                 </form>
               )}
            </div>
            
            {!isSuccess && (
              <div className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-100 p-4 pb-6 flex gap-3 z-30 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
                 <button onClick={prevStep} disabled={step===1} className={`px-5 rounded-xl font-bold flex items-center justify-center transition-all ${step===1 ? 'text-slate-300 bg-slate-50' : 'text-slate-600 bg-slate-100 active:bg-slate-200'}`}><ChevronLeft size={24}/></button>
                 {step < totalSteps ? (
                   <button onClick={nextStep} className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform text-lg">Próximo <ChevronRight size={20}/></button>
                 ) : (
                   <button onClick={handleFinalize} disabled={isSubmitting} className="flex-1 py-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-200 active:scale-95 transition-transform text-lg">
                     {isSubmitting ? <Loader2 className="animate-spin" size={24}/> : <>Finalizar <Save size={20}/></>}
                   </button>
                 )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
