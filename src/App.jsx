import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Search, Trash2, Edit3, Calendar, Eye, LayoutDashboard, 
  Package, ShoppingCart, Settings, ChevronRight, UserPlus, ArrowRight, 
  Save, X, Loader2, CheckCircle2, Filter, TrendingUp, History, Tag, 
  Clock, AlertCircle, Bell
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDocs, onSnapshot, query, 
  deleteDoc, updateDoc, addDoc
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';

// --- Firebase 专属配置 (已整合您的配置) ---
const firebaseConfig = {
  apiKey: "AIzaSyAxLO4oAbOWGsNQ0bRR8js1o0vzfNwRwyI",
  authDomain: "myeyeshop-f1fab.firebaseapp.com",
  projectId: "myeyeshop-f1fab",
  storageBucket: "myeyeshop-f1fab.firebasestorage.app",
  messagingSenderId: "874094365431",
  appId: "1:874094365431:web:38e28d857979de115421f2",
  measurementId: "G-YZ4PL510GL"
};

// 初始化 Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);
const appId = "visual-care-pro-v1"; // 应用唯一标识

// --- 工具函数 ---
const calculateAge = (dob) => {
  if (!dob) return 0;
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
  return age >= 0 ? age : 0;
};

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
  return isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN');
};

const colorTheme = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100', border: 'border-blue-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-100', border: 'border-teal-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100', border: 'border-red-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-100', border: 'border-indigo-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-100', border: 'border-amber-100' },
};

// --- 通用原子组件 ---
const Button = ({ children, onClick, variant = 'primary', icon: Icon, loading, disabled, className = "" }) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
    secondary: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50",
    danger: "bg-red-50 text-red-600 border border-red-100 hover:bg-red-100",
    ghost: "text-slate-500 hover:bg-slate-100"
  };
  return (
    <button onClick={onClick} disabled={loading || disabled} className={`${baseStyles} ${variants[variant]} ${className}`}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : Icon && <Icon className="w-4 h-4" />}
      {children}
    </button>
  );
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>{children}</div>
);

const Input = ({ label, required, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    <input {...props} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
  </div>
);

// --- 模块视图 ---

// 1. 档案管理
const PatientsView = ({ patients, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', dob: '', gender: '男', notes: '' });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">会员档案中心</h2><Button onClick={() => {setFormData({name:'',phone:'',dob:'',gender:'男',notes:''}); setEditingId(null); setShowModal(true)}} icon={UserPlus}>录入会员</Button></div>
      <Card>
        <table className="w-full text-left"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500">姓名</th><th className="px-6 py-4 text-xs font-bold text-slate-500">基本信息</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">管理</th></tr></thead>
          <tbody className="divide-y">
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4"><div className="font-bold text-slate-800">{p.name}</div><div className="text-[10px] text-slate-400 font-mono">{p.phone}</div></td>
                <td className="px-6 py-4 text-sm text-slate-600">{p.gender} | {calculateAge(p.dob)}岁</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setFormData(p); setEditingId(p.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete('patients', p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('patients', formData, editingId); setShowModal(false); }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? '编辑会员档案' : '新建会员档案'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="姓名" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="手机" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-sm font-medium">性别</label><select className="w-full px-4 py-2 border rounded-lg" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}><option>男</option><option>女</option></select></div>
              <Input label="出生日期" type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4"><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button><Button className="flex-1">完成保存</Button></div>
          </form>
        </div>
      )}
    </div>
  );
};

