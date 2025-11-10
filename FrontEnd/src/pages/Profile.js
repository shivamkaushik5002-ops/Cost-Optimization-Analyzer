import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { User, Mail, Shield, AlertTriangle, RotateCcw, Trash2, Database, FileText, AlertCircle, Lightbulb, Briefcase, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../services/api';

const Profile = () => {
  const { user } = useAuth();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const handleResetData = async () => {
    try {
      setLoading(true);
      // Clear all local storage preferences
      const keysToKeep = ['token'];
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        if (!keysToKeep.includes(key)) {
          localStorage.removeItem(key);
        }
      });
      
      toast.success('All user preferences and cached data have been reset');
      setShowResetDialog(false);
    } catch (error) {
      toast.error('Failed to reset data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await api.get('/api/profile/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching profile stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleDeleteAllData = async () => {
    try {
      setLoading(true);
      await api.delete('/api/data/clear');
      toast.success('All your billing data has been deleted');
      setShowDeleteDialog(false);
      // Refresh stats after deletion
      await fetchStats();
    } catch (error) {
      if (error.response?.status === 404) {
        toast.info('Data deletion endpoint not available');
      } else {
        toast.error('Failed to delete data');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Profile</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Username</Label>
              <Input value={user?.username || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input value={user?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <div>
                <Badge variant={user?.role === 'admin' ? 'default' : 'secondary'}>
                  {user?.role || 'user'}
                </Badge>
              </div>
            </div>
            {user?.lastLogin && (
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-sm text-muted-foreground">Last Login</Label>
                <p className="text-sm">
                  {new Date(user.lastLogin).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Your Data Statistics
            </CardTitle>
            <CardDescription>Overview of your billing data</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      Line Items
                    </div>
                    <p className="text-2xl font-bold">{stats.counts.lineItems.toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      Total Cost
                    </div>
                    <p className="text-2xl font-bold">${stats.cost.totalCost.toFixed(2)}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Briefcase className="h-4 w-4" />
                      Jobs
                    </div>
                    <p className="text-2xl font-bold">{stats.counts.jobs}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <AlertCircle className="h-4 w-4" />
                      Anomalies
                    </div>
                    <p className="text-2xl font-bold">{stats.counts.anomalies}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Lightbulb className="h-4 w-4" />
                      Recommendations
                    </div>
                    <p className="text-2xl font-bold">{stats.counts.recommendations}</p>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Aggregates
                    </div>
                    <p className="text-2xl font-bold">{stats.counts.aggregates.toLocaleString()}</p>
                  </div>
                </div>
                {stats.dateRange && (
                  <div className="pt-4 border-t space-y-1">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      Date Range
                    </div>
                    <p className="text-sm">
                      {new Date(stats.dateRange.minDate).toLocaleDateString()} - {new Date(stats.dateRange.maxDate).toLocaleDateString()}
                    </p>
                  </div>
                )}
                {stats.topServices && stats.topServices.length > 0 && (
                  <div className="pt-4 border-t space-y-2">
                    <div className="text-sm font-medium">Top Services</div>
                    <div className="space-y-1">
                      {stats.topServices.map((service, idx) => (
                        <div key={idx} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{service.service}</span>
                          <span className="font-medium">${service.totalCost.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available. Upload billing data to see statistics.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Danger Zone
            </CardTitle>
            <CardDescription>Irreversible and destructive actions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Reset Preferences</Label>
              <p className="text-sm text-muted-foreground">
                Clear all your saved preferences, filters, and cached data. This will not delete your billing data.
              </p>
              <Button
                variant="outline"
                onClick={() => setShowResetDialog(true)}
                className="gap-2 w-full"
              >
                <RotateCcw className="h-4 w-4" />
                Reset Preferences
              </Button>
            </div>
            
            <div className="space-y-2 pt-4 border-t">
              <Label className="text-destructive">Delete All Data</Label>
              <p className="text-sm text-muted-foreground">
                Permanently delete all your billing data, aggregates, anomalies, and recommendations. This action cannot be undone.
              </p>
              <Button
                variant="destructive"
                onClick={() => setShowDeleteDialog(true)}
                className="gap-2 w-full"
              >
                <Trash2 className="h-4 w-4" />
                Delete All Data
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reset Preferences Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Reset Preferences
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reset all your preferences? This will clear:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Saved filter preferences</li>
                <li>Cached data</li>
                <li>User preferences</li>
              </ul>
              <strong className="block mt-2">This will NOT delete your billing data.</strong>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowResetDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleResetData}
              disabled={loading}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {loading ? 'Resetting...' : 'Reset Preferences'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Data Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete All Data
            </DialogTitle>
            <DialogDescription>
              <strong className="text-destructive">Warning: This action cannot be undone!</strong>
              <p className="mt-2">
                This will permanently delete:
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All billing line items</li>
                <li>All aggregates and summaries</li>
                <li>All detected anomalies</li>
                <li>All recommendations</li>
                <li>All ingestion jobs</li>
              </ul>
              <p className="mt-4 font-semibold">
                Are you absolutely sure you want to proceed?
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteDialog(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAllData}
              disabled={loading}
              className="gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {loading ? 'Deleting...' : 'Yes, Delete All Data'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Profile;

