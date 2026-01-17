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
  getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged 
} from 'firebase/auth';

// --- Firebase Configuration & Initialization ---
const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// CRITICAL: Ensure odd number of segments (5 segments total)
const rawAppId = typeof __app_id !== 'undefined' ? __app_id : 'eyecare-system-v5';
const appId = rawAppId.replace(/\//g, '_'); 

// --- Utility Functions ---
const calculateAge = (dob) => {
  if (!dob) return 0;
  try {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age >= 0 ? age : 0;
  } catch (e) { return 0; }
};

const formatDate = (dateValue) => {
  if (!dateValue) return '-';
  try {
    const date = dateValue?.toDate ? dateValue.toDate() : new Date(dateValue);
    if (isNaN(date.getTime())) return String(dateValue);
    return date.toLocaleDateString('zh-CN');
  } catch (e) { return '-'; }
};

const colorTheme = {
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', icon: 'bg-blue-100', border: 'border-blue-100' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-600', icon: 'bg-teal-100', border: 'border-teal-100' },
  red: { bg: 'bg-red-50', text: 'text-red-600', icon: 'bg-red-100', border: 'border-red-100' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', icon: 'bg-indigo-100', border: 'border-indigo-100' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-600', icon: 'bg-amber-100', border: 'border-amber-100' },
};

// --- Shared UI Components ---

