import React, { useState, useMemo, useEffect } from 'react';
import { 
  Coffee, 
  Croissant, 
  Sandwich, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  ShoppingCart,
  Search,
  CheckCircle2,
  Utensils,
  IceCream,
  Banknote,
  QrCode,
  Smartphone,
  X,
  Printer,
  Menu, List, Wallet, Package, Archive, BarChart2, Settings, Edit3, LogOut, Filter, Calendar, ToggleLeft, Bluetooth, Wifi, Usb, PlusCircle, Monitor, ChevronLeft, Lock, ShieldCheck, FileText, AlertCircle
} from 'lucide-react';

// --- Firebase Initialization ---
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, getDoc, updateDoc, getDocs } from 'firebase/firestore';

const firebaseConfig = JSON.parse(__firebase_config);
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// --- Mock Data ---
const CATEGORIES = [
  { id: 'All', icon: <ShoppingCart size={18} /> },
  { id: 'Meals', icon: <Utensils size={18} /> },
  { id: 'Drinks', icon: <Coffee size={18} /> },
  { id: 'Desserts', icon: <IceCream size={18} /> },
];

const PRODUCTS = [
  { id: 1, name: 'Tapsilog', price: 180.00, category: 'Meals', color: 'bg-orange-100 text-orange-700' },
  { id: 2, name: 'Chicken Adobo', price: 220.00, category: 'Meals', color: 'bg-orange-100 text-orange-700' },
  { id: 3, name: 'Sinigang na Baboy', price: 280.00, category: 'Meals', color: 'bg-orange-100 text-orange-700' },
  { id: 4, name: 'Pansit Palabok', price: 160.00, category: 'Meals', color: 'bg-orange-100 text-orange-700' },
  { id: 5, name: 'Kapeng Barako', price: 95.00, category: 'Drinks', color: 'bg-amber-100 text-amber-700', options: [{name: '16oz', price: 95, cost: 40}, {name: '20oz', price: 105, cost: 45}, {name: '22oz', price: 115, cost: 50}] },
  { id: 6, name: 'Ube Latte', price: 140.00, category: 'Drinks', color: 'bg-amber-100 text-amber-700' },
  { id: 7, name: 'San Miguel Beer', price: 85.00, category: 'Drinks', color: 'bg-amber-100 text-amber-700' },
  { id: 8, name: 'Sago\'t Gulaman', price: 75.00, category: 'Drinks', color: 'bg-amber-100 text-amber-700' },
  { id: 9, name: 'Halo-Halo', price: 150.00, category: 'Desserts', color: 'bg-purple-100 text-purple-700' },
  { id: 10, name: 'Leche Flan', price: 90.00, category: 'Desserts', color: 'bg-purple-100 text-purple-700' },
  { id: 11, name: 'Turon (2pcs)', price: 50.00, category: 'Desserts', color: 'bg-purple-100 text-purple-700' },
  { id: 12, name: 'Kapé Con Leches', price: 95.00, category: 'Drinks', color: 'bg-amber-100 text-amber-700', options: [{name: '16oz', price: 95, cost: 40}, {name: '20oz', price: 105, cost: 45}, {name: '22oz', price: 115, cost: 50}] },
];

