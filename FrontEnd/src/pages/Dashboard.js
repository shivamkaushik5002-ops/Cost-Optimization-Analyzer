import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import api from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { TrendingUp, DollarSign, Database, FileText, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState(null);
  const [topServices, setTopServices] = useState([]);
  const [topAccounts, setTopAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, [startDate, endDate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const params = {
        _t: Date.now() // Cache busting
      };
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const [summaryRes, trendsRes, servicesRes, accountsRes] = await Promise.all([
        api.get('/api/summary', { params }),
        api.get('/api/breakdown/trends', {
          params: {
            ...params,
            period: 'daily'
          }
        }),
        api.get('/api/summary/top-services', {
          params: {
            ...params,
            limit: 5
          }
        }),
        api.get('/api/summary/top-accounts', {
          params: {
            ...params,
            limit: 5
          }
        })
      ]);

      setSummary(summaryRes.data);
      setTrends(trendsRes.data || []);
      setTopServices(servicesRes.data || []);
      setTopAccounts(accountsRes.data || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      // Set empty defaults on error
      setSummary(null);
      setTrends([]);
      setTopServices([]);
      setTopAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  const trendsData = {
    labels: trends?.map(t => new Date(t.date).toLocaleDateString()) || [],
    datasets: [
      {
        label: 'Daily Cost',
        data: trends?.map(t => t.totalCost) || [],
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  const servicesData = {
    labels: topServices.map(s => s.service),
    datasets: [
      {
        label: 'Cost',
        data: topServices.map(s => s.totalCost),
        backgroundColor: [
          'hsl(var(--primary))',
          'hsl(var(--primary) / 0.8)',
          'hsl(var(--primary) / 0.6)',
          'hsl(var(--primary) / 0.4)',
          'hsl(var(--primary) / 0.2)'
        ]
      }
    ]
  };

  const accountsData = {
    labels: topAccounts.map(a => a.accountId),
    datasets: [
      {
        label: 'Cost',
        data: topAccounts.map(a => a.totalCost),
        backgroundColor: 'hsl(var(--primary))'
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your AWS costs and usage</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Start Date"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            isClearable
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="End Date"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
            isClearable
          />
          <Button
            variant="outline"
            onClick={() => {
              setStartDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
              setEndDate(new Date());
            }}
          >
            Last 30 Days
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowResetDialog(true)}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          
          <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Filters</DialogTitle>
                <DialogDescription>
                  Are you sure you want to reset all date filters? This will show all available data.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setStartDate(null);
                    setEndDate(null);
                    setShowResetDialog(false);
                  }}
                >
                  Reset Filters
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {summary && summary.totals ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${(summary.totals.totalCost || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Across all services</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.totals.totalUsage || 0).toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">Usage quantity</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Line Items</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{(summary.totals.lineItemCount || 0).toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total records</p>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No data available. Please upload billing data first.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost Trends</CardTitle>
            <CardDescription>Daily cost over time</CardDescription>
          </CardHeader>
          <CardContent>
            {trends && trends.length > 0 ? (
              <Line data={trendsData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Services</CardTitle>
            <CardDescription>By cost</CardDescription>
          </CardHeader>
          <CardContent>
            {topServices.length > 0 ? (
              <Doughnut data={servicesData} options={{ responsive: true, maintainAspectRatio: false }} />
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No service data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {topAccounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top Accounts</CardTitle>
            <CardDescription>By cost</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={accountsData} options={{ responsive: true, maintainAspectRatio: false }} />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