const Button = ({ children, onClick, variant = 'primary', icon: Icon, loading, disabled, className = "" }) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
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
  <div className={`bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Input = ({ label, required, ...props }) => (
  <div className="space-y-1">
    <label className="text-sm font-medium text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    <input {...props} className="w-full px-4 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
  </div>
);

// --- Content Modules ---

// 1. Refraction (视光检查)
const RefractionModule = ({ patients, exams, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialForm = {
    patientId: '', examDate: new Date().toISOString().split('T')[0], examType: '正常配镜',
    od_sphere: '', od_cylinder: '', od_axis: '', od_al: '', od_k1: '', od_k2: '', od_va: '', od_add: '', od_pd: '',
    os_sphere: '', os_cylinder: '', os_axis: '', os_al: '', os_k1: '', os_k2: '', os_va: '', os_add: '', os_pd: '',
    notes: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const handleOpen = (data = null) => {
    if (data) {
      setFormData(data);
      setEditingId(data.id);
    } else {
      setFormData(initialForm);
      setEditingId(null);
    }
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">视光临床记录</h2>
        <Button onClick={() => handleOpen()} icon={Plus}>录入检查记录</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">日期/类型</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">患者</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-blue-600">眼轴 AL (R/L)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {exams.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold">{ex.examDate}</div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${ex.examType === '近视防控' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>{ex.examType}</span>
                  </td>
                  <td className="px-6 py-4 font-medium">{patients.find(p => p.id === ex.patientId)?.name || '未知'}</td>
                  <td className="px-6 py-4 font-mono text-sm">
                    R: {ex.od_al || '-'} | L: {ex.os_al || '-'}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpen(ex)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
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
          <form onSubmit={(e) => { e.preventDefault(); onSave('exams', formData, editingId); setShowModal(false); }} className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center sticky top-0 z-10">
              <h3 className="font-bold text-lg">{editingId ? '修改检查单' : '录入新检查单'}</h3>
              <button type="button" onClick={() => setShowModal(false)}><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium">患者</label>
                  <select required className="w-full px-4 py-2 border rounded-lg" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}>
                    <option value="">-- 选择档案患者 --</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <Input label="检查日期" type="date" value={formData.examDate} onChange={e => setFormData({...formData, examDate: e.target.value})} />
                <div className="space-y-1">
                  <label className="text-sm font-medium">检查类型</label>
                  <select className="w-full px-4 py-2 border rounded-lg" value={formData.examType} onChange={e => setFormData({...formData, examType: e.target.value})}>
                    <option>正常配镜</option><option>近视防控</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-blue-50/40 rounded-xl border border-blue-100 space-y-4">
                  <h4 className="font-bold text-blue-800 border-b border-blue-100 pb-2">右眼 (OD)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="球镜 SPH" type="number" step="0.25" value={formData.od_sphere} onChange={e => setFormData({...formData, od_sphere: e.target.value})} />
                    <Input label="柱镜 CYL" type="number" step="0.25" value={formData.od_cylinder} onChange={e => setFormData({...formData, od_cylinder: e.target.value})} />
                    <Input label="轴位 AXIS" type="number" value={formData.od_axis} onChange={e => setFormData({...formData, od_axis: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="眼轴 AL" type="number" step="0.01" value={formData.od_al} onChange={e => setFormData({...formData, od_al: e.target.value})} />
                    <Input label="曲率 K1" type="number" step="0.01" value={formData.od_k1} onChange={e => setFormData({...formData, od_k1: e.target.value})} />
                    <Input label="曲率 K2" type="number" step="0.01" value={formData.od_k2} onChange={e => setFormData({...formData, od_k2: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="ADD" type="number" step="0.25" value={formData.od_add} onChange={e => setFormData({...formData, od_add: e.target.value})} />
                    <Input label="视力 VA" value={formData.od_va} onChange={e => setFormData({...formData, od_va: e.target.value})} />
                    <Input label="瞳距 PD" type="number" step="0.5" value={formData.od_pd} onChange={e => setFormData({...formData, od_pd: e.target.value})} />
                  </div>
                </div>

                <div className="p-4 bg-teal-50/40 rounded-xl border border-teal-100 space-y-4">
                  <h4 className="font-bold text-teal-800 border-b border-teal-100 pb-2">左眼 (OS)</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="球镜 SPH" type="number" step="0.25" value={formData.os_sphere} onChange={e => setFormData({...formData, os_sphere: e.target.value})} />
                    <Input label="柱镜 CYL" type="number" step="0.25" value={formData.os_cylinder} onChange={e => setFormData({...formData, os_cylinder: e.target.value})} />
                    <Input label="轴位 AXIS" type="number" value={formData.os_axis} onChange={e => setFormData({...formData, os_axis: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="眼轴 AL" type="number" step="0.01" value={formData.os_al} onChange={e => setFormData({...formData, os_al: e.target.value})} />
                    <Input label="曲率 K1" type="number" step="0.01" value={formData.os_k1} onChange={e => setFormData({...formData, os_k1: e.target.value})} />
                    <Input label="曲率 K2" type="number" step="0.01" value={formData.os_k2} onChange={e => setFormData({...formData, os_k2: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <Input label="ADD" type="number" step="0.25" value={formData.os_add} onChange={e => setFormData({...formData, os_add: e.target.value})} />
                    <Input label="视力 VA" value={formData.os_va} onChange={e => setFormData({...formData, os_va: e.target.value})} />
                    <Input label="瞳距 PD" type="number" step="0.5" value={formData.os_pd} onChange={e => setFormData({...formData, os_pd: e.target.value})} />
                  </div>
                </div>
              </div>
              <Input label="备注/建议" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="p-6 bg-slate-50 flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1" icon={Save}>确认保存记录</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 2. Sales (销售管理)
const SalesModule = ({ patients, products, orders, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialForm = { patientId: '', productId: '', model: '', quantity: 1, discount: 0, orderDate: new Date().toISOString().split('T')[0] };
  const [formData, setFormData] = useState(initialForm);

  const handleOpen = (data = null) => {
    if (data) {
      setFormData(data);
      setEditingId(data.id);
    } else {
      setFormData(initialForm);
      setEditingId(null);
    }
    setShowModal(true);
  };

  const calculateTotal = (productId, qty, discount) => {
    const p = products.find(x => x.id === productId);
    return Math.max(0, (Number(p?.price || 0) * Number(qty)) - Number(discount));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">销售管理</h2>
        <Button onClick={() => handleOpen()} icon={Plus}>新建销售单</Button>
      </div>

      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">销售日期</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">患者</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">商品明细</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">实收</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4 text-sm">{o.orderDate}</td>
                <td className="px-6 py-4 font-medium">{patients.find(p => p.id === o.patientId)?.name || '散客'}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-bold text-slate-700">{o.productName}</div>
                  <div className="text-[10px] text-slate-400">型号: {o.model} | 数量: {o.quantity}</div>
                </td>
                <td className="px-6 py-4 text-right font-mono font-bold text-emerald-600">¥{o.totalAmount}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpen(o)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
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
            const total = calculateTotal(formData.productId, formData.quantity, formData.discount);
            onSave('orders', { ...formData, productName: p?.name || '未知', totalAmount: total }, editingId); 
            setShowModal(false); 
          }} className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <h3 className="font-bold text-lg">{editingId ? '编辑销售记录' : '新开单据'}</h3>
            <Input label="销售日期" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">患者</label>
                <select className="w-full px-4 py-2 border rounded-lg" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}>
                  <option value="">散客</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">主商品</label>
                <select required className="w-full px-4 py-2 border rounded-lg" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}>
                  <option value="">-- 选择库存商品 --</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}
                </select>
              </div>
            </div>
            <Input label="型号/规格" placeholder="例如: 黑色 1.67离焦镜片" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="数量" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
              <Input label="优惠/抹零" type="number" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
            </div>
            <div className="p-4 bg-blue-50 rounded-xl text-right font-bold text-xl text-blue-700">
              应收合计：¥ {calculateTotal(formData.productId, formData.quantity, formData.discount)}
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1" icon={Save}>确认结账</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 3. Inventory (库存管理)
const InventoryModule = ({ products, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialForm = { name: '', category: '镜架', brand: '', model: '', price: '', stock: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleOpen = (data = null) => {
    if (data) {
      setFormData(data);
      setEditingId(data.id);
    } else {
      setFormData(initialForm);
      setEditingId(null);
    }
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">库存与商品</h2>
        <Button onClick={() => handleOpen()} icon={Plus}>商品入库</Button>
      </div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">商品型号</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">单价</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">库存</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4">
                  <div className="font-bold">{p.name}</div>
                  <div className="text-xs text-slate-400">{p.brand} {p.model}</div>
                </td>
                <td className="px-6 py-4 font-mono text-blue-600">¥{p.price}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${p.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100'}`}>{p.stock}</span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpen(p)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
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
            <h3 className="font-bold text-lg">{editingId ? '编辑商品' : '商品入库'}</h3>
            <Input label="商品全称" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="品牌" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              <Input label="型号" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="零售单价" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              <Input label="初始库存" type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1">完成保存</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// 4. Patients (档案中心)