// 2. 视光检查
const RefractionView = ({ patients, exams, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialExam = { 
    patientId: '', examDate: new Date().toISOString().split('T')[0], examType: '正常配镜', 
    od_sphere: '', od_cylinder: '', od_axis: '', od_al: '', od_k1: '', od_k2: '', od_va: '', od_add: '', od_pd: '',
    os_sphere: '', os_cylinder: '', os_axis: '', os_al: '', os_k1: '', os_k2: '', os_va: '', os_add: '', os_pd: '',
    notes: '' 
  };
  const [formData, setFormData] = useState(initialExam);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">视光临床检查</h2><Button onClick={() => {setFormData(initialExam); setEditingId(null); setShowModal(true)}} icon={Plus}>录入验光单</Button></div>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">检查日期</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">患者</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-blue-600">眼轴 AL (R/L)</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">管理</th></tr></thead>
            <tbody className="divide-y">
              {exams.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4 text-sm font-medium">{ex.examDate}</td>
                  <td className="px-6 py-4 text-sm font-medium">{patients.find(p => p.id === ex.patientId)?.name || '未知'}</td>
                  <td className="px-6 py-4 font-mono text-sm text-blue-600">R: {ex.od_al || '-'} | L: {ex.os_al || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {setFormData(ex); setEditingId(ex.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete('exams', ex.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('exams', formData, editingId); setShowModal(false); }} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl p-6 space-y-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg border-b pb-2">{editingId ? '编辑验光记录' : '录入验光结果'}</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1"><label className="text-sm font-medium">患者</label><select required className="w-full px-4 py-2 border rounded-lg" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}><option value="">-- 选择患者 --</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <Input label="检查日期" type="date" value={formData.examDate} onChange={e => setFormData({...formData, examDate: e.target.value})} />
              <div className="space-y-1"><label className="text-sm font-medium">检查类型</label><select className="w-full px-4 py-2 border rounded-lg" value={formData.examType} onChange={e => setFormData({...formData, examType: e.target.value})}><option>正常配镜</option><option>近视防控</option></select></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-100 space-y-4">
                <h4 className="font-bold text-blue-800">右眼 (OD)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="球镜 SPH" type="number" step="0.25" value={formData.od_sphere} onChange={e => setFormData({...formData, od_sphere: e.target.value})} />
                  <Input label="柱镜 CYL" type="number" step="0.25" value={formData.od_cylinder} onChange={e => setFormData({...formData, od_cylinder: e.target.value})} />
                  <Input label="轴位 AXIS" type="number" value={formData.od_axis} onChange={e => setFormData({...formData, od_axis: e.target.value})} />
                  <Input label="眼轴 AL" type="number" step="0.01" value={formData.od_al} onChange={e => setFormData({...formData, od_al: e.target.value})} />
                  <Input label="K1" type="number" step="0.01" value={formData.od_k1} onChange={e => setFormData({...formData, od_k1: e.target.value})} />
                  <Input label="K2" type="number" step="0.01" value={formData.od_k2} onChange={e => setFormData({...formData, od_k2: e.target.value})} />
                </div>
              </div>
              <div className="p-4 bg-teal-50/50 rounded-xl border border-teal-100 space-y-4">
                <h4 className="font-bold text-teal-800">左眼 (OS)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="球镜 SPH" type="number" step="0.25" value={formData.os_sphere} onChange={e => setFormData({...formData, os_sphere: e.target.value})} />
                  <Input label="柱镜 CYL" type="number" step="0.25" value={formData.os_cylinder} onChange={e => setFormData({...formData, os_cylinder: e.target.value})} />
                  <Input label="轴位 AXIS" type="number" value={formData.os_axis} onChange={e => setFormData({...formData, os_axis: e.target.value})} />
                  <Input label="眼轴 AL" type="number" step="0.01" value={formData.os_al} onChange={e => setFormData({...formData, os_al: e.target.value})} />
                  <Input label="K1" type="number" step="0.01" value={formData.os_k1} onChange={e => setFormData({...formData, os_k1: e.target.value})} />
                  <Input label="K2" type="number" step="0.01" value={formData.os_k2} onChange={e => setFormData({...formData, os_k2: e.target.value})} />
                </div>
              </div>
            </div>
            <Input label="备注/处置建议" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            <div className="flex gap-3 pt-4"><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button><Button className="flex-1" icon={Save}>保存记录</Button></div>
          </form>
        </div>
      )}
    </div>
  );
};

