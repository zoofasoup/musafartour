import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  MousePointer, 
  Target, 
  Calendar,
  RefreshCw,
  ArrowUpRight,
  Percent
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval, startOfWeek, endOfWeek, eachWeekOfInterval, subWeeks } from 'date-fns';
import { id as localeId } from 'date-fns/locale';
import type { CSNumber } from '@/lib/whatsappRotation';

interface ClickData {
  id: string;
  cs_id: string | null;
  cs_name: string;
  clicked_at: string;
  utm_source: string | null;
  utm_campaign: string | null;
}

interface ConversionData {
  id: string;
  cs_id: string | null;
  click_id: string | null;
  converted_at: string;
  customer_name: string | null;
  package_name: string | null;
}

interface CSPerformance {
  csId: string;
  csName: string;
  totalClicks: number;
  totalConversions: number;
  conversionRate: number;
  weight: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface DailyData {
  date: string;
  dateLabel: string;
  clicks: number;
  conversions: number;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const CSAnalyticsDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [csNumbers, setCsNumbers] = useState<CSNumber[]>([]);
  const [clicks, setClicks] = useState<ClickData[]>([]);
  const [conversions, setConversions] = useState<ConversionData[]>([]);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | '30d' | '90d'>('7d');
  
  const dateRangeMap = {
    '7d': 7,
    '14d': 14,
    '30d': 30,
    '90d': 90
  };

  const fetchData = async () => {
    setLoading(true);
    
    const days = dateRangeMap[dateRange];
    const startDate = subDays(new Date(), days).toISOString();
    
    const [csRes, clicksRes, conversionsRes] = await Promise.all([
      supabase.from('whatsapp_cs').select('*').order('display_order'),
      supabase
        .from('whatsapp_clicks')
        .select('id, cs_id, cs_name, clicked_at, utm_source, utm_campaign')
        .gte('clicked_at', startDate)
        .order('clicked_at', { ascending: false }),
      supabase
        .from('whatsapp_conversions')
        .select('id, cs_id, click_id, converted_at, customer_name, package_name')
        .gte('converted_at', startDate)
        .order('converted_at', { ascending: false })
    ]);
    
    setCsNumbers((csRes.data || []) as CSNumber[]);
    setClicks(clicksRes.data || []);
    setConversions(conversionsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  // Calculate CS performance metrics
  const csPerformance: CSPerformance[] = useMemo(() => {
    const days = dateRangeMap[dateRange];
    const midpoint = subDays(new Date(), Math.floor(days / 2));
    
    return csNumbers.map(cs => {
      const csClicks = clicks.filter(c => c.cs_id === cs.id);
      const csConversions = conversions.filter(c => c.cs_id === cs.id);
      
      // Calculate trend (compare first half vs second half)
      const firstHalfClicks = csClicks.filter(c => new Date(c.clicked_at) < midpoint).length;
      const secondHalfClicks = csClicks.filter(c => new Date(c.clicked_at) >= midpoint).length;
      
      let trend: 'up' | 'down' | 'stable' = 'stable';
      let trendValue = 0;
      
      if (firstHalfClicks > 0) {
        trendValue = ((secondHalfClicks - firstHalfClicks) / firstHalfClicks) * 100;
        trend = trendValue > 5 ? 'up' : trendValue < -5 ? 'down' : 'stable';
      } else if (secondHalfClicks > 0) {
        trend = 'up';
        trendValue = 100;
      }
      
      return {
        csId: cs.id,
        csName: cs.name,
        totalClicks: csClicks.length,
        totalConversions: csConversions.length,
        conversionRate: csClicks.length > 0 ? (csConversions.length / csClicks.length) * 100 : 0,
        weight: cs.weight || 1,
        trend,
        trendValue
      };
    }).sort((a, b) => b.totalClicks - a.totalClicks);
  }, [csNumbers, clicks, conversions, dateRange]);

  // Daily trend data
  const dailyData: DailyData[] = useMemo(() => {
    const days = dateRangeMap[dateRange];
    const interval = eachDayOfInterval({
      start: subDays(new Date(), days - 1),
      end: new Date()
    });
    
    return interval.map(day => {
      const dayStart = startOfDay(day);
      const dayEnd = endOfDay(day);
      
      const dayClicks = clicks.filter(c => {
        const date = new Date(c.clicked_at);
        return date >= dayStart && date <= dayEnd;
      }).length;
      
      const dayConversions = conversions.filter(c => {
        const date = new Date(c.converted_at);
        return date >= dayStart && date <= dayEnd;
      }).length;
      
      return {
        date: format(day, 'yyyy-MM-dd'),
        dateLabel: format(day, 'dd MMM', { locale: localeId }),
        clicks: dayClicks,
        conversions: dayConversions
      };
    });
  }, [clicks, conversions, dateRange]);

  // Campaign performance
  const campaignData = useMemo(() => {
    const campaigns: Record<string, { clicks: number; conversions: number }> = {};
    
    clicks.forEach(click => {
      const campaign = click.utm_campaign || 'Direct';
      if (!campaigns[campaign]) {
        campaigns[campaign] = { clicks: 0, conversions: 0 };
      }
      campaigns[campaign].clicks++;
    });
    
    conversions.forEach(conv => {
      // Find the associated click
      const click = clicks.find(c => c.id === conv.click_id);
      const campaign = click?.utm_campaign || 'Direct';
      if (campaigns[campaign]) {
        campaigns[campaign].conversions++;
      }
    });
    
    return Object.entries(campaigns)
      .map(([name, data]) => ({
        name,
        clicks: data.clicks,
        conversions: data.conversions,
        conversionRate: data.clicks > 0 ? (data.conversions / data.clicks) * 100 : 0
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 10);
  }, [clicks, conversions]);

  // Pie chart data for CS distribution
  const csDistributionData = useMemo(() => {
    return csPerformance.map(cs => ({
      name: cs.csName,
      value: cs.totalClicks,
      conversions: cs.totalConversions
    }));
  }, [csPerformance]);

  // Summary stats
  const totalClicks = clicks.length;
  const totalConversions = conversions.length;
  const overallConversionRate = totalClicks > 0 ? (totalConversions / totalClicks) * 100 : 0;
  const avgClicksPerDay = totalClicks / dateRangeMap[dateRange];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Analisis performa CS dan tracking konversi
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 Hari</SelectItem>
              <SelectItem value="14d">14 Hari</SelectItem>
              <SelectItem value="30d">30 Hari</SelectItem>
              <SelectItem value="90d">90 Hari</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <MousePointer className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Klik</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConversions}</p>
                <p className="text-sm text-muted-foreground">Total Konversi</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Percent className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallConversionRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <ArrowUpRight className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{avgClicksPerDay.toFixed(1)}</p>
                <p className="text-sm text-muted-foreground">Rata-rata/Hari</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="trend" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trend">Trend Harian</TabsTrigger>
          <TabsTrigger value="cs-performance">Performa CS</TabsTrigger>
          <TabsTrigger value="campaigns">Kampanye</TabsTrigger>
        </TabsList>

        {/* Daily Trend Tab */}
        <TabsContent value="trend" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trend Klik & Konversi</CardTitle>
              <CardDescription>
                Grafik klik dan konversi per hari dalam {dateRangeMap[dateRange]} hari terakhir
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="dateLabel" 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      name="Klik"
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversions" 
                      name="Konversi"
                      stroke="hsl(142, 76%, 36%)" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(142, 76%, 36%)' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CS Performance Tab */}
        <TabsContent value="cs-performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribusi Klik per CS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={csDistributionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {csDistributionData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Performa per CS</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={csPerformance} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" fontSize={12} />
                      <YAxis dataKey="csName" type="category" fontSize={12} width={80} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalClicks" name="Klik" fill="hsl(var(--primary))" />
                      <Bar dataKey="totalConversions" name="Konversi" fill="hsl(142, 76%, 36%)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* CS Performance Table */}
          <Card>
            <CardHeader>
              <CardTitle>Detail Performa CS</CardTitle>
              <CardDescription>Statistik lengkap setiap customer service</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CS</TableHead>
                    <TableHead className="text-right">Weight</TableHead>
                    <TableHead className="text-right">Klik</TableHead>
                    <TableHead className="text-right">Konversi</TableHead>
                    <TableHead className="text-right">Conv. Rate</TableHead>
                    <TableHead className="text-right">Trend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {csPerformance.map((cs) => (
                    <TableRow key={cs.csId}>
                      <TableCell className="font-medium">{cs.csName}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline">×{cs.weight}</Badge>
                      </TableCell>
                      <TableCell className="text-right">{cs.totalClicks}</TableCell>
                      <TableCell className="text-right">{cs.totalConversions}</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={cs.conversionRate >= 5 ? "default" : "secondary"}>
                          {cs.conversionRate.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {cs.trend === 'up' && (
                            <>
                              <TrendingUp className="w-4 h-4 text-green-500" />
                              <span className="text-green-500 text-sm">+{cs.trendValue.toFixed(0)}%</span>
                            </>
                          )}
                          {cs.trend === 'down' && (
                            <>
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-red-500 text-sm">{cs.trendValue.toFixed(0)}%</span>
                            </>
                          )}
                          {cs.trend === 'stable' && (
                            <span className="text-muted-foreground text-sm">Stabil</span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performa Kampanye</CardTitle>
              <CardDescription>Statistik berdasarkan UTM campaign</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignData.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Belum ada data kampanye
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={campaignData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={80} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="clicks" name="Klik" fill="hsl(var(--primary))" />
                        <Bar dataKey="conversions" name="Konversi" fill="hsl(142, 76%, 36%)" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Kampanye</TableHead>
                        <TableHead className="text-right">Klik</TableHead>
                        <TableHead className="text-right">Konversi</TableHead>
                        <TableHead className="text-right">Conv. Rate</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {campaignData.map((campaign) => (
                        <TableRow key={campaign.name}>
                          <TableCell className="font-medium">{campaign.name}</TableCell>
                          <TableCell className="text-right">{campaign.clicks}</TableCell>
                          <TableCell className="text-right">{campaign.conversions}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={campaign.conversionRate >= 5 ? "default" : "secondary"}>
                              {campaign.conversionRate.toFixed(1)}%
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CSAnalyticsDashboard;
