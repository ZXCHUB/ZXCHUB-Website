import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { 
  DollarSign, ShoppingCart, Users, Activity, Eye, Globe, 
  CornerUpLeft, Clock, Calendar, Settings, ChevronDown
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import SEO from '../../components/SEO';

type DateRange = 'today' | 'last_week' | 'last_month' | 'last_3_months' | 'last_year' | 'all_time';

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  today: 'Today',
  last_week: 'Last Week',
  last_month: 'Last Month',
  last_3_months: 'Last 3 Months',
  last_year: 'Last Year',
  all_time: 'All Time'
};

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'revenue' | 'traffic'>('revenue');
  const [dateRange, setDateRange] = useState<DateRange>('today');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({ revenue: 0, orders: 0, customers: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [topCustomers, setTopCustomers] = useState<any[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const [trafficChartData, setTrafficChartData] = useState<any[]>([]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDateDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [allPageviews, setAllPageviews] = useState<any[]>([]);

  useEffect(() => {
    const unsubTx = onSnapshot(collection(db, 'transactions'), (snap) => {
      setAllTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      setAllUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as any)));
    });
    const unsubPv = onSnapshot(collection(db, 'pageviews'), (snap) => {
      setAllPageviews(snap.docs.map(d => d.data() as any));
    });

    return () => {
      unsubTx();
      unsubUsers();
      unsubPv();
    };
  }, []);

  useEffect(() => {
    const processData = () => {
      try {
        const now = new Date();
        let startDate = new Date(0);
        
        if (dateRange === 'today') {
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        } else if (dateRange === 'last_week') {
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        } else if (dateRange === 'last_month') {
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        } else if (dateRange === 'last_3_months') {
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        } else if (dateRange === 'last_year') {
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        }

        const orders = allTransactions.filter(o => {
          if (!o.createdAt) return false;
          const orderDate = new Date(o.createdAt);
          return orderDate >= startDate;
        });

        let totalRev = 0;
        orders.forEach(o => totalRev += (o.amount || 0));

        const customers = allUsers.filter(u => {
          if (!u.createdAt) return true;
          const userDate = new Date(u.createdAt);
          return userDate >= startDate;
        });

        setStats({
          revenue: totalRev,
          orders: orders.length,
          customers: customers.length
        });

        const sortedOrders = [...orders].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, 5);
        setRecentOrders(sortedOrders);

        const productSales: Record<string, { title: string, sales: number, revenue: number }> = {};
        orders.forEach(o => {
          const pTitle = o.productTitle || o.productName || 'Unknown Product';
          if (!productSales[pTitle]) {
            productSales[pTitle] = { title: pTitle, sales: 0, revenue: 0 };
          }
          productSales[pTitle].sales += 1;
          productSales[pTitle].revenue += (o.amount || 0);
        });
        setTopProducts(Object.values(productSales).sort((a, b) => b.revenue - a.revenue).slice(0, 5));

        const customerSales: Record<string, { email: string, orders: number, spent: number }> = {};
        orders.forEach(o => {
          const user = allUsers.find((u: any) => u.id === o.userId);
          const email = user?.email || o.userEmail || 'Unknown';
          if (!customerSales[email]) {
            customerSales[email] = { email: email, orders: 0, spent: 0 };
          }
          customerSales[email].orders += 1;
          customerSales[email].spent += (o.amount || 0);
        });
        setTopCustomers(Object.values(customerSales).sort((a, b) => b.spent - a.spent).slice(0, 5));

        let chartData: any[] = [];
        
        if (dateRange === 'today') {
          const hours = Array.from({ length: 24 }).map((_, i) => ({
            time: `${i.toString().padStart(2, '0')}:00`,
            Revenue: 0,
            Orders: 0,
            hour: i
          }));
          orders.forEach(o => {
            const d = new Date(o.createdAt);
            const h = d.getHours();
            hours[h].Revenue += (o.amount || 0);
            hours[h].Orders += 1;
          });
          chartData = hours;
        } else if (dateRange === 'last_week' || dateRange === 'last_month') {
          const daysMap: Record<string, { time: string, Revenue: number, Orders: number }> = {};
          const daysCount = dateRange === 'last_week' ? 7 : 30;
          
          for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            daysMap[dateStr] = { time: dateStr, Revenue: 0, Orders: 0 };
          }
          
          orders.forEach(o => {
            const d = new Date(o.createdAt);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (daysMap[dateStr]) {
              daysMap[dateStr].Revenue += (o.amount || 0);
              daysMap[dateStr].Orders += 1;
            }
          });
          chartData = Object.values(daysMap);
        } else {
          const monthsMap: Record<string, { time: string, Revenue: number, Orders: number }> = {};
          const monthsCount = dateRange === 'last_3_months' ? 3 : (dateRange === 'last_year' ? 12 : 12);
          
          for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthsMap[monthStr] = { time: monthStr, Revenue: 0, Orders: 0 };
          }
          
          orders.forEach(o => {
            const d = new Date(o.createdAt);
            const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (monthsMap[monthStr]) {
              monthsMap[monthStr].Revenue += (o.amount || 0);
              monthsMap[monthStr].Orders += 1;
            } else if (dateRange === 'all_time') {
              monthsMap[monthStr] = { time: monthStr, Revenue: (o.amount || 0), Orders: 1 };
            }
          });
          chartData = Object.values(monthsMap);
        }

        setRevenueChartData(chartData);

        const pageviews = allPageviews.filter(pv => {
          if (!pv.timestamp) return false;
          return new Date(pv.timestamp) >= startDate;
        });

        let tChartData: any[] = [];
        const uniqueDevicesGeneral = new Set(pageviews.map(pv => pv.userAgent));
        
        if (dateRange === 'today') {
          const hours = Array.from({ length: 24 }).map((_, i) => ({
            time: `${i.toString().padStart(2, '0')}:00`,
            Pageviews: 0,
            UniqueVisitors: 0,
            _devices: new Set<string>()
          }));
          pageviews.forEach(pv => {
            const h = new Date(pv.timestamp).getHours();
            hours[h].Pageviews += 1;
            if (pv.userAgent) hours[h]._devices.add(pv.userAgent);
          });
          tChartData = hours.map(h => ({ time: h.time, Pageviews: h.Pageviews, UniqueVisitors: h._devices.size }));
        } else if (dateRange === 'last_week' || dateRange === 'last_month') {
          const daysMap: Record<string, { time: string, Pageviews: number, UniqueVisitors: number, _devices: Set<string> }> = {};
          const daysCount = dateRange === 'last_week' ? 7 : 30;
          for (let i = daysCount - 1; i >= 0; i--) {
            const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
            const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            daysMap[dateStr] = { time: dateStr, Pageviews: 0, UniqueVisitors: 0, _devices: new Set() };
          }
          pageviews.forEach(pv => {
            const dateStr = new Date(pv.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (daysMap[dateStr]) {
              daysMap[dateStr].Pageviews += 1;
              if (pv.userAgent) daysMap[dateStr]._devices.add(pv.userAgent);
            }
          });
          tChartData = Object.values(daysMap).map(d => ({ time: d.time, Pageviews: d.Pageviews, UniqueVisitors: d._devices.size }));
        } else {
          const monthsMap: Record<string, { time: string, Pageviews: number, UniqueVisitors: number, _devices: Set<string> }> = {};
          const monthsCount = dateRange === 'last_3_months' ? 3 : 12;
          for (let i = monthsCount - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const monthStr = d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            monthsMap[monthStr] = { time: monthStr, Pageviews: 0, UniqueVisitors: 0, _devices: new Set() };
          }
          pageviews.forEach(pv => {
            const monthStr = new Date(pv.timestamp).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            if (monthsMap[monthStr]) {
              monthsMap[monthStr].Pageviews += 1;
              if (pv.userAgent) monthsMap[monthStr]._devices.add(pv.userAgent);
            } else if (dateRange === 'all_time') {
              monthsMap[monthStr] = { time: monthStr, Pageviews: 1, UniqueVisitors: 1, _devices: new Set(pv.userAgent ? [pv.userAgent] : []) };
            }
          });
          tChartData = Object.values(monthsMap).map(m => ({ time: m.time, Pageviews: m.Pageviews, UniqueVisitors: m._devices.size }));
        }

        setTrafficChartData(tChartData);

      } catch (e) {
        console.error("Failed to process dashboard data", e);
      }
    };

    processData();
  }, [dateRange, allTransactions, allUsers, allPageviews]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 text-white pb-12">
      <SEO title="Admin Dashboard | Rumble Hub" description="Store statistics and insights." />
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">Discover the latest updates and insights regarding your store today.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
              className="flex items-center gap-2 bg-[#161d2b] border border-[#222b3d] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#1c2436] transition-colors"
            >
              <Calendar className="w-4 h-4" /> 
              {DATE_RANGE_LABELS[dateRange]}
              <ChevronDown className="w-4 h-4 ml-1 text-slate-400" />
            </button>
            
            {isDateDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-[#161d2b] border border-[#222b3d] rounded-lg shadow-xl z-50 overflow-hidden">
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => {
                      setDateRange(range);
                      setIsDateDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                      dateRange === range 
                        ? 'bg-indigo-500/10 text-indigo-400 font-medium' 
                        : 'text-slate-300 hover:bg-[#1e293b]'
                    }`}
                  >
                    {DATE_RANGE_LABELS[range]}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button className="flex items-center justify-center w-10 h-10 bg-[#161d2b] border border-[#222b3d] rounded-lg hover:bg-[#1c2436] transition-colors">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-6 border-b border-[#222b3d]">
        <button 
          onClick={() => setActiveTab('revenue')}
          className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'revenue' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
        >
          Revenue & Orders
          {activeTab === 'revenue' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />}
        </button>
        <button 
          onClick={() => setActiveTab('traffic')}
          className={`pb-3 text-sm font-medium transition-colors relative flex items-center gap-2 ${activeTab === 'traffic' ? 'text-white' : 'text-slate-400 hover:text-slate-300'}`}
        >
          Traffic & Visitors
          <span className="bg-indigo-500/20 text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-bold">NEW!</span>
          {activeTab === 'traffic' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 rounded-t-full" />}
        </button>
      </div>

      {/* Content */}
      {activeTab === 'revenue' ? (
        <div className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard title="Revenue" value={`$${stats.revenue.toFixed(2)}`} icon={DollarSign} trend="" />
            <StatCard title="New Orders" value={stats.orders.toString()} icon={ShoppingCart} trend="" />
            <StatCard title="New Customers" value={stats.customers.toString()} icon={Users} trend="" />
          </div>

          {/* Chart */}
          <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-6">Revenue & Orders</h3>
            <div className="h-[350px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222b3d" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => val.toFixed(1)} />
                  <Tooltip contentStyle={{ backgroundColor: '#161d2b', borderColor: '#222b3d', color: '#fff' }} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Revenue" stroke="#6366f1" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Orders" stroke="#ef4444" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tables */}
          <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
            <div className="p-6 border-b border-[#222b3d]">
              <h3 className="text-lg font-bold">Latest Completed Orders</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
                  <tr>
                    <th className="px-6 py-4 font-medium">Products</th>
                    <th className="px-6 py-4 font-medium">Price</th>
                    <th className="px-6 py-4 font-medium">Paid</th>
                    <th className="px-6 py-4 font-medium">Payment Method</th>
                    <th className="px-6 py-4 font-medium">Promo Code</th>
                    <th className="px-6 py-4 font-medium">E-mail</th>
                    <th className="px-6 py-4 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">No results found.</td>
                    </tr>
                  ) : (
                    recentOrders.map(order => {
                      const user = allUsers?.find(u => u.id === order.userId);
                      return (
                        <tr key={order.id} className="border-b border-[#222b3d]">
                          <td className="px-6 py-4">{order.productTitle || order.productName || 'Unknown Product'}</td>
                          <td className="px-6 py-4">${order.amount?.toFixed(2)}</td>
                          <td className="px-6 py-4 text-emerald-400">+${order.amount?.toFixed(2)}</td>
                          <td className="px-6 py-4 capitalize">{order.method || order.paymentMethod || 'Stripe'}</td>
                          <td className="px-6 py-4 text-slate-400">
                            {order.promoCode ? (
                              <div>
                                <span className="font-medium text-white">{order.promoCode}</span>
                                {order.promoDetails && <span className="text-xs ml-1 text-indigo-400">({order.promoDetails})</span>}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-6 py-4">{user?.email || order.userEmail || 'Unknown'}</td>
                          <td className="px-6 py-4">{new Date(order.createdAt).toLocaleString()}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#222b3d]">
                <h3 className="text-lg font-bold">Top 5 Products</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
                    <tr>
                      <th className="px-6 py-4 font-medium">Product</th>
                      <th className="px-6 py-4 font-medium">Total Sales</th>
                      <th className="px-6 py-4 font-medium">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topProducts.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No results found.</td>
                      </tr>
                    ) : (
                      topProducts.map((p, i) => (
                        <tr key={i} className="border-b border-[#222b3d]">
                          <td className="px-6 py-4">{p.title}</td>
                          <td className="px-6 py-4">{p.sales}</td>
                          <td className="px-6 py-4">${p.revenue.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl overflow-hidden">
              <div className="p-6 border-b border-[#222b3d]">
                <h3 className="text-lg font-bold">Top 5 Customers</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="text-xs text-slate-400 bg-[#1a2332] uppercase">
                    <tr>
                      <th className="px-6 py-4 font-medium">Customer Email</th>
                      <th className="px-6 py-4 font-medium">Total Orders</th>
                      <th className="px-6 py-4 font-medium">Total Spent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topCustomers.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-6 py-8 text-center text-slate-500">No results found.</td>
                      </tr>
                    ) : (
                      topCustomers.map(c => (
                        <tr key={c.email} className="border-b border-[#222b3d]">
                          <td className="px-6 py-4">{c.email}</td>
                          <td className="px-6 py-4">{c.orders}</td>
                          <td className="px-6 py-4">${c.spent.toFixed(2)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Traffic Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <StatCard title="Total Pageviews" value={trafficChartData.reduce((acc, curr) => acc + curr.Pageviews, 0).toString()} icon={Eye} trend="" />
            <StatCard title="Unique Device Hits" value={trafficChartData.reduce((acc, curr) => acc + curr.UniqueVisitors, 0).toString()} icon={Activity} trend="" />
            <StatCard title="Registered Users" value={allUsers.length.toString()} icon={Users} trend="" />
            <StatCard title="Total Orders" value={allTransactions.length.toString()} icon={Globe} trend="" />
          </div>

          {/* Traffic Chart */}
          <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6">
            <h3 className="text-lg font-bold mb-6">Pageviews & Visitors</h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trafficChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222b3d" vertical={false} />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#161d2b', borderColor: '#222b3d', color: '#fff' }} cursor={{fill: '#1e293b'}} />
                  <Legend iconType="square" wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="Pageviews" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="UniqueVisitors" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend }: { title: string, value: string, icon: any, trend: string }) {
  return (
    <div className="bg-[#161d2b] border border-[#222b3d] rounded-xl p-6 flex flex-col justify-between h-32">
      <div className="flex items-start justify-between">
        <h3 className="text-slate-300 font-medium">{title}</h3>
        <div className="w-8 h-8 bg-[#1e293b] rounded-lg flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-400" />
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-white">{value}</p>
        {trend && <p className="text-xs text-slate-500 mt-1">{trend}</p>}
      </div>
    </div>
  );
}
