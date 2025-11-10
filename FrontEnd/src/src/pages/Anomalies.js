import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { AlertTriangle, CheckCircle2, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Anomalies = () => {
  const [anomalies, setAnomalies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    severity: '',
    acknowledged: ''
  });
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    fetchAnomalies();
  }, [filters]);

  const fetchAnomalies = async () => {
    try {
      setLoading(true);
      const params = { limit: 50 };
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();
      if (filters.severity) params.severity = filters.severity;
      if (filters.acknowledged) params.acknowledged = filters.acknowledged;

      const response = await api.get('/api/anomaly', { params });
      console.log('Anomalies response:', response.data);
      setAnomalies(response.data.data || []);
    } catch (error) {
      console.error('Error fetching anomalies:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      setAnomalies([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (id) => {
    try {
      await api.patch(`/api/anomaly/${id}/acknowledge`);
      toast.success('Anomaly acknowledged');
      fetchAnomalies();
    } catch (error) {
      toast.error('Failed to acknowledge anomaly');
    }
  };

  const triggerDetection = async () => {
    try {
      await api.post('/api/anomaly/detect', {
        lookbackDays: 30
      });
      toast.success('Anomaly detection started');
      setTimeout(fetchAnomalies, 2000);
    } catch (error) {
      toast.error('Failed to trigger detection');
    }
  };

  const getSeverityVariant = (severity) => {
    const variants = {
      critical: 'destructive',
      high: 'warning',
      medium: 'info',
      low: 'success'
    };
    return variants[severity] || 'default';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Anomalies</h1>
          <p className="text-muted-foreground">Detected cost anomalies and spikes</p>
        </div>
        <Button onClick={triggerDetection} className="gap-2">
          <AlertTriangle className="h-4 w-4" />
          Detect Anomalies
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => setFilters({ ...filters, startDate: date })}
                dateFormat="yyyy-MM-dd"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                isClearable
                placeholderText="All dates"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <DatePicker
                selected={filters.endDate}
                onChange={(date) => setFilters({ ...filters, endDate: date })}
                dateFormat="yyyy-MM-dd"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                isClearable
                placeholderText="All dates"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Severity</label>
              <Select
                value={filters.severity || "all"}
                onValueChange={(value) => setFilters({ ...filters, severity: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All severities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Acknowledged</label>
              <Select
                value={filters.acknowledged || "all"}
                onValueChange={(value) => setFilters({ ...filters, acknowledged: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="true">Yes</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFilters({
                  ...filters,
                  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                  endDate: new Date()
                });
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
              Reset All Filters
            </Button>
            
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Reset All Filters</DialogTitle>
                  <DialogDescription>
                    Are you sure you want to reset all filters? This will clear all date, severity, and acknowledged filters and show all available anomalies.
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
                      setFilters({
                        startDate: null,
                        endDate: null,
                        severity: '',
                        acknowledged: ''
                      });
                      setShowResetDialog(false);
                    }}
                  >
                    Reset All Filters
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anomalies</CardTitle>
          <CardDescription>
            {anomalies.length} anomaly{anomalies.length !== 1 ? 'ies' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : anomalies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mb-4 opacity-50" />
              <p>No anomalies found. Click "Detect Anomalies" to run detection.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Account</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead className="text-right">Cost</TableHead>
                  <TableHead className="text-right">Variance</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {anomalies.map((anomaly) => (
                  <TableRow key={anomaly._id}>
                    <TableCell>{new Date(anomaly.date).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{anomaly.type}</TableCell>
                    <TableCell>
                      <Badge variant={getSeverityVariant(anomaly.severity)}>
                        {anomaly.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>{anomaly.accountId || 'N/A'}</TableCell>
                    <TableCell>{anomaly.service || 'N/A'}</TableCell>
                    <TableCell className="text-right font-medium">
                      ${anomaly.cost?.toFixed(2) || 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      {anomaly.variancePercent
                        ? `${anomaly.variancePercent > 0 ? '+' : ''}${anomaly.variancePercent.toFixed(1)}%`
                        : 'N/A'}
                    </TableCell>
                    <TableCell className="max-w-md truncate">{anomaly.description}</TableCell>
                    <TableCell>
                      {!anomaly.acknowledged ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAcknowledge(anomaly._id)}
                          className="gap-2"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Acknowledge
                        </Button>
                      ) : (
                        <Badge variant="success">Acknowledged</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Anomalies;
