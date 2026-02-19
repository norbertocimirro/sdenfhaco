import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, Users, FileText, Activity, AlertCircle, 
  Menu, LogOut, ShieldAlert, ArrowRightLeft, 
  Star, Sun, Palmtree, CalendarRange, Cake, BookOpen, 
  Plus, Trash2, Lock, CheckCircle, Eye, Thermometer, TrendingDown,
  Plane, Stethoscope, RefreshCw, Send, X as CloseIcon, Save, Loader2,
  Paperclip, ExternalLink, GraduationCap, Clock
} from 'lucide-react';

// --- CONFIGURAÇÃO DE CONEXÃO ---
const API_URL_GESTAO = "https://script.google.com/macros/s/AKfycbyrPu0E3wCU4_rNEEium7GGvG9k9FtzFswLiTy9iwZgeL345WiTyu7CUToZaCy2cxk/exec"; 
const API_URL_INDICADORES = "https://script.google.com/macros/s/AKfycbxJp8-2qRibag95GfPnazUNWC-EdA8VUFYecZHg9Pp1hl5OlR3kofF-HbElRYCGcdv0/exec"; 

// --- CONSTANTES E HELPERS ---

const INITIAL_UPI_STATS = { leitosOcupados: 0, totalLeitos: 15, mediaBraden: 0, mediaFugulin: 0, dataReferencia: 'Sincronize para ver' };

// Helper robusto para datas
const formatDate = (dateInput) => {
  if (!dateInput) return '-';
  try {
    const dateStr = String(dateInput);
    if (dateStr.length === 10 && dateStr.includes('-')) {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    }
    const date = new Date(dateStr.length === 10 ? dateStr + 'T12:00:00' : dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('pt-BR');
  } catch (e) {
    return '-';
  }
};

// Cálculo de Idade ou Tempo de Serviço
const calculateYears = (dateInput) => {
  if (!dateInput) return 0;
  try {
    const today = new Date();
    const date = new Date(String(dateInput).length === 10 ? dateInput + 'T12:00:00' : dateInput);
    if (isNaN(date.getTime())) return 0;
    
    let years = today.getFullYear() - date.getFullYear();
    const m = today.getMonth() - date.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
        years--;
    }
    return years;
  } catch (e) {
    return 0;
  }
};

const safeParseFloat = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  if (typeof value === 'number') return value;
  const cleanValue = String(value).replace(',', '.');
  const num = parseFloat(cleanValue);
  return isNaN(num) ? 0 : num;
};

// --- COMPONENTES ---

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
      <div className="p-4 border-b flex justify-between items-center bg-slate-50">
        <h3 className="font-bold text-slate-800">{title}</h3>
        <button onClick={onClose}><CloseIcon size={20} className="text-slate-400 hover:text-slate-600" /></button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const FileUpload = ({ onFileSelect }) => {
  const handleChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 6 * 1024 * 1024) {
        alert("O arquivo excede o limite de 6MB.");
        e.target.value = "";
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        onFileSelect({ name: file.name, type: file.type, base64: reader.result.split(',')[1] });
      };
      reader.readAsDataURL(file);
    }
  };
  return (
    <div className="mt-2">
      <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Paperclip size={12}/> Anexo (Foto/PDF máx 6MB)</label>
      <input type="file" accept="image/*,application/pdf" onChange={handleChange} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
    </div>
  );
};