// 3. 库存管理
const InventoryView = ({ products, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', brand: '', model: '', price: '', stock: '', category: '镜架' });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">库存商品管理</h2><Button onClick={() => {setEditingId(null); setFormData({name:'',brand:'',model:'',price:'',stock:'',category:'镜架'}); setShowModal(true)}} icon={Plus}>商品入库</Button></div>
      <Card>
        <table className="w-full text-left"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500">商品/型号</th><th className="px-6 py-4 text-xs font-bold text-slate-500">单价</th><th className="px-6 py-4 text-xs font-bold text-slate-500">库存</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">管理</th></tr></thead>
          <tbody className="divide-y">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4"><div className="font-bold">{p.name}</div><div className="text-xs text-slate-400">{p.brand} {p.model}</div></td>
                <td className="px-6 py-4 font-mono text-blue-600">¥{p.price}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${p.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>{p.stock}</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setFormData(p); setEditingId(p.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete('products', p.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('products', {...formData, price: Number(formData.price), stock: Number(formData.stock)}, editingId); setShowModal(false); }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-lg">商品入库</h3>
            <Input label="商品全称" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="品牌" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              <Input label="型号" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="售价" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              <Input label="库存量" type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4"><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button><Button className="flex-1">入库保存</Button></div>
          </form>
        </div>
      )}
    </div>
  );
};

