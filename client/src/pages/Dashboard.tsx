import { useAuth } from "@/hooks/use-auth";
import { usePipeline } from "@/hooks/use-pipeline";
import { useTenders } from "@/hooks/use-tenders";
import { Layout } from "@/components/Layout";
import { StatusBadge } from "@/components/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Activity, Trophy, Briefcase, TrendingUp } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: pipeline = [] } = usePipeline();
  const { data: recentTenders } = useTenders({ limit: 5 });

  // Compute stats
  const activeOpportunities = pipeline.filter(p => !['won', 'lost'].includes(p.stage)).length;
  const wonDeals = pipeline.filter(p => p.stage === 'won').length;
  const lostDeals = pipeline.filter(p => p.stage === 'lost').length;
  const winRate = wonDeals + lostDeals > 0 ? Math.round((wonDeals / (wonDeals + lostDeals)) * 100) : 0;

  const totalValue = pipeline
    .filter(p => p.tender.value)
    .reduce((sum, item) => sum + Number(item.tender.value), 0);

  // Chart Data
  const stageData = [
    { name: 'Discovered', value: pipeline.filter(p => p.stage === 'discovered').length },
    { name: 'Evaluating', value: pipeline.filter(p => p.stage === 'evaluating').length },
    { name: 'Preparing', value: pipeline.filter(p => p.stage === 'preparing').length },
    { name: 'Submitted', value: pipeline.filter(p => p.stage === 'submitted').length },
  ];

  const pieData = [
    { name: 'Won', value: wonDeals, color: '#10b981' }, // emerald-500
    { name: 'Lost', value: lostDeals, color: '#ef4444' }, // red-500
    { name: 'Active', value: activeOpportunities, color: '#3b82f6' }, // blue-500
  ].filter(d => d.value > 0);

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h2 className="text-3xl font-display font-bold text-gray-900">Welcome back, {user?.firstName}</h2>
          <p className="text-gray-500 mt-2">Here's what's happening in your tender pipeline today.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Active Pipeline"
            value={activeOpportunities.toString()}
            icon={Activity}
            color="text-blue-600"
            bgColor="bg-blue-50"
          />
          <StatCard
            title="Estimated Value"
            value={`$${(totalValue / 1000000).toFixed(1)}M`}
            icon={Briefcase}
            color="text-purple-600"
            bgColor="bg-purple-50"
          />
          <StatCard
            title="Win Rate"
            value={`${winRate}%`}
            icon={Trophy}
            color="text-emerald-600"
            bgColor="bg-emerald-50"
          />
          <StatCard
            title="New Tenders"
            value={recentTenders?.total.toString() || "0"}
            icon={TrendingUp}
            color="text-amber-600"
            bgColor="bg-amber-50"
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Pipeline Stages</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280'}} />
                    <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Outcome Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-4">
                {pieData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-gray-600">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: entry.color}} />
                    {entry.name}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Tenders */}
        <Card className="shadow-sm border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Opportunities</CardTitle>
            <Link href="/search" className="text-sm font-medium text-primary hover:underline">
              View All
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTenders?.data.map((tender) => (
                <div key={tender.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 border border-transparent hover:border-gray-100">
                  <div className="flex-1 min-w-0 pr-4">
                    <h4 className="font-semibold text-gray-900 truncate">{tender.title}</h4>
                    <p className="text-sm text-gray-500 mt-1">{tender.agency} • {tender.location}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    {tender.value && (
                       <span className="text-sm font-medium text-gray-700">
                         ${Number(tender.value).toLocaleString()}
                       </span>
                    )}
                    <StatusBadge status={tender.status} />
                  </div>
                </div>
              ))}
              {(!recentTenders?.data || recentTenders.data.length === 0) && (
                <div className="text-center py-8 text-gray-500">
                  No tenders found. Check back later!
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon: Icon, color, bgColor }: any) {
  return (
    <Card className="border-none shadow-sm card-hover">
      <CardContent className="p-6 flex items-center gap-4">
        <div className={`p-3 rounded-xl ${bgColor}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