const PatientsModule = ({ patients, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const initialForm = { name: '', phone: '', dob: '', gender: '男', notes: '' };
  const [formData, setFormData] = useState(initialForm);

  const handleOpen = (data = null) => {
    if (data) {
      setFormData(data);
      setEditingId(data.id);
    } else {
      setFormData(initialForm);
      setEditingId(null);
    }
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">会员档案中心</h2>
        <Button onClick={() => handleOpen()} icon={UserPlus}>新建档案</Button>
      </div>
      <Card>
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">姓名/性别</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">年龄/生日</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">联系电话</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">管理</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {patients.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4">
                  <div className="font-bold text-slate-800">{p.name}</div>
                  <div className="text-[10px] text-slate-400 uppercase">{p.gender}</div>
                </td>
                <td className="px-6 py-4 text-sm">
                  <div>{calculateAge(p.dob)} 岁</div>
                  <div className="text-[10px] text-slate-400">{p.dob}</div>
                </td>
                <td className="px-6 py-4 text-sm font-mono">{p.phone}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => handleOpen(p)} className="p-2 text-slate-400 hover:text-blue-600"><Edit3 className="w-4 h-4" /></button>
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
            <h3 className="font-bold text-lg">{editingId ? '编辑会员信息' : '新建会员档案'}</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="患者姓名" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="手机号码" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium">性别</label>
                <select className="w-full px-4 py-2 border rounded-lg" value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                  <option>男</option><option>女</option>
                </select>
              </div>
              <Input label="出生日期" type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1">完成保存</Button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// --- Dashboard ---
const Dashboard = ({ patients, exams, orders, products }) => {
  const revenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);
  const followUps = useMemo(() => {
    const today = new Date();
    return exams.filter(ex => ex.examType === '近视防控').map(ex => {
      const nextDate = new Date(ex.examDate);
      nextDate.setMonth(nextDate.getMonth() + 3);
      return { ...ex, nextDate, isOverdue: nextDate < today };
    }).sort((a,b) => a.nextDate - b.nextDate);
  }, [exams]);

  const overdueCount = followUps.filter(f => f.isOverdue).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6 border-b-4 border-blue-500">
          <div className="flex justify-between items-start text-blue-600">
            <Users className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-blue-50">档案总数</span>
          </div>
          <p className="text-2xl font-bold mt-4">{patients.length}</p>
        </Card>
        <Card className="p-6 border-b-4 border-emerald-500">
          <div className="flex justify-between items-start text-emerald-600">
            <ShoppingCart className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-50">总营业额</span>
          </div>
          <p className="text-2xl font-bold mt-4">¥ {revenue.toLocaleString()}</p>
        </Card>
        <Card className={`p-6 border-b-4 ${overdueCount > 0 ? 'border-red-500 animate-pulse' : 'border-amber-500'}`}>
          <div className="flex justify-between items-start text-amber-600">
            <Bell className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-amber-50">随访预警</span>
          </div>
          <p className="text-2xl font-bold mt-4 text-amber-600">{overdueCount} <span className="text-xs font-normal">例逾期</span></p>
        </Card>
        <Card className="p-6 border-b-4 border-slate-300">
          <div className="flex justify-between items-start text-slate-600">
            <Package className="w-8 h-8 opacity-40" />
            <span className="text-[10px] font-bold px-2 py-1 rounded bg-slate-50">缺货商品</span>
          </div>
          <p className="text-2xl font-bold mt-4">{products.filter(p => p.stock < 5).length}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2 text-slate-800"><AlertCircle className="w-4 h-4 text-amber-500" /> 近视防控复查提示 (3个月)</h3>
          <div className="space-y-3">
            {followUps.slice(0, 5).map(f => {
              const p = patients.find(pat => pat.id === f.patientId);
              return (
                <div key={f.id} className={`p-3 rounded-lg border flex justify-between items-center ${f.isOverdue ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                  <div>
                    <p className="font-bold text-slate-800">{p?.name || '未知'}</p>
                    <p className="text-[10px] text-slate-400">上次检查: {f.examDate}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${f.isOverdue ? 'text-red-600' : 'text-slate-500'}`}>复查日期: {f.nextDate.toISOString().split('T')[0]}</p>
                    {f.isOverdue && <span className="text-[8px] px-1 bg-red-600 text-white rounded font-bold">已逾期</span>}
                  </div>
                </div>
              );
            })}
            {followUps.length === 0 && <p className="text-center py-10 text-slate-300">暂无防控随访记录</p>}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="font-bold mb-4">最近销售明细</h3>
          <div className="space-y-3">
            {orders.slice(0, 5).map(o => (
              <div key={o.id} className="flex justify-between items-center p-3 border-b border-slate-50 last:border-none">
                <div className="flex gap-3 items-center">
                  <div className="w-8 h-8 rounded bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-bold">￥</div>
                  <div>
                    <p className="text-sm font-bold text-slate-700">{o.productName}</p>
                    <p className="text-[10px] text-slate-400">{o.orderDate} · {patients.find(p => p.id === o.patientId)?.name || '散客'}</p>
                  </div>
                </div>
                <div className="text-sm font-mono font-bold text-slate-700">¥ {o.totalAmount}</div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-center py-10 text-slate-300">暂无销售记录</p>}
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- App Shell ---

export default function App() {
  const [user, setUser] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [view, setView] = useState('dashboard');
  
  const [patients, setPatients] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [exams, setExams] = useState([]);

  // Initialization: Auth FIRST, then set Ready
  useEffect(() => {
    let isMounted = true;
    const initializeSession = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
        onAuthStateChanged(auth, (u) => {
          if (isMounted && u) {
            setUser(u);
            setIsReady(true);
          }
        });
      } catch (err) {
        console.error("Auth init error:", err);
        if (isMounted) setIsReady(true);
      }
    };
    initializeSession();
    return () => { isMounted = false; };
  }, []);

  // Data Listeners: Only start after user is ready
  useEffect(() => {
    if (!user || !isReady) return;

    const unsubP = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), 
      s => setPatients(s.docs.map(d => ({id: d.id, ...d.data()}))),
      e => console.error("Patient listener error:", e)
    );
    const unsubPr = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), 
      s => setProducts(s.docs.map(d => ({id: d.id, ...d.data()}))),
      e => console.error("Product listener error:", e)
    );
    const unsubO = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), 
      s => setOrders(s.docs.map(d => ({id: d.id, ...d.data()}))),
      e => console.error("Order listener error:", e)
    );
    const unsubE = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), 
      s => setExams(s.docs.map(d => ({id: d.id, ...d.data()}))),
      e => console.error("Exam listener error:", e)
    );

    return () => { unsubP(); unsubPr(); unsubO(); unsubE(); };
  }, [user, isReady]);

  // Generic Save/Delete Handlers
  const handleSave = async (colName, data, editingId = null) => {
    if (!user) return;
    try {
      const colRef = collection(db, 'artifacts', appId, 'public', 'data', colName);
      if (editingId) {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, editingId), { ...data, updatedAt: Date.now() });
      } else {
        await addDoc(colRef, { ...data, createdAt: Date.now() });
      }
    } catch (err) { console.error(`Save error [${colName}]:`, err); }
  };

  const handleDelete = async (colName, id) => {
    if (!user || !confirm('确定要彻底删除该记录吗？此操作不可撤销。')) return;
    try {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', colName, id));
    } catch (err) { console.error(`Delete error [${colName}]:`, err); }
  };

  if (!isReady) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin text-blue-600 w-12 h-12 mb-4" />
      <p className="text-slate-500 font-medium tracking-widest">VisualCare Pro 安全初始化中...</p>
    </div>
  );

  const SidebarItem = ({ icon: Icon, label, targetView }) => (
    <button onClick={() => setView(targetView)} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${view === targetView ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'}`}>
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r p-6 hidden lg:flex flex-col shadow-sm">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200"><Eye className="w-6 h-6" /></div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-br from-blue-700 to-indigo-800 bg-clip-text text-transparent">VisualCare</span>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter leading-none">Optical SaaS</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1">
          <SidebarItem icon={LayoutDashboard} label="控制台" targetView="dashboard" />
          <SidebarItem icon={Users} label="档案中心" targetView="patients" />
          <SidebarItem icon={Eye} label="视光检查" targetView="refraction" />
          <SidebarItem icon={Package} label="库存管理" targetView="inventory" />
          <SidebarItem icon={ShoppingCart} label="销售管理" targetView="sales" />
        </nav>
        <div className="pt-6 border-t">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">系统就绪</p>
            <div className="flex items-center gap-2 mt-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-xs text-slate-600 font-medium truncate">{user?.uid}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 md:p-10">
        <div className="max-w-6xl mx-auto">
          {view === 'dashboard' && <Dashboard patients={patients} exams={exams} orders={orders} products={products} />}
          {view === 'patients' && <PatientsModule patients={patients} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'refraction' && <RefractionModule patients={patients} exams={exams} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'inventory' && <InventoryModule products={products} onSave={handleSave} onDelete={handleDelete} />}
          {view === 'sales' && <SalesModule patients={patients} products={products} orders={orders} onSave={handleSave} onDelete={handleDelete} />}
        </div>
      </main>
    </div>
  );
}