const MainSystem = ({ user, role, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  const [showAtestadoModal, setShowAtestadoModal] = useState(false);
  const [showPermutaModal, setShowPermutaModal] = useState(false);
  
  const [formAtestado, setFormAtestado] = useState({ dias: '', inicio: '', cid: '' });
  const [formPermuta, setFormPermuta] = useState({ dataSai: '', substituto: '', dataEntra: '' });
  const [fileData, setFileData] = useState(null);

  const [officers, setOfficers] = useState([]);
  const [atestados, setAtestados] = useState([]);
  const [permutas, setPermutas] = useState([]);
  const [vacations, setVacations] = useState([]);
  const [upiStats, setUpiStats] = useState(INITIAL_UPI_STATS);

  const pendingAtestados = Array.isArray(atestados) ? atestados.filter(a => a.status === 'Pendente').length : 0;
  const pendingPermutas = Array.isArray(permutas) ? permutas.filter(p => p.status === 'Pendente').length : 0;

  const refreshData = async (showFeedback = true) => {
    setLoading(true);
    try {
      if (API_URL_GESTAO) {
        const res1 = await fetch(`${API_URL_GESTAO}?action=getData`);
        if (res1.ok) {
            const text1 = await res1.text();
            if (!text1.trim().startsWith('<')) {
                const data1 = JSON.parse(text1);
                if (data1.atestados) setAtestados(data1.atestados);
                if (data1.permutas) setPermutas(data1.permutas);
                if (data1.vacations) setVacations(data1.vacations);
                if (data1.officers) setOfficers(data1.officers);
            }
        }
      }
      if (API_URL_INDICADORES) {
        const res2 = await fetch(`${API_URL_INDICADORES}?action=getData`);
        if (res2.ok) {
             const text2 = await res2.text();
             if (!text2.trim().startsWith('<')) {
                const data2 = JSON.parse(text2);
                if (data2.upiStats) {
                   const findKey = (obj, search) => {
                      const key = Object.keys(obj).find(k => k.toLowerCase().includes(search.toLowerCase()));
                      return key ? obj[key] : 0;
                   };
                   setUpiStats({
                     leitosOcupados: data2.upiStats.leitosOcupados || data2.upiStats.Ocupacao || 0,
                     totalLeitos: 15,
                     mediaBraden: safeParseFloat(findKey(data2.upiStats, 'braden')),
                     mediaFugulin: safeParseFloat(findKey(data2.upiStats, 'fugulin')),
                     dataReferencia: data2.upiStats.dataReferencia || '---'
                   });
                }
             }
        }
      }
      if (showFeedback) alert("Dados atualizados!");
    } catch(e) {
      if (showFeedback) alert(`Erro de conexão: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => { refreshData(false); }, []);

  const sendData = async (action, payload) => {
    setIsSaving(true);
    try {
      await fetch(API_URL_GESTAO, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, payload })
      });
      setTimeout(() => { setIsSaving(false); refreshData(false); }, 2500); 
    } catch (e) {
      alert("Erro ao salvar.");
      setIsSaving(false);
    }
  };

  const handleHomologar = (id, type) => {
    if (role !== 'admin') return alert("Acesso restrito.");
    if (type === 'atestado') {
      setAtestados(atestados.map(a => a.id === id ? {...a, status: 'Homologado'} : a));
      sendData('updateStatus', { sheet: 'Atestados', id: id, status: 'Homologado' });
    }
    if (type === 'permuta') {
      setPermutas(permutas.map(p => p.id === id ? {...p, status: 'Homologado'} : p));
      sendData('updateStatus', { sheet: 'Permutas', id: id, status: 'Homologado' });
    }
  };

  const submitAtestado = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now(), status: 'Pendente', militar: user, inicio: formAtestado.inicio, dias: formAtestado.dias, cid: formAtestado.cid || 'Sigiloso', file: fileData };
    sendData('saveAtestado', newItem);
    setShowAtestadoModal(false);
  };

  const submitPermuta = (e) => {
    e.preventDefault();
    const newItem = { id: Date.now(), status: 'Pendente', solicitante: user, substituto: formPermuta.substituto, datasai: formPermuta.dataSai, dataentra: formPermuta.dataEntra, file: fileData };
    sendData('savePermuta', newItem);
    setShowPermutaModal(false);
  };

  const renderContent = () => {
    if (loading) return <div className="p-10 text-center text-slate-500">Sincronizando dados...</div>;
    switch(activeTab) {
      case 'dashboard':
        return (
          <div className="space-y-6 animate-fadeIn">
             <div className="flex justify-between items-center"><h2 className="text-2xl font-bold text-slate-800">Painel de Comando</h2><button onClick={() => refreshData(true)} className="text-blue-600 text-sm flex items-center gap-2 hover:underline"><RefreshCw size={14}/> Sincronizar</button></div>
             <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowAtestadoModal(true)} className="bg-red-50 hover:bg-red-100 border border-red-200 p-4 rounded-xl flex items-center justify-center gap-3 transition-colors group"><div className="bg-red-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><ShieldAlert size={20}/></div><span className="font-bold text-red-800">Novo Atestado</span></button>
                <button onClick={() => setShowPermutaModal(true)} className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 p-4 rounded-xl flex items-center justify-center gap-3 transition-colors group"><div className="bg-indigo-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><ArrowRightLeft size={20}/></div><span className="font-bold text-indigo-800">Nova Permuta</span></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="md:col-span-4 bg-slate-800 rounded-xl p-5 text-white shadow-lg flex flex-col md:flex-row items-center justify-between">
                   <div className="flex items-center gap-4 mb-4 md:mb-0"><div className="bg-blue-600 p-3 rounded-lg"><Activity size={24}/></div><div><h3 className="font-bold text-lg">UPI - Tempo Real</h3><p className="text-slate-400 text-xs">Atualizado em {upiStats.dataReferencia}</p></div></div>
                   <div className="flex gap-8 text-center">
                      <div><p className="text-slate-400 text-xs uppercase font-bold">Ocupação</p><p className="text-2xl font-bold text-white">{upiStats.leitosOcupados} <span className="text-sm text-slate-500">/ 15</span></p></div>
                      <div><p className="text-slate-400 text-xs uppercase font-bold">Média Braden</p><p className="text-2xl font-bold text-yellow-400 flex items-center gap-1 justify-center">{safeParseFloat(upiStats.mediaBraden).toFixed(1)} <Thermometer size={14}/></p></div>
                      <div><p className="text-slate-400 text-xs uppercase font-bold">Média Fugulin</p><p className="text-2xl font-bold text-green-400 flex items-center gap-1 justify-center">{safeParseFloat(upiStats.mediaFugulin).toFixed(1)} <TrendingDown size={14}/></p></div>
                   </div>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><p className="text-slate-500 text-xs uppercase font-bold">Pendências</p><h3 className="text-2xl font-bold text-slate-800">{pendingAtestados + pendingPermutas}</h3></div>
                <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200"><p className="text-slate-500 text-xs uppercase font-bold">Efetivo</p><h3 className="text-2xl font-bold text-slate-800">{officers.length}</h3></div>
             </div>
          </div>
        );
      case 'agenda': return <AgendaTab user={user} />;
      case 'atestados':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
             <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Militar</th><th className="p-3">Duração</th><th className="p-3">Data</th><th className="p-3">Anexo</th><th className="p-3">Ação</th></tr></thead>
                 <tbody className="divide-y divide-slate-50">
                   {atestados.map((a, idx) => (
                     <tr key={idx} className={a.status === 'Pendente' ? 'bg-red-50/50' : ''}>
                       <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${a.status === 'Pendente' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{a.status}</span></td>
                       <td className="p-3 font-medium">{a.militar}</td>
                       <td className="p-3 font-medium">{a.dias || '-'} dias</td>
                       <td className="p-3 text-slate-500">{formatDate(a.inicio || a.data)}</td>
                       <td className="p-3">{a.anexo && a.anexo.startsWith('http') ? <a href={a.anexo} target="_blank" className="text-blue-600 hover:underline"><Paperclip size={14}/></a> : '-'}</td>
                       <td className="p-3">{a.status === 'Pendente' && role === 'admin' && <button onClick={() => handleHomologar(a.id, 'atestado')} className="text-blue-600 font-bold text-xs hover:underline">Homologar</button>}</td>
                     </tr>
                   ))}
                 </tbody>
               </table></div>
          </div>
        );
      case 'permutas':
         return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
               <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-3">Status</th><th className="p-3">Solicitante</th><th className="p-3">Substituto</th><th className="p-3">Datas</th><th className="p-3">Anexo</th><th className="p-3">Ação</th></tr></thead>
                   <tbody className="divide-y divide-slate-50">
                     {permutas.map((p, idx) => (
                       <tr key={idx} className={p.status === 'Pendente' ? 'bg-indigo-50/50' : ''}>
                         <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${p.status === 'Pendente' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'}`}>{p.status}</span></td>
                         <td className="p-3 font-medium text-red-700">{p.solicitante}</td>
                         <td className="p-3 font-medium text-green-700">{p.substituto || '---'}</td>
                         <td className="p-3 text-slate-500"><div className="flex flex-col text-xs"><span className="text-red-500">S: {formatDate(p.datasai)}</span><span className="text-green-600">E: {formatDate(p.dataentra)}</span></div></td>
                         <td className="p-3">{p.anexo && p.anexo.startsWith('http') ? <a href={p.anexo} target="_blank" className="text-blue-600 hover:underline"><Paperclip size={14}/></a> : '-'}</td>
                         <td className="p-3">{p.status === 'Pendente' && role === 'admin' && <button onClick={() => handleHomologar(p.id, 'permuta')} className="text-blue-600 font-bold text-xs hover:underline">Homologar</button>}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table></div>
            </div>
         );
      case 'efetivo':
         return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 animate-fadeIn">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> Efetivo de Oficiais ({officers.length})</h3>
                <div className="flex gap-4 text-xs font-medium">
                  <div className="flex items-center gap-1 text-red-600"><AlertCircle size={12}/> Critério de Saída (Idade ≥ 45 ou Serviço ≥ 7)</div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 uppercase text-slate-500 text-[10px]">
                    <tr>
                      <th className="p-3">Posto/Nome</th>
                      <th className="p-3">Setor</th>
                      <th className="p-3 text-center">Nasc.</th>
                      <th className="p-3 text-center">Idade</th>
                      <th className="p-3 text-center">Ingresso</th>
                      <th className="p-3 text-center">Serviço</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {officers.map((o, idx) => {
                      const idade = calculateYears(o.nascimento);
                      const servico = calculateYears(o.ingresso);
                      const alertaIdade = idade >= 45;
                      const alertaServico = servico >= 7;

                      return (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700">{o.patente} {o.nome}</span>
                            <span className="text-[10px] text-slate-400">{o.quadro || 'Oficiais'}</span>
                          </div>
                        </td>
                        <td className="p-3"><span className="px-2 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">{o.setor}</span></td>
                        <td className="p-3 text-center text-slate-500 font-mono text-xs">{formatDate(o.nascimento)}</td>
                        <td className={`p-3 text-center font-bold ${alertaIdade ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}>{idade} anos</td>
                        <td className="p-3 text-center text-slate-500 font-mono text-xs">{formatDate(o.ingresso)}</td>
                        <td className={`p-3 text-center font-bold ${alertaServico ? 'text-red-600 bg-red-50' : 'text-slate-600'}`}>{servico} anos</td>
                      </tr>
                    )})}
                  </tbody>
                </table>
              </div>
            </div>
         );
      default: return <div>Carregando...</div>;
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans overflow-hidden">
      <aside className={`${sidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all flex flex-col z-20 shadow-xl`}>
         <div className="p-4 border-b border-slate-800 flex items-center gap-3 h-16">{sidebarOpen && <span className="font-bold text-lg">SGA-Enf HACO</span>}<button onClick={() => setSidebarOpen(!sidebarOpen)} className="ml-auto text-slate-400"><Menu size={20}/></button></div>
         <div className={`p-4 border-b border-slate-800 bg-slate-800/50 ${!sidebarOpen && 'flex justify-center'}`}><div className="flex items-center gap-3"><div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-lg border-2 border-slate-700 ${role === 'admin' ? 'bg-blue-600' : role === 'rt' ? 'bg-purple-600' : 'bg-slate-600'}`}>{user.substring(0,2).toUpperCase()}</div>{sidebarOpen && (<div><p className="font-bold text-sm truncate w-32">{user}</p><p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">{role === 'admin' ? 'Administrador' : role === 'rt' ? 'Resp. Técnico' : 'Usuário'}</p></div>)}</div></div>
         <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
            {[ { id: 'dashboard', label: 'Painel Geral', icon: LayoutDashboard }, { id: 'agenda', label: 'Minha Agenda', icon: BookOpen }, { id: 'atestados', label: 'Atestados', icon: ShieldAlert, badge: (role === 'admin' || role === 'rt') ? pendingAtestados : 0 }, { id: 'permutas', label: 'Permutas', icon: ArrowRightLeft, badge: (role === 'admin' || role === 'rt') ? pendingPermutas : 0 }, { id: 'efetivo', label: 'Efetivo', icon: Users } ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all group relative ${activeTab === item.id ? 'bg-blue-600 shadow-md text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
                 <div className="relative"><item.icon size={20}/>{item.badge > 0 && <span className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full text-[10px] flex items-center justify-center text-white border-2 border-slate-900">{item.badge}</span>}</div>{sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
              </button>
            ))}
         </nav>
         <div className="p-4 border-t border-slate-800"><button onClick={onLogout} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm w-full"><LogOut size={16}/> {sidebarOpen && 'Sair'}</button></div>
      </aside>
      <main className="flex-1 overflow-auto p-6 md:p-8 relative">
         <header className="flex justify-between items-center mb-8"><div><h2 className="text-2xl font-bold text-slate-800 capitalize">{activeTab === 'dashboard' ? 'Início' : activeTab}</h2><p className="text-slate-500 text-sm">{new Date().toLocaleDateString('pt-BR', {weekday: 'long', day:'numeric', month:'long'})}</p></div></header>
         {renderContent()}
         {showAtestadoModal && (
           <Modal title="Novo Atestado" onClose={() => setShowAtestadoModal(false)}>
              <form onSubmit={submitAtestado} className="space-y-4">
                 <div><label className="block text-xs font-bold text-slate-500">Militar</label><input type="text" value={user} disabled className="w-full p-2 bg-slate-100 rounded border border-slate-300 text-slate-500" /></div>
                 <div><label className="block text-xs font-bold text-slate-500">Data de Início</label><input type="date" required className="w-full p-2 rounded border border-slate-300" value={formAtestado.inicio} onChange={e => setFormAtestado({...formAtestado, inicio: e.target.value})}/></div>
                 <div><label className="block text-xs font-bold text-slate-500">Qtd Dias</label><input type="number" required className="w-full p-2 rounded border border-slate-300" value={formAtestado.dias} onChange={e => setFormAtestado({...formAtestado, dias: e.target.value})}/></div>
                 <div><label className="block text-xs font-bold text-slate-500">CID (Opcional)</label><input type="text" className="w-full p-2 rounded border border-slate-300" value={formAtestado.cid} onChange={e => setFormAtestado({...formAtestado, cid: e.target.value})}/></div>
                 <FileUpload onFileSelect={setFileData} />
                 <button type="submit" disabled={isSaving} className="w-full bg-red-600 text-white font-bold py-3 rounded hover:bg-red-700 flex justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : <Send size={18}/>} {isSaving ? "Enviando..." : "Enviar"}</button>
              </form>
           </Modal>
         )}
         {showPermutaModal && (
           <Modal title="Nova Permuta" onClose={() => setShowPermutaModal(false)}>
              <form onSubmit={submitPermuta} className="space-y-4">
                 <div><label className="block text-xs font-bold text-slate-500">Solicitante (Sai)</label><input type="text" value={user} disabled className="w-full p-2 bg-slate-100 rounded border border-slate-300 text-slate-500" /></div>
                 <div><label className="block text-xs font-bold text-slate-500">Data da Saída</label><input type="date" required className="w-full p-2 rounded border border-slate-300" value={formPermuta.dataSai} onChange={e => setFormPermuta({...formPermuta, dataSai: e.target.value})}/></div>
                 <div className="border-t pt-4 mt-4"><label className="block text-xs font-bold text-slate-500">Substituto (Entra)</label><select className="w-full p-2 rounded border border-slate-300 bg-white" required value={formPermuta.substituto} onChange={e => setFormPermuta({...formPermuta, substituto: e.target.value})}><option value="">Selecione...</option>{officers.map((o,idx) => <option key={idx} value={o.nome}>{o.patente} {o.nome}</option>)}</select></div>
                 <div><label className="block text-xs font-bold text-slate-500">Data da Entrada</label><input type="date" required className="w-full p-2 rounded border border-slate-300" value={formPermuta.dataEntra} onChange={e => setFormPermuta({...formPermuta, dataEntra: e.target.value})}/></div>
                 <FileUpload onFileSelect={setFileData} />
                 <button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded hover:bg-indigo-700 flex justify-center gap-2">{isSaving ? <Loader2 className="animate-spin" /> : <Send size={18}/>} {isSaving ? "Enviando..." : "Solicitar"}</button>
              </form>
           </Modal>
         )}
      </main>
    </div>
  );
};

const UserDashboard = ({ user, onLogout }) => {
  const [showAtestadoModal, setShowAtestadoModal] = useState(false);
  const [showPermutaModal, setShowPermutaModal] = useState(false);
  const [myAtestados, setMyAtestados] = useState([]);
  const [myPermutas, setMyPermutas] = useState([]);
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [formAtestado, setFormAtestado] = useState({ dias: '', inicio: '', cid: '' });
  const [formPermuta, setFormPermuta] = useState({ dataSai: '', substituto: '', dataEntra: '' });

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL_GESTAO}?action=getData`);
      if (res.ok) {
        const data = JSON.parse(await res.text());
        if (data.atestados) setMyAtestados(data.atestados.filter(a => a.militar && a.militar.includes(user)).reverse());
        if (data.permutas) setMyPermutas(data.permutas.filter(p => p.solicitante && p.solicitante.includes(user)).reverse());
        if (data.officers) setOfficers(data.officers);
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchHistory(); }, [user]);

  const sendData = async (action, payload) => {
    setIsSaving(true);
    try {
      await fetch(API_URL_GESTAO, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action, payload }) });
      setTimeout(() => { setIsSaving(false); fetchHistory(); }, 2500);
    } catch (e) { alert("Erro ao salvar."); setIsSaving(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
       <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-10"><div className="flex items-center gap-3"><div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600">{user.substring(0,2).toUpperCase()}</div><h1 className="font-bold text-slate-800">Ten {user}</h1></div><button onClick={onLogout}><LogOut className="text-slate-400 hover:text-red-500" /></button></header>
       <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-4">
          <div className="bg-blue-600 text-white p-6 rounded-xl shadow-lg"><h2 className="font-bold text-lg mb-1">Bem-vindo, {user}</h2><p className="opacity-90 text-sm">Controle de solicitações do oficial.</p></div>
          <div className="grid grid-cols-2 gap-4 mt-4">
             <button onClick={() => setShowAtestadoModal(true)} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95"><ShieldAlert className="text-red-500" size={24} /><span className="font-bold text-sm text-slate-700">Novo Atestado</span></button>
             <button onClick={() => setShowPermutaModal(true)} className="bg-white p-4 rounded-xl shadow-sm border flex flex-col items-center justify-center gap-2 transition-transform hover:scale-105 active:scale-95"><ArrowRightLeft className="text-indigo-500" size={24} /><span className="font-bold text-sm text-slate-700">Nova Permuta</span></button>
          </div>
          <div className="mt-8"><h3 className="font-bold text-slate-800 text-lg mb-4 flex items-center justify-between">Meus Registros <button onClick={fetchHistory} className="text-blue-600 text-xs hover:underline"><RefreshCw size={12}/> Atualizar</button></h3>
             <div className="space-y-4">
                {myPermutas.slice(0,3).map((p, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm"><div className="text-xs"><strong>Troca com {p.substituto}</strong><br/><span className="text-red-500">S: {formatDate(p.datasai)}</span> <span className="text-green-600">E: {formatDate(p.dataentra)}</span></div><span className={`text-[10px] px-2 py-1 rounded font-bold ${p.status === 'Homologado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{p.status}</span></div>
                ))}
                {myAtestados.slice(0,3).map((a, i) => (
                  <div key={i} className="bg-white p-3 rounded-lg border flex justify-between items-center shadow-sm"><div className="text-xs"><strong>{a.dias || '-'} Dias</strong><br/>Início: {formatDate(a.inicio || a.data)}</div><span className={`text-[10px] px-2 py-1 rounded font-bold ${a.status === 'Homologado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>{a.status}</span></div>
                ))}
                {!loading && myAtestados.length === 0 && myPermutas.length === 0 && <div className="text-center py-10 text-slate-400 text-sm border border-dashed rounded-lg">Nenhum registro encontrado.</div>}
             </div>
          </div>
       </main>
       {showAtestadoModal && (
         <Modal title="Novo Atestado" onClose={() => setShowAtestadoModal(false)}>
            <form onSubmit={(e) => { e.preventDefault(); sendData('saveAtestado', { id: Date.now(), status: 'Pendente', militar: user, inicio: formAtestado.inicio, dias: formAtestado.dias, cid: formAtestado.cid || 'Sigiloso', file: fileData }); setShowAtestadoModal(false); }} className="space-y-4">
               <div><label className="block text-xs font-bold">Data Início</label><input type="date" required className="w-full p-2 border rounded" onChange={e => setFormAtestado({...formAtestado, inicio: e.target.value})}/></div>
               <div><label className="block text-xs font-bold">Dias</label><input type="number" required className="w-full p-2 border rounded" onChange={e => setFormAtestado({...formAtestado, dias: e.target.value})}/></div>
               <FileUpload onFileSelect={setFileData} /><button type="submit" disabled={isSaving} className="w-full bg-red-600 text-white font-bold py-3 rounded shadow-lg">{isSaving ? "Enviando..." : "Enviar"}</button>
            </form>
         </Modal>
       )}
       {showPermutaModal && (
         <Modal title="Nova Permuta" onClose={() => setShowPermutaModal(false)}>
            <form onSubmit={(e) => { e.preventDefault(); sendData('savePermuta', { id: Date.now(), status: 'Pendente', solicitante: user, substituto: formPermuta.substituto, datasai: formPermuta.dataSai, dataentra: formPermuta.dataEntra, file: fileData }); setShowPermutaModal(false); }} className="space-y-4">
               <div><label className="block text-xs font-bold">Saída</label><input type="date" required className="w-full p-2 border rounded" onChange={e => setFormPermuta({...formPermuta, dataSai: e.target.value})}/></div>
               <div><label className="block text-xs font-bold">Substituto</label><select className="w-full p-2 border rounded bg-white" required onChange={e => setFormPermuta({...formPermuta, substituto: e.target.value})}><option value="">Selecione...</option>{officers.map((o,idx) => <option key={idx} value={o.nome}>{o.patente} {o.nome}</option>)}</select></div>
               <div><label className="block text-xs font-bold">Entrada</label><input type="date" required className="w-full p-2 border rounded" onChange={e => setFormPermuta({...formPermuta, dataEntra: e.target.value})}/></div>
               <FileUpload onFileSelect={setFileData} /><button type="submit" disabled={isSaving} className="w-full bg-indigo-600 text-white font-bold py-3 rounded shadow-lg">{isSaving ? "Enviando..." : "Solicitar"}</button>
            </form>
         </Modal>
       )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);
  const handleLogin = (u, r) => { setUser(u); setRole(r); };
  const handleLogout = () => { setUser(null); setRole(null); };
  if (!user) return <LoginScreen onLogin={handleLogin} />;
  if (role === 'admin' || role === 'rt') return <MainSystem user={user} role={role} onLogout={handleLogout} />;
  return <UserDashboard user={user} onLogout={handleLogout} />;
}
