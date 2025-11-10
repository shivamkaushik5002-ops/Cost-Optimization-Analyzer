import React, { useState, useEffect } from 'react';
import api from '../services/api';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Download, Filter, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Breakdown = () => {
  const [lineItems, setLineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: null,
    endDate: null,
    accountId: '',
    service: '',
    region: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);
  const [showResetDialog, setShowResetDialog] = useState(false);

  useEffect(() => {
    fetchLineItems();
  }, [filters]);

  const fetchLineItems = async () => {
    try {
      setLoading(true);
      const params = {
        page: filters.page,
        limit: filters.limit
      };
      if (filters.startDate) params.startDate = filters.startDate.toISOString();
      if (filters.endDate) params.endDate = filters.endDate.toISOString();
      if (filters.accountId) params.accountId = filters.accountId;
      if (filters.service) params.service = filters.service;
      if (filters.region) params.region = filters.region;

      const response = await api.get('/api/breakdown/line-items', { params });
      console.log('Breakdown response:', response.data);
      setLineItems(response.data.data || []);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching line items:', error);
      if (error.response) {
        console.error('Response error:', error.response.data);
      }
      setLineItems([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters({ ...filters, [key]: value, page: 1 });
  };

  const exportCSV = () => {
    const headers = ['Date', 'Account', 'Service', 'Region', 'Cost', 'Usage'];
    const rows = lineItems.map(item => [
      new Date(item.usageStartDate).toLocaleDateString(),
      item.accountId,
      item.service,
      item.region,
      item.cost.toFixed(2),
      item.usageQuantityNormalized || 0
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cost-breakdown-${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Cost Breakdown</h1>
          <p className="text-muted-foreground">Detailed line item analysis</p>
        </div>
        <Button onClick={exportCSV} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <DatePicker
                selected={filters.startDate}
                onChange={(date) => handleFilterChange('startDate', date)}
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
                onChange={(date) => handleFilterChange('endDate', date)}
                dateFormat="yyyy-MM-dd"
                className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                isClearable
                placeholderText="All dates"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Account ID</label>
              <Input
                value={filters.accountId}
                onChange={(e) => handleFilterChange('accountId', e.target.value)}
                placeholder="Filter by account"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Service</label>
              <Input
                value={filters.service}
                onChange={(e) => handleFilterChange('service', e.target.value)}
                placeholder="Filter by service"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Region</label>
              <Input
                value={filters.region}
                onChange={(e) => handleFilterChange('region', e.target.value)}
                placeholder="Filter by region"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                handleFilterChange('startDate', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
                handleFilterChange('endDate', new Date());
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
                    Are you sure you want to reset all filters? This will clear all date, account, service, and region filters and show all available data.
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
                        accountId: '',
                        service: '',
                        region: '',
                        page: 1,
                        limit: 20
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
          <CardTitle>Line Items</CardTitle>
          <CardDescription>
            {pagination ? `Showing ${(pagination.page - 1) * pagination.limit + 1} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} items` : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : lineItems.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              No line items found. Please upload billing data first.
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Invoice ID</TableHead>
                      <TableHead>Account</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Product Code</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Usage Type</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead>Availability Zone</TableHead>
                      <TableHead className="text-right">Usage Qty</TableHead>
                      <TableHead className="text-right">Blended Rate</TableHead>
                      <TableHead className="text-right">Blended Cost</TableHead>
                      <TableHead className="text-right">Unblended Rate</TableHead>
                      <TableHead className="text-right">Unblended Cost</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                      <TableHead>Resource ID</TableHead>
                      <TableHead>Item Description</TableHead>
                      <TableHead>Tags</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => (
                      <TableRow key={item._id}>
                        <TableCell className="whitespace-nowrap">
                          {item.usageStartDate ? new Date(item.usageStartDate).toLocaleDateString() : 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.invoiceId || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{item.accountId || 'N/A'}</TableCell>
                        <TableCell>{item.productName || item.service || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.productCode || 'N/A'}</TableCell>
                        <TableCell>{item.service || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.usageType || item.usageTypeNormalized || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.operation || 'N/A'}</TableCell>
                        <TableCell>{item.region || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{item.availabilityZone || 'N/A'}</TableCell>
                        <TableCell className="text-right">{item.usageQuantityNormalized || item.usageQuantity || 0}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${(item.blendedRate || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${(item.blendedCost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${(item.unblendedRate || 0).toFixed(4)}</TableCell>
                        <TableCell className="text-right text-muted-foreground">${(item.unblendedCost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-right font-medium">${(item.cost || 0).toFixed(2)}</TableCell>
                        <TableCell className="text-muted-foreground text-xs font-mono">{item.resourceId || 'N/A'}</TableCell>
                        <TableCell className="text-muted-foreground text-xs max-w-xs truncate" title={item.itemDescription}>
                          {item.itemDescription || 'N/A'}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-xs">
                          {item.tags && Object.keys(item.tags).length > 0 ? (
                            <div className="flex flex-col gap-1">
                              {Object.entries(item.tags).map(([key, value]) => (
                                <span key={key} className="inline-block">
                                  <span className="font-semibold">{key}:</span> {value}
                                </span>
                              ))}
                            </div>
                          ) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {pagination && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Page {pagination.page} of {pagination.totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.page - 1)}
                      disabled={!pagination.hasPrev}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleFilterChange('page', pagination.page + 1)}
                      disabled={!pagination.hasNext}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Breakdown;
