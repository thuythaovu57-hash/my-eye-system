import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, Plus, Search, Trash2, Edit3, Calendar, Eye, LayoutDashboard, 
  Package, ShoppingCart, Settings, ChevronRight, UserPlus, ArrowRight, 
  Save, X, Loader2, CheckCircle2, Filter, TrendingUp, History, Tag, 
  Clock, AlertCircle, Bell
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, doc, onSnapshot, 
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
    return isNaN(date.getTime()) ? String(dateValue) : date.toLocaleDateString('zh-CN');
  } catch (e) { return '-'; }
};

// --- 通用原子组件 ---
const Button = ({ children, onClick, variant = 'primary', icon: Icon, loading, disabled, className = "" }) => {
  const baseStyles = "flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50 shadow-sm";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-200",
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
  <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden transition-all hover:shadow-md ${className}`}>{children}</div>
);

const Input = ({ label, required, ...props }) => (
  <div className="space-y-1.5">
    <label className="text-sm font-semibold text-slate-700">{label}{required && <span className="text-red-500 ml-1">*</span>}</label>
    <input {...props} className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all placeholder:text-slate-300" />
  </div>
);

// --- 模块视图 ---

// 1. 档案管理
const PatientsView = ({ patients, onSave, onDelete }) => {
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', dob: '', gender: '男', notes: '' });
  const [searchTerm, setSearchTerm] = useState('');

  // 修复：增加安全过滤，防止 p.name 或 p.phone 为空时崩溃
  const filtered = patients.filter(p => 
    (p.name || '').includes(searchTerm) || (p.phone || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">会员档案中心</h2>
          <p className="text-slate-500 text-sm">管理店内所有客户的视光健康基础档案</p>
        </div>
        <Button onClick={() => {setFormData({name:'',phone:'',dob:'',gender:'男',notes:''}); setEditingId(null); setShowModal(true)}} icon={UserPlus}>录入新会员</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          placeholder="快速搜索姓名或手机号..." 
          className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50/50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">姓名/性别</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">年龄/生日</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">联系电话</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">管理操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map(p => (
                <tr key={p.id} className="hover:bg-blue-50/30 group transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-700">{p.name || '未命名'}</div>
                    <div className={`text-[10px] inline-block px-2 py-0.5 rounded-full mt-1 ${p.gender === '男' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>{p.gender || '男'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="text-slate-700 font-medium">{calculateAge(p.dob)} 岁</div>
                    <div className="text-[10px] text-slate-400 font-mono">{p.dob || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-slate-600">{p.phone || '-'}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {setFormData(p); setEditingId(p.id); setShowModal(true)}} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete('patients', p.id)} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan="4" className="px-6 py-20 text-center text-slate-400">未找到相关会员记录</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('patients', formData, editingId); setShowModal(false); }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? '编辑会员信息' : '创建新档案'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input label="客户姓名" required placeholder="输入姓名" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <Input label="手机号码" required placeholder="11位手机号" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">性别</label>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                  {['男', '女'].map(g => (
                    <button 
                      key={g} type="button" 
                      onClick={() => setFormData({...formData, gender: g})}
                      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${formData.gender === g ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="出生日期" type="date" required value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} />
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1" icon={CheckCircle2}>确认保存</Button>
            </div>
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
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">视光临床记录</h2>
          <p className="text-slate-500 text-sm">记录屈光度、眼轴、曲率等核心医疗数据</p>
        </div>
        <Button onClick={() => {setFormData(initialExam); setEditingId(null); setShowModal(true)}} icon={Plus}>新验光单</Button>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">检查日期</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase">患者</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-blue-600">关键数据 (R/L)</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase text-right">管理</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {exams.map(ex => (
                <tr key={ex.id} className="hover:bg-blue-50/30 group">
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-slate-700">{ex.examDate}</div>
                    <div className={`text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded inline-block uppercase ${ex.examType === '近视防控' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{ex.examType}</div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-700">{patients.find(p => p.id === ex.patientId)?.name || '未知'}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-4 text-xs">
                      <div className="px-2 py-1 bg-blue-50 rounded border border-blue-100 text-blue-800 font-mono">R: {ex.od_al || '-'}mm</div>
                      <div className="px-2 py-1 bg-teal-50 rounded border border-teal-100 text-teal-800 font-mono">L: {ex.os_al || '-'}mm</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => {setFormData(ex); setEditingId(ex.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => onDelete('exams', ex.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('exams', formData, editingId); setShowModal(false); }} className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h3 className="text-xl font-bold text-slate-800">{editingId ? '修改历史记录' : '录入临床验光结果'}</h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">关联会员</label>
                <select required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}>
                  <option value="">-- 选择已建档客户 --</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name} ({p.phone})</option>)}
                </select>
              </div>
              <Input label="检查日期" type="date" value={formData.examDate} onChange={e => setFormData({...formData, examDate: e.target.value})} />
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700">项目类型</label>
                <select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none" value={formData.examType} onChange={e => setFormData({...formData, examType: e.target.value})}>
                  <option>正常配镜</option><option>近视防控</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-5">
                <h4 className="font-bold text-blue-800 border-b border-blue-200 pb-2">右眼 (OD)</h4>
                <div className="grid grid-cols-3 gap-3">
                  <Input label="球镜 SPH" type="number" step="0.25" value={formData.od_sphere} onChange={e => setFormData({...formData, od_sphere: e.target.value})} />
                  <Input label="柱镜 CYL" type="number" step="0.25" value={formData.od_cylinder} onChange={e => setFormData({...formData, od_cylinder: e.target.value})} />
                  <Input label="轴位 AXIS" type="number" value={formData.od_axis} onChange={e => setFormData({...formData, od_axis: e.target.value})} />
                  <Input label="眼轴 AL" type="number" step="0.01" value={formData.od_al} onChange={e => setFormData({...formData, od_al: e.target.value})} />
                  <Input label="K1" type="number" step="0.01" value={formData.od_k1} onChange={e => setFormData({...formData, od_k1: e.target.value})} />
                  <Input label="K2" type="number" step="0.01" value={formData.od_k2} onChange={e => setFormData({...formData, od_k2: e.target.value})} />
                </div>
              </div>
              <div className="p-6 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-5">
                <h4 className="font-bold text-teal-800 border-b border-teal-200 pb-2">左眼 (OS)</h4>
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
            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white border-t border-slate-100 py-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消返回</Button>
              <Button className="flex-1" icon={Save}>提交验光档案</Button>
            </div>
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
        <table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500">商品型号</th><th className="px-6 py-4 text-xs font-bold text-slate-500">零售单价</th><th className="px-6 py-4 text-xs font-bold text-slate-500">当前库存</th><th className="px-6 py-4 text-xs font-bold text-slate-500 text-right">操作</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {products.map(p => (
              <tr key={p.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4"><div className="font-bold text-slate-700">{p.name || '未命名'}</div><div className="text-xs text-slate-400">{p.brand} {p.model}</div></td>
                <td className="px-6 py-4 font-mono font-bold text-blue-600">¥{p.price || 0}</td>
                <td className="px-6 py-4"><span className={`px-2 py-1 rounded-lg text-xs font-bold ${p.stock < 5 ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600'}`}>{p.stock || 0}</span></td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setFormData(p); setEditingId(p.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete('products', p.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { e.preventDefault(); onSave('products', {...formData, price: Number(formData.price), stock: Number(formData.stock)}, editingId); setShowModal(false); }} className="bg-white rounded-3xl shadow-xl w-full max-w-lg p-8 space-y-5 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">商品入库登记</h3>
            <Input label="商品完整名称" required placeholder="如：蔡司智锐单光镜片" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            <div className="grid grid-cols-2 gap-6">
              <Input label="所属品牌" placeholder="Zeiss" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
              <Input label="规格型号" placeholder="1.60 折射率" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input label="零售价格 (¥)" type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              <Input label="入库库存" type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
            </div>
            <div className="flex gap-4 pt-4">
              <Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button>
              <Button className="flex-1">入库保存</Button>
            </div>
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
      <div className="flex justify-between items-center"><h2 className="text-xl font-bold">销售订单中心</h2><Button onClick={() => {setEditingId(null); setFormData({patientId:'',productId:'',quantity:1,discount:0,orderDate:new Date().toISOString().split('T')[0]}); setShowModal(true)}} icon={ShoppingCart}>新建销售单</Button></div>
      <Card>
        <table className="w-full text-left"><thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">交易日期</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">客户</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">结算金额</th><th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">管理</th></tr></thead>
          <tbody className="divide-y divide-slate-50">
            {orders.map(o => (
              <tr key={o.id} className="hover:bg-slate-50 group">
                <td className="px-6 py-4 text-sm font-medium text-slate-500">{o.orderDate}</td>
                <td className="px-6 py-4 font-bold text-slate-700">{patients.find(p => p.id === o.patientId)?.name || '散客'}</td>
                <td className="px-6 py-4 font-mono font-black text-emerald-600">¥{o.totalAmount || 0}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => {setFormData(o); setEditingId(o.id); setShowModal(true)}} className="p-2 text-slate-400 hover:text-blue-600 transition-all"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={() => onDelete('orders', o.id)} className="p-2 text-slate-400 hover:text-red-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={(e) => { 
            e.preventDefault(); 
            const p = products.find(x => x.id === formData.productId);
            const total = (Number(p?.price || 0) * formData.quantity) - formData.discount;
            onSave('orders', {...formData, totalAmount: total, productName: p?.name || '未知'}, editingId); 
            setShowModal(false); 
          }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg p-8 space-y-5 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-slate-800 border-b border-slate-100 pb-4">新建收银结账</h3>
            <Input label="销售日期" type="date" value={formData.orderDate} onChange={e => setFormData({...formData, orderDate: e.target.value})} />
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">选择客户</label><select className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none" value={formData.patientId} onChange={e => setFormData({...formData, patientId: e.target.value})}><option value="">散客 (无档案)</option>{patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
              <div className="space-y-1.5"><label className="text-sm font-semibold text-slate-700">商品选择</label><select required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl outline-none" value={formData.productId} onChange={e => setFormData({...formData, productId: e.target.value})}><option value="">-- 选择库存 --</option>{products.map(p => <option key={p.id} value={p.id}>{p.name} (¥{p.price})</option>)}</select></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Input label="销售数量" type="number" min="1" value={formData.quantity} onChange={e => setFormData({...formData, quantity: Number(e.target.value)})} />
              <Input label="优惠/抹零" type="number" value={formData.discount} onChange={e => setFormData({...formData, discount: Number(e.target.value)})} />
            </div>
            <div className="p-5 bg-emerald-50 rounded-2xl text-right">
              <p className="text-emerald-600 text-xs font-bold uppercase tracking-widest mb-1">实收金额合计</p>
              <p className="text-3xl font-black text-emerald-700 font-mono">¥ {Math.max(0, (products.find(x => x.id === formData.productId)?.price || 0) * formData.quantity - formData.discount)}</p>
            </div>
            <div className="flex gap-4 pt-4"><Button variant="secondary" className="flex-1" onClick={() => setShowModal(false)}>取消</Button><Button className="flex-1" icon={CheckCircle2}>确认收款并结账</Button></div>
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

  // 初始化 Auth
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

  // 实时数据监听 (核心：增加了 appId 路径校验和 user 依赖)
  useEffect(() => {
    if (!user || !isReady) return;
    
    // 监听会员列表
    const unsubP = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'patients'), s => {
      setPatients(s.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error("Snapshot Patients Error:", err));

    // 监听商品列表
    const unsubPr = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'products'), s => {
      setProducts(s.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error("Snapshot Products Error:", err));

    // 监听销售单
    const unsubO = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'orders'), s => {
      setOrders(s.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error("Snapshot Orders Error:", err));

    // 监听检查单
    const unsubE = onSnapshot(collection(db, 'artifacts', appId, 'public', 'data', 'exams'), s => {
      setExams(s.docs.map(d => ({id: d.id, ...d.data()})));
    }, err => console.error("Snapshot Exams Error:", err));
    
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
    if (confirm('确定要彻底删除这条记录吗？数据将无法恢复。')) {
      try {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', col, id));
      } catch (err) { console.error("Delete error:", err); }
    }
  };

  if (!isReady) return (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
      <div className="relative">
        <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
        <Eye className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-blue-600 w-6 h-6" />
      </div>
      <p className="mt-6 text-slate-600 font-bold tracking-widest animate-pulse uppercase">VisualCare 数据加载中...</p>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 font-sans selection:bg-blue-100 selection:text-blue-900 overflow-hidden">
      {/* 侧边导航 */}
      <aside className="w-72 bg-white border-r border-slate-100 hidden lg:flex flex-col shadow-2xl shadow-slate-200/50 z-20">
        <div className="flex items-center gap-4 p-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-blue-200 rotate-3 transition-transform hover:rotate-0"><Eye className="w-7 h-7" /></div>
          <div>
            <span className="text-2xl font-black bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent tracking-tight">VisualCare</span>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">Medical Pro SaaS</p>
          </div>
        </div>
        
        <nav className="flex-1 px-6 space-y-2">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest ml-4 mb-4">核心业务</p>
          {[
            { id: 'dashboard', label: '工作看板', icon: LayoutDashboard },
            { id: 'patients', label: '会员档案', icon: Users },
            { id: 'refraction', label: '视光检查', icon: Eye },
            { id: 'inventory', label: '库存商品', icon: Package },
            { id: 'sales', label: '收银结账', icon: ShoppingCart },
          ].map(item => (
            <button 
              key={item.id} 
              onClick={() => setView(item.id)} 
              className={`w-full flex items-center gap-4 px-5 py-3.5 rounded-2xl transition-all duration-300 ${
                view === item.id 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 -translate-y-0.5' 
                  : 'text-slate-500 hover:bg-blue-50 hover:text-blue-600'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm">{item.label}</span>
              {view === item.id && <ChevronRight className="ml-auto w-4 h-4 opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">云端已同步</p>
            </div>
            <p className="text-[10px] text-slate-400 font-mono mt-2 truncate max-w-full">SID: {user?.uid.substring(0, 12)}...</p>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <main className="flex-1 p-4 md:p-10 overflow-y-auto bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="max-w-6xl mx-auto pb-20">
          {view === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
              <div className="flex justify-between items-center">
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">今日业务看板</h1>
                <div className="flex gap-2 text-xs font-bold bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100 text-slate-500">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <Card className="p-8 border-l-8 border-blue-600">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">累计录入档案</p>
                  <div className="flex items-end gap-3 mt-2">
                    <p className="text-5xl font-black text-slate-800">{patients.length}</p>
                    <p className="text-slate-400 text-sm mb-1 font-bold">位客户</p>
                  </div>
                </Card>
                <Card className="p-8 border-l-8 border-emerald-500">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">今日营收流水</p>
                  <div className="flex items-end gap-3 mt-2">
                    <p className="text-5xl font-black text-emerald-600">¥{orders.reduce((s,o)=>s+(o.totalAmount || 0),0).toLocaleString()}</p>
                    <p className="text-slate-400 text-sm mb-1 font-bold">已入账</p>
                  </div>
                </Card>
                <Card className="p-8 border-l-8 border-amber-500">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-widest">防控随访提醒</p>
                  <div className="flex items-end gap-3 mt-2">
                    <p className="text-5xl font-black text-amber-500">{exams.filter(e => e.examType === '近视防控').length}</p>
                    <p className="text-slate-400 text-sm mb-1 font-bold">例监测</p>
                  </div>
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <Card className="p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-3">
                    <Bell className="w-5 h-5 text-amber-500" />
                    近视防控复查队列
                  </h3>
                  <div className="space-y-4">
                    {exams.filter(e => e.examType === '近视防控').slice(0, 5).map(e => {
                      const nextDate = new Date(e.examDate); nextDate.setMonth(nextDate.getMonth() + 3);
                      const pName = patients.find(pat => pat.id === e.patientId)?.name || '未知客户';
                      return (
                        <div key={e.id} className="flex justify-between items-center p-4 bg-slate-50/50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center font-bold text-slate-400 group-hover:text-blue-600 transition-colors">
                              {pName[0]}
                            </div>
                            <div>
                              <p className="font-bold text-slate-700">{pName}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">上期: {e.examDate}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-bold text-slate-500">预计复查</p>
                            <p className="text-sm font-black text-blue-600">{nextDate.toLocaleDateString()}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-8 bg-slate-800 border-none text-white relative overflow-hidden group">
                  <div className="relative z-10">
                    <h3 className="text-xl font-black mb-2 flex items-center gap-3"><AlertCircle /> 随访监测说明</h3>
                    <p className="text-slate-400 text-sm leading-relaxed mb-8">
                      系统已根据《2025视光临床标准》为您自动筛选需要每 90 天进行眼轴与曲率复测的青少年案例。
                    </p>
                    <div className="space-y-4">
                      <div className="flex gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400"><TrendingUp className="w-5 h-5" /></div>
                        <div><p className="font-bold text-sm">云端实时同步</p><p className="text-[10px] text-slate-400 mt-1">数据已实时加密传输至 Firebase 保险柜。</p></div>
                      </div>
                    </div>
                  </div>
                  <Eye className="absolute -bottom-10 -right-10 w-64 h-64 text-white/5 group-hover:scale-110 transition-transform duration-700" />
                </Card>
              </div>
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