export default function POSSystem() {
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  
  // --- Live Database States ---
  const [user, setUser] = useState(null);
  const [liveTransactions, setLiveTransactions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [zReadings, setZReadings] = useState([]);
  const [grandTotalData, setGrandTotalData] = useState({ gt: 154200.00, resetCounter: 0 });
  const [receiptCounter, setReceiptCounter] = useState(1048);
  
  // Modify Item Modal States
  const [editingCartItem, setEditingCartItem] = useState(null);
  const [editQty, setEditQty] = useState(1);
  const [editDiscount, setEditDiscount] = useState('');
  const [editIdNumber, setEditIdNumber] = useState('');
  const [editIdName, setEditIdName] = useState('');
  
  // Checkout States
  const [showCheckout, setShowCheckout] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashGiven, setCashGiven] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  // --- Variant Selection State ---
  const [selectedItemForOptions, setSelectedItemForOptions] = useState(null);

  // --- Navigation State ---
  const [activeMenu, setActiveMenu] = useState('Register');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // --- Firebase Auth & Real-time Listeners ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    
    // Listen for live transactions
    const txRef = collection(db, 'artifacts', appId, 'users', user.uid, 'transactions');
    const unsubscribeTx = onSnapshot(txRef, (snapshot) => {
      const txs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      txs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setLiveTransactions(txs);
      
      // Update receipt counter sequence based on count
      if (txs.length > 0) {
        setReceiptCounter(1000 + txs.length + 1);
      }
    }, (error) => {
      console.error("Error fetching transactions:", error);
    });

    // Listen for Audit Logs
    const logsRef = collection(db, 'artifacts', appId, 'users', user.uid, 'auditLogs');
    const unsubscribeLogs = onSnapshot(logsRef, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setAuditLogs(logs);
    });

    // Listen for Z-Readings
    const zRef = collection(db, 'artifacts', appId, 'users', user.uid, 'zReadings');
    const unsubscribeZ = onSnapshot(zRef, (snapshot) => {
      const zList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      zList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      setZReadings(zList);
    });

    // Listen for Grand Total Metadata doc with robust atomic GT tracking
    const gtDocRef = doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'grandTotal');
    const unsubscribeGt = onSnapshot(gtDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setGrandTotalData(docSnap.data());
      } else {
        setDoc(gtDocRef, { gt: 154200.00, resetCounter: 0 });
      }
    });
    
    return () => {
      unsubscribeTx();
      unsubscribeLogs();
      unsubscribeZ();
      unsubscribeGt();
    };
  }, [user]);

  // --- Log Audit Helper ---
  const logAction = async (action, details) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'auditLogs'), {
        action,
        details,
        timestamp: new Date().toISOString(),
        date: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' })
      });
    } catch (err) {
      console.error("Audit log error:", err);
    }
  };

  // --- Auto-Print Logic ---
  useEffect(() => {
    if (paymentSuccess && receiptData) {
      const printTimer = setTimeout(() => {
        window.print();
      }, 500);
      return () => clearTimeout(printTimer);
    }
  }, [paymentSuccess, receiptData]);

  // --- Calculations (Non-VAT Rule) ---
  const { subtotal, grossSales, vatExemptSales, discountTotal, total } = useMemo(() => {
    let sub = 0;
    let exempt = 0;
    let discAmt = 0;
    let tot = 0;
    
    cart.forEach(item => {
      const lineGross = item.price * item.quantity;
      sub += lineGross;
      
      if (item.discountType) {
        const itemDiscount = lineGross * 0.20;
        exempt += lineGross;
        discAmt += itemDiscount;
        tot += (lineGross - itemDiscount);
      } else {
        tot += lineGross;
      }
    });
    
    return {
      subtotal: sub,
      grossSales: sub,
      vatExemptSales: exempt,
      discountTotal: discAmt,
      total: tot
    };
  }, [cart]);

  const filteredProducts = useMemo(() => {
    return PRODUCTS.filter(product => {
      const matchesCategory = activeCategory === 'All' || product.category === activeCategory;
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchQuery]);

  const addToCart = (product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1, isLocked: false }];
    });
  };

  const updateQuantity = (id, delta) => {
    const itemToUpdate = cart.find(item => item.id === id);
    if (itemToUpdate && itemToUpdate.isLocked) {
      alert("Cannot modify locked transaction item!");
      return;
    }
    setCart(prevCart => 
      prevCart.map(item => {
        if (item.id === id) {
          const newQuantity = item.quantity + delta;
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => {
    const itemToRemove = cart.find(item => item.id === id);
    if (itemToRemove && itemToRemove.isLocked) {
      logAction("VOID_BLOCKED", `Attempted to void locked item: ${itemToRemove.name}`);
      return;
    }
    setCart(prevCart => prevCart.filter(item => item.id !== id));
    logAction("ITEM_REMOVED", `Removed item ID ${id} from cart`);
  };

  const handleProductClick = (product) => {
    if (product.options && product.options.length > 0) {
      setSelectedItemForOptions(product);
    } else {
      addToCart(product);
    }
  };

  const handleOptionSelect = (option) => {
    const cartItem = {
      ...selectedItemForOptions,
      id: `${selectedItemForOptions.id}-${option.name}`, 
      name: `${selectedItemForOptions.name} (${option.name})`,
      price: option.price,
      cost: option.cost || 0,
      isLocked: false
    };
    addToCart(cartItem);
    setSelectedItemForOptions(null);
  };

  const handleCheckoutClick = () => {
    setShowCheckout(true);
    setPaymentMethod('Cash');
    setCashGiven('');
    setPaymentSuccess(false);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);
    try {
      const newReceiptNo = `OR-${receiptCounter}`;
      const newReceipt = {
        cart: [...cart],
        subtotal,
        grossSales,
        vatExemptSales,
        discountTotal,
        total,
        paymentMethod,
        cashGiven: paymentMethod === 'Cash' ? parseFloat(cashGiven) : total,
        change: paymentMethod === 'Cash' ? (parseFloat(cashGiven || 0) - total) : 0,
        date: new Date().toLocaleString('en-PH', { 
          timeZone: 'Asia/Manila',
          dateStyle: 'short',
          timeStyle: 'short'
        }),
        timestamp: new Date().toISOString(),
        receiptNo: newReceiptNo,
        posNo: 'POS-01',
        isLocked: false
      };

      if (user) {
        // Save transaction to Firebase
        await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'transactions'), newReceipt);
        
        // Robust Atomic GT Accumulation directly from in-memory state metadata (No heavy collection fetch loops)
        const currentGT = (grandTotalData.gt || 154200.00) + total;
        const currentResetCounter = grandTotalData.resetCounter || 0;

        const gtRef = doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'grandTotal');
        await setDoc(gtRef, { gt: currentGT, resetCounter: currentResetCounter }, { merge: true });

        await logAction("SALE_COMPLETED", `Processed sale ${newReceiptNo} for ₱${total.toFixed(2)} via ${paymentMethod}`);
      }

      setReceiptData(newReceipt);
      setPaymentSuccess(true);
      setReceiptCounter(prev => prev + 1);
    } catch (error) {
      console.error("Error completing payment:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleNewOrder = () => {
    setCart([]);
    setShowCheckout(false);
    setPaymentSuccess(false);
    setReceiptData(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const changeAmount = parseFloat(cashGiven || 0) - total;

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
    }).format(amount);
  };

  // --- Menu Router ---
  const renderMenuContent = () => {
    switch(activeMenu) {
      case 'Transactions': return <TransactionsView formatMoney={formatMoney} toggleMenu={() => setIsMenuOpen(true)} transactions={liveTransactions} />;
      case 'Cash Drawer': return <CashDrawerView formatMoney={formatMoney} toggleMenu={() => setIsMenuOpen(true)} transactions={liveTransactions} user={user} logAction={logAction} grandTotalData={grandTotalData} />;
      case 'Items': return <ItemsView formatMoney={formatMoney} toggleMenu={() => setIsMenuOpen(true)} user={user} logAction={logAction} />;
      case 'Inventory': return <InventoryView toggleMenu={() => setIsMenuOpen(true)} />;
      case 'Reports': return <ReportsView formatMoney={formatMoney} toggleMenu={() => setIsMenuOpen(true)} transactions={liveTransactions} zReadings={zReadings} grandTotalData={grandTotalData} auditLogs={auditLogs} />;
      case 'Settings': return <SettingsView toggleMenu={() => setIsMenuOpen(true)} />;
      case 'Receipt Editor': return <ReceiptEditorView toggleMenu={() => setIsMenuOpen(true)} />;
      case 'Logout': return <LogoutView onLogin={() => setActiveMenu('Register')} />;
      default: return null;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-800 overflow-hidden select-none relative">
      
      {/* Sidebar Menu Overlay */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 z-[60] bg-slate-900/50 backdrop-blur-sm transition-opacity" 
          onClick={() => setIsMenuOpen(false)}
        ></div>
      )}
      
      {/* Sidebar Navigation */}
      <div className={`fixed inset-y-0 left-0 z-[70] w-72 bg-slate-900 text-slate-300 transform transition-transform duration-300 ease-in-out ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'} shadow-2xl flex flex-col`}>
        <div className="p-6 text-white font-bold text-2xl border-b border-slate-800 flex justify-between items-center">
          <div>
            <span className="tracking-widest">POS PRO</span>
            <span className="block text-[10px] text-amber-400 font-mono mt-0.5">RMO 24-2023 NON-VAT COMPLIANT</span>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="text-slate-400 hover:text-white transition-colors">
            <X size={24}/>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto py-4">
          {[
            { id: 'Register', icon: <ShoppingCart size={20} /> },
            { id: 'Transactions', icon: <List size={20} /> },
            { id: 'Cash Drawer', icon: <Wallet size={20} /> },
            { id: 'Items', icon: <Package size={20} /> },
            { id: 'Inventory', icon: <Archive size={20} /> },
            { id: 'Reports', icon: <BarChart2 size={20} /> },
            { id: 'Settings', icon: <Settings size={20} /> },
            { id: 'Receipt Editor', icon: <Edit3 size={20} /> },
          ].map(menu => (
            <button
              key={menu.id}
              onClick={() => { setActiveMenu(menu.id); setIsMenuOpen(false); }}
              className={`w-full flex items-center px-6 py-4 transition-colors ${
                activeMenu === menu.id 
                  ? 'bg-blue-600 text-white border-l-4 border-blue-300 shadow-md' 
                  : 'hover:bg-slate-800 hover:text-white border-l-4 border-transparent'
              }`}
            >
              <span className="mr-4">{menu.icon}</span>
              <span className="font-semibold">{menu.id}</span>
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-800">
           <button
              onClick={() => { setActiveMenu('Logout'); setIsMenuOpen(false); }}
              className="w-full flex items-center px-6 py-4 text-red-400 hover:bg-slate-800 hover:text-red-300 transition-colors rounded-xl"
            >
              <span className="mr-4"><LogOut size={20} /></span>
              <span className="font-semibold">Logout</span>
            </button>
        </div>
      </div>

      {activeMenu !== 'Register' ? (
        renderMenuContent()
      ) : (
        <div className="flex w-full h-full relative">
          <style>{`
            @media print {
              body * { visibility: hidden; }
              .print-area, .print-area * { visibility: visible; }
              .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: white !important; }
              .no-print { display: none !important; }
            }
          `}</style>

          {/* Checkout & Receipt Overlay */}
          {showCheckout && (
            <div className="absolute inset-0 z-50 bg-slate-100 flex print-area">
              {paymentSuccess && receiptData ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8">
                   <div className="bg-white p-8 shadow-lg w-full max-w-sm font-mono text-xs text-slate-800 relative mb-8 rounded-none border border-slate-200">
                     <div className="text-center mb-4">
                        <h2 className="text-lg font-bold mb-1 tracking-wider">KAPAMPANGAN BISTRO</h2>
                        <p className="text-[11px] text-slate-500">Fields Ave, Angeles City</p>
                        <p className="text-[11px] text-slate-500 font-semibold mt-1">NON-VAT REGISTERED TIN: 000-123-456-000</p>
                     </div>
                     
                     <div className="text-left text-[11px] text-slate-700 mb-4 space-y-0.5">
                        <p>{receiptData.date}</p>
                        <p>OR No.: {receiptData.receiptNo}</p>
                        <p>POS No.: {receiptData.posNo}</p>
                     </div>

                     <div className="border-t border-dashed border-slate-400 py-3 mb-3 space-y-2">
                       {receiptData.cart.map(item => (
                         <div key={item.id} className="flex flex-col">
                           <div className="flex justify-between font-medium">
                             <span>{item.quantity}x {item.name}</span>
                             <span>{formatMoney(item.price * item.quantity)}</span>
                           </div>
                           {item.discountType && (
                             <span className="text-[10px] text-slate-500 pl-2">-20% {item.discountType}</span>
                           )}
                         </div>
                       ))}
                     </div>

                     <div className="border-t border-dashed border-slate-400 pt-3 pb-2 space-y-1">
                       <div className="flex justify-between text-slate-600">
                         <span>Gross Sales</span>
                         <span>{formatMoney(receiptData.grossSales)}</span>
                       </div>
                       <div className="flex justify-between text-slate-600">
                         <span>VAT-Exempt Sales</span>
                         <span>{formatMoney(receiptData.vatExemptSales)}</span>
                       </div>
                       {receiptData.discountTotal > 0 && (
                         <div className="flex justify-between text-slate-600">
                           <span>Discount</span>
                           <span>-{formatMoney(receiptData.discountTotal)}</span>
                         </div>
                       )}
                       <div className="flex justify-between text-sm font-bold mt-2 pt-1 border-t border-slate-300">
                         <span>Total Due</span>
                         <span>{formatMoney(receiptData.total)}</span>
                       </div>
                     </div>

                     <div className="border-t border-dashed border-slate-400 pt-3 pb-3 space-y-1">
                        <div className="flex justify-between">
                          <span>Payment Method</span>
                          <span>{receiptData.paymentMethod}</span>
                        </div>
                        {receiptData.paymentMethod === 'Cash' && (
                          <>
                            <div className="flex justify-between">
                              <span>Cash Tendered</span>
                              <span>{formatMoney(receiptData.cashGiven)}</span>
                            </div>
                            <div className="flex justify-between font-bold">
                              <span>Change</span>
                              <span>{formatMoney(receiptData.change)}</span>
                            </div>
                          </>
                        )}
                     </div>
                     
                     {receiptData.cart.some(item => item.discountType) && (
                       <div className="border-t border-dashed border-slate-400 pt-3 pb-3 space-y-2 text-[11px]">
                          <p className="font-bold text-center uppercase">DISCOUNT DETAILS</p>
                          {receiptData.cart.filter(item => item.discountType).reduce((unique, item) => {
                             if (!unique.some(u => u.discountId === item.discountId)) {
                               unique.push(item);
                             }
                             return unique;
                          }, []).map((discItem, idx) => (
                             <div key={idx} className="py-1">
                               <div className="flex justify-between">
                                 <span className="text-slate-500">Type:</span>
                                 <span className="font-semibold">{discItem.discountType}</span>
                               </div>
                               <div className="flex justify-between mt-0.5">
                                 <span className="text-slate-500">Name:</span>
                                 <span className="font-semibold">{discItem.discountName || 'N/A'}</span>
                               </div>
                               <div className="flex justify-between mt-0.5">
                                 <span className="text-slate-500">ID No:</span>
                                 <span className="font-mono">{discItem.discountId}</span>
                               </div>
                             </div>
                          ))}
                       </div>
                     )}

                     <div className="text-center text-[10px] text-slate-500 pb-2 mt-6 space-y-1">
                        <p>Thank you for dining with us!</p>
                        <p>Salamat po!</p>
                        <p className="mt-3 font-bold uppercase leading-tight">THIS DOCUMENT IS NOT VALID FOR<br/>CLAIM OF INPUT TAX</p>
                     </div>
                   </div>
                   
                   <div className="flex space-x-4 no-print">
                     <button onClick={handlePrint} className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700 transition-colors flex items-center">
                       <Printer size={18} className="mr-2" /> Print Thermal Receipt
                     </button>
                     <button onClick={handleNewOrder} className="px-6 py-3 bg-slate-200 text-slate-800 font-bold rounded-xl shadow-md hover:bg-slate-300 transition-colors">
                       Start New Order
                     </button>
                   </div>
                </div>
              ) : (
                <div className="flex w-full h-full bg-white">
                   <div className="w-1/2 p-8 bg-slate-50 flex flex-col no-print border-r border-slate-200">
                     <div className="flex justify-between items-center mb-8">
                        <h2 className="text-3xl font-bold text-slate-800">Select Payment</h2>
                        <button onClick={() => setShowCheckout(false)} className="p-3 bg-white rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-200 shadow-sm border border-slate-200">
                          <X size={24} />
                        </button>
                     </div>
                     <div className="grid grid-cols-2 gap-4 flex-1">
                        {[
                          {id: 'Cash', icon: <Banknote size={24} />, desc: 'Pay with exact or change'},
                          {id: 'GCash', icon: <QrCode size={24} />, desc: 'Scan via GCash App'},
                          {id: 'Maya', icon: <Smartphone size={24} />, desc: 'Scan via Maya App'},
                          {id: 'Card', icon: <CreditCard size={24} />, desc: 'Visa, Mastercard, BancNet'},
                          {id: 'QR Ph', icon: <QrCode size={24} />, desc: 'Any QR Ph App'}
                        ].map(method => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`w-full flex flex-col items-start p-5 rounded-2xl border-2 transition-all text-left ${
                              paymentMethod === method.id ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-transparent bg-white hover:border-slate-200 shadow-sm'
                            }`}
                          >
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${paymentMethod === method.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                              {method.icon}
                            </div>
                            <div>
                              <h3 className="font-bold text-lg text-slate-800">{method.id}</h3>
                              <p className="text-slate-500 text-sm mt-1">{method.desc}</p>
                            </div>
                          </button>
                        ))}
                     </div>
                   </div>

                   <div className="w-1/2 p-8 flex flex-col bg-white no-print">
                      <h2 className="text-2xl font-bold text-slate-800 mb-8">Payment Details</h2>
                      <div className="bg-slate-50 p-6 rounded-2xl mb-8 border border-slate-100">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-slate-500 text-lg">Total Amount</span>
                          <span className="text-3xl font-bold text-slate-900">{formatMoney(total)}</span>
                        </div>
                      </div>
                      
                      {paymentMethod === 'Cash' ? (
                        <div className="flex-1 flex flex-col">
                          <label className="text-slate-700 font-semibold mb-3 block">Amount Given</label>
                          <div className="relative mb-6">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl text-slate-400 font-bold">₱</span>
                            <input 
                              type="number"
                              value={cashGiven}
                              onChange={(e) => setCashGiven(e.target.value)}
                              placeholder="0.00"
                              className="w-full pl-10 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl text-2xl font-bold focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-3 mb-8">
                            {[100, 500, 1000].map(preset => (
                              <button key={preset} onClick={() => setCashGiven(preset.toString())} className="py-3 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold text-slate-700 transition-colors">+₱{preset}</button>
                            ))}
                            <button onClick={() => setCashGiven(total.toFixed(2).toString())} className="py-3 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl font-bold transition-colors col-span-3">Exact Amount</button>
                          </div>
                          <div className="flex justify-between items-center mt-auto p-4 bg-slate-50 rounded-xl">
                            <span className="text-slate-600 font-medium">Change:</span>
                            <span className={`text-2xl font-bold ${changeAmount >= 0 ? 'text-green-600' : 'text-red-500'}`}>{changeAmount >= 0 ? formatMoney(changeAmount) : 'Insufficient'}</span>
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-500">
                          {paymentMethod === 'GCash' || paymentMethod === 'Maya' || paymentMethod === 'QR Ph' ? <QrCode size={80} className="mb-4 opacity-20" /> : <CreditCard size={80} className="mb-4 opacity-20" />}
                          <p className="text-lg text-center px-8">Ask customer to scan the QR code or tap their card on the terminal.</p>
                        </div>
                      )}
                      
                      <button
                        onClick={handleConfirmPayment}
                        disabled={isProcessing || (paymentMethod === 'Cash' && changeAmount < 0)}
                        className={`w-full mt-6 py-4 rounded-xl text-xl font-bold transition-all flex items-center justify-center space-x-2 ${isProcessing || (paymentMethod === 'Cash' && changeAmount < 0) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-lg shadow-blue-600/30'}`}
                      >
                        {isProcessing ? <span className="animate-pulse">Processing...</span> : <span>Confirm {paymentMethod} Payment</span>}
                      </button>
                   </div>
                </div>
              )}
            </div>
          )}

          {/* LEFT SECTION: Products */}
          <div className="flex-1 flex flex-col h-full overflow-hidden relative z-10">
            {selectedItemForOptions ? (
              <div className="flex-1 flex flex-col bg-[#1e1e1e] text-white">
                <div className="flex justify-between items-center p-6 pb-4 border-b border-white/5">
                  <button onClick={() => setSelectedItemForOptions(null)} className="flex items-center text-slate-400 hover:text-white text-xl transition-colors">
                    <ChevronLeft className="w-6 h-6 mr-1" /> Back
                  </button>
                  <span className="text-xl">{selectedItemForOptions.name}</span>
                </div>
                <div className="p-8 pt-6">
                  <h2 className="text-lg text-white mb-6">Options</h2>
                  <div className="flex flex-wrap gap-4">
                    {selectedItemForOptions.options.map(opt => (
                      <button
                        key={opt.name}
                        onClick={() => handleOptionSelect(opt)}
                        className="w-32 h-32 flex items-center justify-center bg-[#2a2a2a] border-2 border-indigo-700 rounded-lg text-white text-lg hover:bg-[#333] transition-colors shadow-sm"
                      >
                        {opt.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <header className="px-8 pt-8 pb-4 flex justify-between items-center bg-slate-50">
                  <div className="flex items-center space-x-4">
                    <button 
                      onClick={() => setIsMenuOpen(true)} 
                      className="p-2 -ml-2 bg-white rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 shadow-sm border border-slate-200 transition-colors"
                    >
                      <Menu size={24} />
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Point of Sale (Non-VAT)</h1>
                      <p className="text-slate-500 text-sm mt-1">Select items to add to order</p>
                    </div>
                  </div>
                  
                  <div className="relative w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search products..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm transition-all"
                    />
                  </div>
                </header>

                <div className="px-8 py-2 flex space-x-3 overflow-x-auto no-scrollbar shrink-0">
                  {CATEGORIES.map(category => (
                    <button
                      key={category.id}
                      onClick={() => setActiveCategory(category.id)}
                      className={`flex items-center space-x-2 px-5 py-3 rounded-full text-sm font-medium transition-all shadow-sm ${
                        activeCategory === category.id
                          ? 'bg-slate-900 text-white shadow-md'
                          : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                      }`}
                    >
                      {category.icon}
                      <span>{category.id}</span>
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto px-8 py-6">
                  {filteredProducts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                      <Search size={48} className="mb-4 opacity-20" />
                      <p className="text-lg">No products found</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                      {filteredProducts.map(product => (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 hover:shadow-md hover:border-blue-200 transition-all active:scale-95 flex flex-col text-left group h-44"
                        >
                          <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${product.color}`}>
                            {product.category === 'Meals' && <Utensils size={24} />}
                            {product.category === 'Drinks' && <Coffee size={24} />}
                            {product.category === 'Desserts' && <IceCream size={24} />}
                          </div>
                          <div className="mt-auto">
                            <h3 className="font-semibold text-slate-800 line-clamp-2">{product.name}</h3>
                            <p className="text-blue-600 font-bold mt-1">
                              {product.options && product.options.length > 0 ? `Starts at ${formatMoney(Math.min(...product.options.map(o => o.price)))}` : formatMoney(product.price)}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* RIGHT SECTION: Cart */}
          <div className="w-96 bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.03)] flex flex-col z-20">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                Current Order
              </h2>
              <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-4">
                  <ShoppingCart size={48} className="opacity-20" />
                  <p>Your cart is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <div key={item.id} 
                       onClick={() => {
                         if (item.isLocked) {
                           alert("Locked transaction items cannot be modified!");
                           return;
                         }
                         setEditingCartItem(item);
                         setEditQty(item.quantity);
                         setEditDiscount(item.discountType || '');
                         setEditIdNumber(item.discountId || '');
                         setEditIdName(item.discountName || '');
                       }}
                       className={`flex flex-col p-4 rounded-2xl border transition-all hover:shadow-md ${item.isLocked ? 'bg-slate-100 border-slate-300 opacity-75 cursor-not-allowed' : 'bg-slate-50 border-slate-100 hover:border-blue-300 cursor-pointer'}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-4">
                        <h4 className="font-semibold text-slate-800 leading-tight flex items-center">
                          {item.name}
                          {item.isLocked && <Lock size={12} className="ml-1 text-amber-600" title="Locked by EOD Z-Reading" />}
                          {item.discountType && <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] rounded-full uppercase tracking-wider">{item.discountType}</span>}
                        </h4>
                        <p className="text-slate-500 text-sm mt-1">{formatMoney(item.price)}</p>
                      </div>
                      <p className="font-bold text-slate-800 shrink-0">
                        {formatMoney(item.price * item.quantity)}
                      </p>
                    </div>
                    
                    <div className="flex justify-between items-center mt-auto">
                      <div className="flex items-center space-x-3 bg-white border border-slate-200 rounded-full p-1" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, -1); }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-200 transition-colors"
                          disabled={item.quantity <= 1 || item.isLocked}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-semibold text-sm w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateQuantity(item.id, 1); }}
                          className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-600 hover:bg-slate-200 transition-colors"
                          disabled={item.isLocked}
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); removeFromCart(item.id); }}
                        className="w-10 h-10 flex items-center justify-center rounded-full text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        disabled={item.isLocked}
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-6 bg-white border-t border-slate-100 pb-8">
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-slate-500">
                  <span>Gross Sales</span>
                  <span>{formatMoney(grossSales)}</span>
                </div>
                {vatExemptSales > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>VAT-Exempt Sales</span>
                    <span>{formatMoney(vatExemptSales)}</span>
                  </div>
                )}
                {discountTotal > 0 && (
                  <div className="flex justify-between text-blue-600 font-medium">
                    <span>Discount</span>
                    <span>-{formatMoney(discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-slate-900 pt-2 border-t border-slate-100">
                  <span>Total Due</span>
                  <span>{formatMoney(total)}</span>
                </div>
              </div>
              
              <button 
                onClick={handleCheckoutClick}
                disabled={cart.length === 0}
                className={`w-full py-4 rounded-xl text-xl font-bold transition-all shadow-lg flex items-center justify-center space-x-2 ${cart.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-[0.98] shadow-blue-600/30'}`}
              >
                <span>Charge {formatMoney(total)}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modify Item Modal */}
      {editingCartItem && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setEditingCartItem(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-800">Modify Item</h2>
              <button onClick={() => setEditingCartItem(null)} className="p-2 text-slate-400 hover:text-slate-600 bg-white rounded-full shadow-sm border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="text-center mb-2">
                <h3 className="text-2xl font-bold text-slate-900">{editingCartItem.name}</h3>
                <p className="text-slate-500">{formatMoney(editingCartItem.price)}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block text-center">Adjust Quantity</label>
                <div className="flex items-center justify-center space-x-6 bg-slate-50 p-4 rounded-2xl border border-slate-100 w-3/4 mx-auto">
                  <button onClick={() => setEditQty(Math.max(1, editQty - 1))} className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 shadow-sm transition-all"><Minus size={20} /></button>
                  <span className="text-3xl font-bold text-slate-800 w-12 text-center">{editQty}</span>
                  <button onClick={() => setEditQty(editQty + 1)} className="w-12 h-12 flex items-center justify-center rounded-full bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-blue-600 shadow-sm transition-all"><Plus size={20} /></button>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 block">Government Discount</label>
                <div className="grid grid-cols-6 gap-2 mb-4">
                  {['PWD', 'SC', 'NAAC', 'MOV', 'SP', 'OTHERS'].map(type => (
                    <button
                      key={type}
                      onClick={() => setEditDiscount(editDiscount === type ? '' : type)}
                      className={`py-3 rounded-xl text-xs font-bold transition-all border ${
                        editDiscount === type
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/30'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
                
                {editDiscount && (
                  <div className="animate-in slide-in-from-top-2 fade-in duration-200 bg-blue-50 p-4 rounded-2xl border border-blue-100 space-y-2">
                    <input 
                      type="text" 
                      placeholder={`${editDiscount} ID Holder Name (Required)`}
                      value={editIdName}
                      onChange={(e) => setEditIdName(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <input 
                      type="text" 
                      placeholder={`${editDiscount} ID Number (Required)`}
                      value={editIdNumber}
                      onChange={(e) => setEditIdNumber(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                    />
                    <p className="text-xs text-blue-700 font-medium flex items-center pt-1"><CheckCircle2 size={14} className="mr-1"/> 20% Discount & VAT Exempt Applied</p>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex space-x-3">
              <button 
                onClick={() => {
                  removeFromCart(editingCartItem.id);
                  setEditingCartItem(null);
                }}
                className="px-6 py-4 bg-red-100 text-red-600 rounded-xl font-bold hover:bg-red-200 transition-colors flex items-center justify-center border border-red-200"
              >
                <Trash2 size={20} />
              </button>
              <button 
                onClick={() => {
                  setCart(prev => prev.map(item => 
                    item.id === editingCartItem.id 
                      ? { ...item, quantity: editQty, discountType: editDiscount, discountId: editIdNumber, discountName: editIdName }
                      : item
                  ));
                  setEditingCartItem(null);
                }}
                className="flex-1 py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-[0.98]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// --- Sidebar View Components ---

const TopBar = ({ title, toggleMenu }) => (
  <div className="px-8 py-6 bg-white border-b border-slate-200 flex items-center space-x-4 shrink-0 shadow-sm z-10">
    <button onClick={toggleMenu} className="p-2 -ml-2 bg-slate-50 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 shadow-sm transition-colors border border-slate-200">
      <Menu size={24} />
    </button>
    <div>
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
      <span className="text-[11px] font-mono text-amber-600 font-semibold">BIR RMO 24-2023 COMPLIANT • NON-VAT</span>
    </div>
  </div>
);

const TransactionsView = ({ formatMoney, toggleMenu, transactions }) => (
  <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
    <TopBar title="Transactions & Electronic Journal (E-Journal)" toggleMenu={toggleMenu} />
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-4">
            <div className="flex items-center border border-slate-300 rounded-lg px-4 py-2 bg-slate-50 cursor-pointer">
              <Calendar size={18} className="text-slate-500 mr-2" />
              <span className="text-sm font-medium">All Sales E-Journal (Tamper-Free)</span>
            </div>
          </div>
          <span className="text-xs font-mono bg-slate-100 px-3 py-1 rounded text-slate-600">Total Records: {transactions.length}</span>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-sm text-slate-500 uppercase tracking-wider">
              <th className="py-4 px-2 font-semibold">Date & Time</th>
              <th className="py-4 px-2 font-semibold">OR No.</th>
              <th className="py-4 px-2 font-semibold">Payment</th>
              <th className="py-4 px-2 font-semibold">Status</th>
              <th className="py-4 px-2 font-semibold text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="py-8 text-center text-slate-400 font-medium">No recorded transactions found.</td>
              </tr>
            ) : (
              transactions.map((tx) => (
                 <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                   <td className="py-4 px-2 text-sm text-slate-700">{tx.date}</td>
                   <td className="py-4 px-2 text-sm font-mono text-blue-600 font-medium">{tx.receiptNo}</td>
                   <td className="py-4 px-2 text-sm">
                     <span className="px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600">{tx.paymentMethod}</span>
                   </td>
                   <td className="py-4 px-2 text-sm">
                     {tx.isLocked ? (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                         <Lock size={10} className="mr-1" /> Locked (Z-Read)
                       </span>
                     ) : (
                       <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                         Active
                       </span>
                     )}
                   </td>
                   <td className="py-4 px-2 text-sm text-right font-bold text-slate-900">{formatMoney(tx.total)}</td>
                 </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const CashDrawerView = ({ formatMoney, toggleMenu, transactions, user, logAction, grandTotalData }) => {
  const [isZProcessing, setIsZProcessing] = useState(false);
  const [lastZReading, setLastZReading] = useState(null);

  useEffect(() => {
    if (!user) return;
    const zRef = collection(db, 'artifacts', appId, 'users', user.uid, 'zReadings');
    const unsubscribe = onSnapshot(zRef, (snapshot) => {
      const zList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      zList.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
      if (zList.length > 0) {
        setLastZReading(zList[0]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  const cashSales = transactions.filter(t => t.paymentMethod === 'Cash').reduce((sum, t) => sum + t.total, 0);
  const gcashSales = transactions.filter(t => t.paymentMethod === 'GCash').reduce((sum, t) => sum + t.total, 0);
  const cardSales = transactions.filter(t => t.paymentMethod === 'Card').reduce((sum, t) => sum + t.total, 0);
  const mayaSales = transactions.filter(t => t.paymentMethod === 'Maya').reduce((sum, t) => sum + t.total, 0);
  const qrPhSales = transactions.filter(t => t.paymentMethod === 'QR Ph').reduce((sum, t) => sum + t.total, 0);
  
  const startingCash = 2000.00;
  const expectedCashInDrawer = startingCash + cashSales;

  const handleExecuteZReading = async () => {
    if (!user) return;
    setIsZProcessing(true);
    try {
      const todayGross = transactions.reduce((sum, t) => sum + t.total, 0);
      const nextZCount = (lastZReading ? lastZReading.zCounter : 0) + 1;
      const zReportId = `Z-${String(nextZCount).padStart(4, '0')}`;

      const zReportData = {
        zCounter: nextZCount,
        zReportId,
        date: new Date().toLocaleString('en-PH', { timeZone: 'Asia/Manila' }),
        timestamp: new Date().toISOString(),
        startingGrandTotal: (grandTotalData.gt || 154200.00) - todayGross,
        todayGrossSales: todayGross,
        endingGrandTotal: grandTotalData.gt || 154200.00,
        transactionCount: transactions.length,
        cashSales,
        digitalSales: gcashSales + cardSales + mayaSales + qrPhSales
      };

      // Save Z-reading record
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'zReadings'), zReportData);

      // Permanently lock transactions
      for (const tx of transactions) {
        const txRef = doc(db, 'artifacts', appId, 'users', user.uid, 'transactions', tx.id);
        await updateDoc(txRef, { isLocked: true });
      }

      // Increment resetCounter / Z-counter in metadata grandTotal doc atomically
      const gtRef = doc(db, 'artifacts', appId, 'users', user.uid, 'metadata', 'grandTotal');
      await setDoc(gtRef, { 
        gt: grandTotalData.gt || 154200.00, 
        resetCounter: (grandTotalData.resetCounter || 0) + 1 
      }, { merge: true });

      await logAction("Z_READING_EXECUTED", `Generated ${zReportId} successfully. Total Sales: ₱${todayGross.toFixed(2)}`);
      alert(`Z-Reading (${zReportId}) successfully generated, Z-Counter incremented, and transactions locked for the day!`);
    } catch (err) {
      console.error("Z-Reading execution error:", err);
      alert("Error generating Z-Reading.");
    } finally {
      setIsZProcessing(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
      <TopBar title="Cash Drawer & End-of-Day Z-Reading" toggleMenu={toggleMenu} />
      <div className="p-8 flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
            <div>
              <p className="text-slate-500 text-sm font-medium uppercase tracking-wider mb-1">Expected Cash in Drawer</p>
              <h2 className="text-4xl font-bold text-slate-900">{formatMoney(expectedCashInDrawer)}</h2>
            </div>
            <button 
              onClick={handleExecuteZReading}
              disabled={isZProcessing}
              className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-md transition-all active:scale-95 flex items-center"
            >
              <ShieldCheck size={20} className="mr-2" />
              {isZProcessing ? 'Processing EOD...' : 'Execute Z-Reading & Lock Day'}
            </button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Starting Cash</p>
              <p className="text-2xl font-bold text-slate-800">{formatMoney(startingCash)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Cash Sales</p>
              <p className="text-2xl font-bold text-green-600">{formatMoney(cashSales)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">GCash Received</p>
              <p className="text-2xl font-bold text-blue-600">{formatMoney(gcashSales)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Card Received</p>
              <p className="text-2xl font-bold text-purple-600">{formatMoney(cardSales)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">Maya Received</p>
              <p className="text-2xl font-bold text-indigo-600">{formatMoney(mayaSales)}</p>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-center">
              <p className="text-slate-500 text-sm font-medium mb-2">QR Ph Received</p>
              <p className="text-2xl font-bold text-teal-600">{formatMoney(qrPhSales)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const INVENTORY_DATA = [
  {
    id: 1,
    name: 'Bahn Mi',
    items: [
      {
        id: 101, name: 'Bành Mì',
        variants: [
          { name: 'Grilled Pork', price: 149, cost: 76 },
          { name: 'Shredded Chicken', price: 149, cost: 64 },
          { name: 'Spicy Tuna', price: 149, cost: 53 },
        ]
      }
    ]
  },
  {
    id: 2,
    name: 'Classic Coffee',
    items: [
      {
        id: 201, name: 'Caramel Macchiato',
        variants: [
          { name: '16oz', price: 95, cost: 46 },
          { name: '20oz', price: 105, cost: 51 },
          { name: '22oz', price: 115, cost: 60 },
        ]
      }
    ]
  }
];

const ItemsView = ({ toggleMenu, user, logAction }) => (
  <div className="flex-1 flex flex-col h-full bg-white w-full animate-in fade-in duration-300">
    <div className="px-6 py-4 bg-white flex items-center justify-between shrink-0 shadow-[0_2px_10px_rgba(0,0,0,0.05)] z-10 border-b border-slate-100">
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-4">
          <button onClick={toggleMenu} className="p-2 -ml-2 text-slate-500 hover:text-slate-800 transition-colors">
            <Menu size={28} />
          </button>
          <h1 className="text-xl font-bold text-slate-700">Items & Categories</h1>
        </div>
      </div>
      <div className="flex items-center space-x-4">
        <button onClick={() => logAction("ADD_CATEGORY", "Clicked Add Category")} className="flex items-center px-6 py-2.5 bg-[#7bc8be] text-white rounded-full text-[15px] font-bold shadow-sm hover:bg-[#6ab3a9] transition-colors">
           <PlusCircle size={20} className="mr-2" /> Category
        </button>
      </div>
    </div>

    <div className="p-6 flex-1 overflow-y-auto bg-white">
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 max-w-[1600px] mx-auto items-start">
        {INVENTORY_DATA.map(category => (
          <div key={category.id} className="flex flex-col rounded-xl overflow-hidden bg-[#f4f5f7] border border-slate-100 shadow-sm">
            <div className="bg-[#7bc8be] text-white px-5 py-4 flex justify-between items-center rounded-t-xl">
              <div className="flex items-center space-x-3">
                <Edit3 size={20} className="opacity-90 cursor-pointer" />
                <span className="font-bold text-lg tracking-wide">{category.name}</span>
              </div>
              <PlusCircle size={24} className="opacity-90 cursor-pointer" />
            </div>
            
            <div className="flex justify-end px-7 py-3 text-xs text-slate-400 font-bold uppercase tracking-wider">
               <span className="w-16 text-right">Price</span>
               <span className="w-16 text-right ml-6">Cost</span>
            </div>
            
            <div className="px-3 pb-3 space-y-3">
              {category.items.map(item => (
                <div key={item.id} className="bg-white rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] border border-slate-100/50">
                  <div className="flex items-center space-x-3 mb-4">
                    <Trash2 size={20} className="text-red-300 hover:text-red-500 cursor-pointer transition-colors stroke-[1.5]" />
                    <Edit3 size={20} className="text-[#7bc8be] hover:text-[#5fa89e] cursor-pointer transition-colors stroke-[1.5]" />
                    <span className="font-bold text-slate-700 text-base">{item.name}</span>
                  </div>
                  
                  <div className="pl-12 flex flex-col space-y-3">
                    {item.variants.map((v, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[15px] font-semibold text-slate-500">
                        <span>{v.name}</span>
                        <div className="flex">
                          <span className="w-16 text-right">P{v.price}</span>
                          <span className="w-16 text-right ml-6">P{v.cost}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const InventoryView = ({ toggleMenu }) => (
  <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
    <TopBar title="Inventory Management" toggleMenu={toggleMenu} />
    <div className="p-8 flex-1 flex items-center justify-center text-slate-400">
      <div className="text-center">
        <Archive size={64} className="mx-auto mb-4 opacity-20" />
        <h2 className="text-2xl font-bold text-slate-600 mb-2">Stock Levels</h2>
        <p>Monitor warehouse and ingredient stocks here.</p>
      </div>
    </div>
  </div>
);

const ReportsView = ({ formatMoney, toggleMenu, transactions, zReadings, grandTotalData, auditLogs }) => (
  <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
    <TopBar title="Reports (X & Z Readings & Grand Total)" toggleMenu={toggleMenu} />
    <div className="p-8 flex-1 overflow-y-auto space-y-8 max-w-5xl mx-auto">
      <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-xl flex justify-between items-center border border-slate-800">
        <div>
          <p className="text-amber-400 text-xs font-mono font-bold tracking-widest uppercase mb-1">Non-Resettable Accumulated Grand Total (GT)</p>
          <h2 className="text-4xl font-extrabold font-mono tracking-tight">{formatMoney(grandTotalData.gt)}</h2>
          <p className="text-xs text-slate-400 mt-2">Permanently accumulates gross sales across all shifts.</p>
        </div>
        <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 text-right">
          <p className="text-xs text-slate-400">Reset Counter (Z-Counter)</p>
          <p className="text-2xl font-bold font-mono text-white">{grandTotalData.resetCounter || 0}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center"><FileText size={20} className="mr-2 text-blue-600"/> Z-Readings Archive</h3>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 text-xs text-slate-500 uppercase">
              <th className="py-3 px-2">Z-ID</th>
              <th className="py-3 px-2">Timestamp</th>
              <th className="py-3 px-2">Transactions</th>
              <th className="py-3 px-2 text-right">Day Gross Sales</th>
            </tr>
          </thead>
          <tbody>
            {zReadings.length === 0 ? (
              <tr><td colSpan="4" className="py-6 text-center text-slate-400 text-sm">No Z-Readings generated yet.</td></tr>
            ) : (
              zReadings.map(z => (
                <tr key={z.id} className="border-b border-slate-100 text-sm">
                  <td className="py-3 px-2 font-mono font-bold text-blue-600">{z.zReportId}</td>
                  <td className="py-3 px-2 text-slate-600">{z.date}</td>
                  <td className="py-3 px-2">{z.transactionCount}</td>
                  <td className="py-3 px-2 text-right font-bold text-slate-900">{formatMoney(z.todayGrossSales)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center"><ShieldCheck size={20} className="mr-2 text-green-600"/> Tamper-Free Audit Logs (RMO 24-2023)</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-xs">
          {auditLogs.length === 0 ? (
            <p className="text-slate-400 text-center py-4">No audit logs recorded.</p>
          ) : (
            auditLogs.map(log => (
              <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-lg flex justify-between items-center">
                <div>
                  <span className="font-bold text-blue-600 mr-2">[{log.action}]</span>
                  <span className="text-slate-700">{log.details}</span>
                </div>
                <span className="text-slate-400">{log.date}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  </div>
);

const SettingsView = ({ toggleMenu }) => (
  <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
    <TopBar title="Settings (Windows Thermal Printer & Devices)" toggleMenu={toggleMenu} />
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-100 px-6 py-4 border-b border-slate-200">
            <h3 className="font-bold text-slate-800 flex items-center"><Printer size={18} className="mr-2"/> Windows Thermal Printer Integration</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex justify-between items-center p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <p className="font-bold text-slate-800">Default Windows Thermal Printer (80mm)</p>
                <p className="text-xs text-slate-500">Connected via USB / Windows Spooler</p>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">Ready</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

const ReceiptEditorView = ({ toggleMenu }) => {
  const [showTin, setShowTin] = useState(true);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 w-full animate-in fade-in duration-300">
      <TopBar title="Receipt Layout Editor" toggleMenu={toggleMenu} />
      <div className="flex-1 flex overflow-hidden">
        <div className="w-1/2 p-8 border-r border-slate-200 overflow-y-auto">
          <h2 className="text-xl font-bold mb-6 text-slate-800">BIR Compliance Layout</h2>
          <div className="space-y-4 mb-8">
            <div className="py-2 border-b border-slate-100">
              <div className="flex justify-between items-center py-2 cursor-pointer group" onClick={() => setShowTin(!showTin)}>
                <span className="font-medium text-slate-700">Show Non-VAT TIN Number</span>
                <div className={`w-12 h-6 rounded-full flex items-center p-1 transition-colors ${showTin ? 'bg-blue-600' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${showTin ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </div>
              </div>
              
              {showTin && (
                <div className="mt-4 mb-2 pl-4 border-l-2 border-slate-200 space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">Tax Registration Type</label>
                    <input type="text" readOnly value="NON-VAT REGISTERED TIN" className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-bold text-slate-700" />
                  </div>
                  <div>
                     <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider block mb-2">TIN Number</label>
                     <input type="text" defaultValue="000-123-456-000" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="w-1/2 bg-slate-200 p-8 flex items-center justify-center overflow-y-auto">
           <div className="bg-white p-8 shadow-sm border border-slate-200 w-full max-w-sm font-mono text-xs text-slate-800 mx-auto relative rounded-md">
              <div className="text-center mb-6">
                <h2 className="text-lg font-bold mb-1 tracking-wider">KAPAMPANGAN BISTRO</h2>
                <p className="text-[11px] text-slate-500">Fields Ave, Angeles City</p>
                {showTin && (
                  <p className="text-[11px] text-slate-500 font-semibold mt-1">NON-VAT REGISTERED TIN: 000-123-456-000</p>
                )}
              </div>
              <div className="border-t border-dashed border-slate-400 py-4 mb-4 text-center">
                <p className="text-slate-400 italic">[ Itemized List Here ]</p>
              </div>
              <div className="text-center text-[10px] text-slate-500 pb-2 mt-6 space-y-1">
                <p>Thank you for dining with us!</p>
                <p className="mt-3 font-bold uppercase leading-tight">THIS DOCUMENT IS NOT VALID FOR<br/>CLAIM OF INPUT TAX</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const LogoutView = ({ onLogin }) => (
  <div className="flex-1 flex flex-col h-full bg-slate-900 w-full items-center justify-center animate-in zoom-in duration-300">
    <div className="bg-white p-10 rounded-3xl shadow-2xl text-center max-w-md w-full">
      <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <LogOut size={32} className="text-slate-400" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">Logged Out</h2>
      <p className="text-slate-500 mb-8">You have securely signed out of the POS system.</p>
      <button 
        onClick={onLogin}
        className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-colors"
      >
        Log In Again
      </button>
    </div>
  </div>
);