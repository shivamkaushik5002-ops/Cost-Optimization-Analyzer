import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Lightbulb, CheckCircle2, XCircle, Clock, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Recommendations = () => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    type: '',
    priority: '',
    status: ''
  });
  const [showResetDialog, setShowResetDialog] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    try {
      setLoading(true);
      const params = { limit: 100 };
      if (filters.type) params.type = filters.type;
      if (filters.priority) params.priority = filters.priority;
      if (filters.status) params.status = filters.status;

      const response = await api.get('/api/recommendation', { params });
      console.log('Recommendations response:', response.data);
      // Handle both paginated and non-paginated responses
      const recommendationsData = response.data.data || response.data || [];
      setRecommendations(Array.isArray(recommendationsData) ? recommendationsData : []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        toast.error(error.response.data?.error?.message || 'Failed to fetch recommendations');
      } else {
        toast.error('Failed to fetch recommendations');
      }
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/api/recommendation/${id}/status`, { status });
      toast.success('Recommendation status updated');
      fetchRecommendations();
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const generateRecommendations = async () => {
    try {
      setLoading(true);
      const response = await api.post('/api/recommendation/generate', {
        lookbackDays: 30
      });
      toast.success(`Recommendations generated successfully! Found ${response.data.count || 0} recommendations.`);
      // Refresh recommendations after a short delay
      setTimeout(() => {
        fetchRecommendations();
      }, 1000);
    } catch (error) {
      console.error('Error generating recommendations:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
        toast.error(error.response.data?.error?.message || error.response.data?.error || 'Failed to generate recommendations');
      } else {
        toast.error('Failed to generate recommendations. Please check if you have billing data uploaded.');
      }
      setLoading(false);
    }
  };

  const getPriorityVariant = (priority) => {
    const variants = {
      critical: 'destructive',
      high: 'warning',
      medium: 'info',
      low: 'success'
    };
    return variants[priority] || 'default';
  };

  const getTypeLabel = (type) => {
    return type.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'implemented':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'dismissed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Recommendations</h1>
          <p className="text-muted-foreground">Cost optimization opportunities</p>
        </div>
        <Button onClick={generateRecommendations} className="gap-2">
          <Lightbulb className="h-4 w-4" />
          Generate Recommendations
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <Select
                value={filters.type || "all"}
                onValueChange={(value) => setFilters({ ...filters, type: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="rightsizing">Rightsizing</SelectItem>
                  <SelectItem value="reserved_instance">Reserved Instance</SelectItem>
                  <SelectItem value="savings_plan">Savings Plan</SelectItem>
                  <SelectItem value="storage_tiering">Storage Tiering</SelectItem>
                  <SelectItem value="idle_resource_cleanup">Idle Resource Cleanup</SelectItem>
                  <SelectItem value="unattached_ebs">Unattached EBS</SelectItem>
                  <SelectItem value="unattached_eip">Unattached EIP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <Select
                value={filters.priority || "all"}
                onValueChange={(value) => setFilters({ ...filters, priority: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All priorities" />
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
              <label className="text-sm font-medium">Status</label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => setFilters({ ...filters, status: value === "all" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="implemented">Implemented</SelectItem>
                  <SelectItem value="dismissed">Dismissed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="mt-4">
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
                    Are you sure you want to reset all filters? This will clear all type, priority, and status filters and show all available recommendations.
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
                        type: '',
                        priority: '',
                        status: ''
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

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Lightbulb className="h-12 w-12 mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No recommendations found. Click "Generate Recommendations" to create recommendations.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {recommendations.map((rec) => (
            <Card key={rec._id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CardTitle>{rec.title}</CardTitle>
                      {getStatusIcon(rec.status)}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={getPriorityVariant(rec.priority)}>
                        {rec.priority}
                      </Badge>
                      <Badge variant="outline">{getTypeLabel(rec.type)}</Badge>
                      {rec.accountId && (
                        <span className="text-sm text-muted-foreground">Account: {rec.accountId}</span>
                      )}
                      {rec.service && (
                        <span className="text-sm text-muted-foreground">Service: {rec.service}</span>
                      )}
                    </div>
                  </div>
                    <div className="text-right">
                    <div className="text-2xl font-bold text-green-600">
                      ${(rec.estimatedSavings || 0).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">Estimated Savings</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">{rec.description}</p>
                {rec.actionItems && rec.actionItems.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-sm font-semibold mb-2">Action Items:</h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {rec.actionItems.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Current Cost: ${rec.currentCost ? rec.currentCost.toFixed(2) : 'N/A'}</span>
                    <span>Savings: {rec.estimatedSavingsPercent ? rec.estimatedSavingsPercent.toFixed(1) : 0}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <Select
                      value={rec.status}
                      onValueChange={(status) => handleStatusChange(rec._id, status)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="implemented">Implemented</SelectItem>
                        <SelectItem value="dismissed">Dismissed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Recommendations;
