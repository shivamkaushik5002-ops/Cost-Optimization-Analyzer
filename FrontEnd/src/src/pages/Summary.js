import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import api from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { DollarSign, TrendingUp, FileText, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Summary = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchSummary = async () => {
    try {
      setLoading(true);
      const params = {
        _t: Date.now() // Cache busting
      };
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const response = await api.get('/api/summary', { params });
      console.log('Summary response:', response.data);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      setSummary(null);
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

  if (!summary || !summary.byService || summary.byService.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Summary</h1>
          <p className="text-muted-foreground">Overview of your AWS costs</p>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">No data available. Please upload billing data first.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const servicesData = {
    labels: summary.byService.slice(0, 10).map(s => s.service),
    datasets: [
      {
        label: 'Cost',
        data: summary.byService.slice(0, 10).map(s => s.totalCost),
        backgroundColor: 'hsl(var(--primary))'
      }
    ]
  };

  const accountsData = {
    labels: summary.byAccount.slice(0, 10).map(a => a.accountId),
    datasets: [
      {
        label: 'Cost',
        data: summary.byAccount.slice(0, 10).map(a => a.totalCost),
        backgroundColor: 'hsl(var(--primary))'
      }
    ]
  };

  const timeSeriesData = {
    labels: summary.timeSeries.map(t => new Date(t.date).toLocaleDateString()),
    datasets: [
      {
        label: 'Daily Cost',
        data: summary.timeSeries.map(t => t.cost),
        borderColor: 'hsl(var(--primary))',
        backgroundColor: 'hsl(var(--primary) / 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Summary</h1>
          <p className="text-muted-foreground">Overview of your AWS costs</p>
        </div>
        <div className="flex items-center gap-2">
          <DatePicker
            selected={startDate}
            onChange={(date) => setStartDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="Start Date"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            isClearable
          />
          <DatePicker
            selected={endDate}
            onChange={(date) => setEndDate(date)}
            dateFormat="yyyy-MM-dd"
            placeholderText="End Date"
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
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

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totals.totalCost.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Across all services</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totals.totalUsage.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">Usage quantity</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Line Items</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totals.lineItemCount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total records</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cost by Service</CardTitle>
            <CardDescription>Top 10 services by cost</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={servicesData} options={{ responsive: true, maintainAspectRatio: false }} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost by Account</CardTitle>
            <CardDescription>Top 10 accounts by cost</CardDescription>
          </CardHeader>
          <CardContent>
            <Bar data={accountsData} options={{ responsive: true, maintainAspectRatio: false }} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cost Trends</CardTitle>
          <CardDescription>Daily cost over time</CardDescription>
        </CardHeader>
        <CardContent>
          <Line data={timeSeriesData} options={{ responsive: true, maintainAspectRatio: false }} />
        </CardContent>
      </Card>
    </div>
  );
};

export default Summary;