// 4. 销售管理
const SalesView = ({ patients, products, orders, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ patientId: '', productId: '', quantity: 1, discount: 0, orderDate: new Date().toISOString().split('T')[0] });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">销售订单记录</h2><Button onClick={() => {setEditingId(null); setFormData({patientId:'',productId:'',quantity:1,discount:0,orderDate:new Date().toISOString().split('T')[0]}); setShowModal(true)}} icon={ShoppingCart}>新建销售单</Button></div>
      <Card>
        <table className="w-full text-left"><thead className="bg-slate-50 border-b"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">日期</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">客户</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">金额</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">管理</th></tr></thead>
          <tbody className="divide-y">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4 text-sm font-medium">{o.orderDate}</td>
                <td className="px-6 py-4 font-medium">{patients.find(p => p.id === o.patientId)?.name || '散客'}</td>
                <td className="px-6 py-4 font-mono font-bold text-emerald-600">¥{o.totalAmount}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setFormData(o); setEditingId(o.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete('orders', o.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const p = products.find(x => x.id === formData.productId);
            const total = (Number(p?.price || 0) * formData.quantity) - formData.discount;
            onSave('orders', {...formData, totalAmount: total, productName: p?.name || '未知'}, editingId); 
            setShowModal(false); 
          }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-lg">结算单</h3>
            <Input label="销售日期" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-sm font-medium">选择客户</label><select className="w-full px-4 py-2 border rounded-lg" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}><option value="">散客</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="space-y-1"><label className="text-sm font-medium">选择商品</label><select required className="w-full px-4 py-2 border rounded-lg" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}><option value="">-- 选择 --</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="数量" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
              <Input label="折扣金额" type="number" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
            </div>
            <div className="p-4 bg-emerald-50 rounded-xl text-right font-bold text-xl text-emerald-700">实收：¥ {Math.max(0, (products.find(x => x.id === formData.productId)?.price || 0) * formData.quantity - formData.discount)}</div>
            <div className="flex gap-3 pt-2"><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button><Button className="flex-1">完成结账</Button></div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- 主程序壳 ---

export default function App() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState('dashboard');
  
  // 数据状态
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [exams, setExams] = useState([]);

  // 1. 初始化 Auth
  useEffect(() => {
    let isMounted = true;
    signInAnonymously(auth).then(() => {
      onAuthStateChanged(auth, (u) => {
        if (isMounted && u) {
          setUser(u);
          setIsReady(true);
        }
      });
    }).catch(err => {
      console.error("Auth Init Error:", err);
      setIsReady(true);
    });
    return () => { isMounted = false; };
  }, []);

  // 2. 实时数据监听
  useEffect(() => {
    if (!user || !isReady) return;
    
    const unsubP = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), s => setPatients(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubPr = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubO = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => setOrders(s.docs.map(d => ({id: d.id, ...d.data()}))));
    const unsubE = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), s => setExams(s.docs.map(d => ({id: d.id, ...d.data()}))));
    
    return () => { unsubP(); unsubPr(); unsubO(); unsubE(); };
  }, [user, isReady]);

  const handleSave = async (col, data, id) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id), { ...data, updatedAt: Date.now() });
      } else {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', col), { ...data, createdAt: Date.now() });
      }
    } catch (err) { console.error("Save error:", err); }
  };

  const handleDelete = async (col, id) => {
    if (confirm('确定要删除吗？数据将无法找回。')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
      } catch (err) { console.error("Delete error:", err); }
    }
  };

  if (!isReady) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
      <p className="text-slate-500 font-medium">正在连接云端店面系统...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      <aside className="w-64 bg-white border-r p-6 hidden lg:flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><Eye /></div>
          <div><span className="text-xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">VisualCare</span></div>
        </div>
        <nav className="flex-1 space-y-1">
          <button onClick={() => setView('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><LayoutDashboard className="w-5 h-5" /><span>控制台</span></button>
          <button onClick={() => setView('patients')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'patients' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Users className="w-5 h-5" /><span>档案中心</span></button>
          <button onClick={() => setView('refraction')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'refraction' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Eye className="w-5 h-5" /><span>视光检查</span></button>
          <button onClick={() => setView('inventory')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'inventory' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><Package className="w-5 h-5" /><span>库存管理</span></button>
          <button onClick={() => setView('sales')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === 'sales' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-600 hover:bg-blue-50'}`}><ShoppingCart className="w-5 h-5" /><span>销售开单</span></button>
        </nav>
        <div className="pt-6 border-t"><div className="p-3 bg-slate-50 rounded-xl"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">已同步云端</p><p className="text-xs text-slate-600 truncate">{user?.uid}</p></div></div>
      </aside>

      <main className="flex-1 p-4 md:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {view === 'dashboard' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">欢迎使用 VisualCare Pro</h1>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6 border-b-4 border-blue-600"><p className="text-slate-500 text-sm">累计档案</p><p className="text-3xl font-bold mt-1">{patients.length}</p></Card>
                <Card className="p-6 border-b-4 border-emerald-600"><p className="text-slate-500 text-sm">今日营收估算</p><p className="text-3xl font-bold mt-1">¥{orders.reduce((s,o)=>s+o.totalAmount,0)}</p></Card>
                <Card className="p-6 border-b-4 border-amber-600"><p className="text-slate-500 text-sm">近视防控随访</p><p className="text-3xl font-bold mt-1">{exams.filter(e => e.examType === '近视防控').length}</p></Card>
              </div>
              <Card className="p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Bell className="w-4 h-4 text-amber-500" /> 近视防控复查提示 (按3个月周期)</h3>
                <div className="space-y-3">
                  {exams.filter(e => e.examType === '近视防控').slice(0, 5).map(e => {
                    const nextDate = new Date(e.examDate); nextDate.setMonth(nextDate.getMonth() + 3);
                    return (
                      <div key={e.id} className="flex justify-between p-3 bg-slate-50 rounded-lg">
                        <span>{patients.find(pat => pat.id === e.patientId)?.name}</span>
                        <span className="text-slate-500">建议复查日期: {nextDate.toLocaleDateString()}</span>
                      </div>
                    );
                  })}
                  {exams.filter(e => e.examType === '近视防控').length === 0 && <p className="text-slate-400 py-4 text-center">暂无需要复查的会员</p>}
                </div>
              </Card>
            </div>
          )}
          {view === 'patients' && <PatientsView patients={patients} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'refraction' && <RefractionView patients={patients} exams={exams} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'inventory' && <InventoryView products={products} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'sales' && <SalesView patients={patients} products={products} orders={orders} onSave={handleSave} onDelete={handleDelete} />}
        </div>
      </main>
    </div>
  );
}
