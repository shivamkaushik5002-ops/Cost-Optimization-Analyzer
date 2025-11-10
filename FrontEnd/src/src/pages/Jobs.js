import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { FileText, Eye, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const Jobs = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (id) {
      fetchJobDetails(id);
    } else {
      fetchJobs();
    }
  }, [id, page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/job', {
        params: { page, limit: 20 }
      });
      setJobs(response.data.data || []);
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetails = async (jobId) => {
    try {
      setLoading(true);
      const response = await api.get(`/api/job/${jobId}`);
      setJobDetails(response.data);
    } catch (error) {
      console.error('Error fetching job details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { variant: 'warning', icon: Clock },
      processing: { variant: 'info', icon: Clock },
      completed: { variant: 'success', icon: CheckCircle2 },
      failed: { variant: 'destructive', icon: XCircle },
      partial: { variant: 'warning', icon: AlertCircle }
    };
    return badges[status] || { variant: 'default', icon: FileText };
  };

  if (id && jobDetails) {
    const statusBadge = getStatusBadge(jobDetails.status);
    const StatusIcon = statusBadge.icon;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Job Details</h1>
            <p className="text-muted-foreground">Ingestion job information</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/jobs')}>
            Back to Jobs
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {jobDetails.fileName}
            </CardTitle>
            <CardDescription>
              Job ID: {jobDetails._id}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Status</label>
                <div>
                  <Badge variant={statusBadge.variant} className="gap-2">
                    <StatusIcon className="h-3 w-3" />
                    {jobDetails.status}
                  </Badge>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Rows Processed</label>
                <div className="text-sm font-medium">
                  {jobDetails.rowsProcessed || 0} / {jobDetails.rowsTotal || 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Rows Skipped</label>
                <div className="text-sm font-medium">{jobDetails.rowsSkipped || 0}</div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Duration</label>
                <div className="text-sm font-medium">
                  {jobDetails.duration
                    ? `${(jobDetails.duration / 1000).toFixed(2)}s`
                    : 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Started At</label>
                <div className="text-sm">
                  {jobDetails.startedAt
                    ? new Date(jobDetails.startedAt).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-muted-foreground">Completed At</label>
                <div className="text-sm">
                  {jobDetails.completedAt
                    ? new Date(jobDetails.completedAt).toLocaleString()
                    : 'N/A'}
                </div>
              </div>
            </div>

            {jobDetails.errors && jobDetails.errors.length > 0 && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4">
                  Errors ({jobDetails.errors.length})
                </h3>
                <div className="max-h-96 overflow-y-auto space-y-2">
                  {jobDetails.errors.slice(0, 50).map((error, idx) => (
                    <div key={idx} className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                      <div className="text-sm font-medium text-destructive">
                        Row {error.row}: {error.message}
                      </div>
                      {error.timestamp && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(error.timestamp).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Ingestion Jobs</h1>
        <p className="text-muted-foreground">History of billing data uploads</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Jobs</CardTitle>
          <CardDescription>
            {jobs.length} job{jobs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <FileText className="h-12 w-12 mb-4 opacity-50" />
              <p>No jobs found. Upload a billing CSV file to get started.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rows Processed</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Created At</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map((job) => {
                  const statusBadge = getStatusBadge(job.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <TableRow key={job._id}>
                      <TableCell className="font-medium">{job.fileName}</TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant} className="gap-1">
                          <StatusIcon className="h-3 w-3" />
                          {job.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {job.rowsProcessed || 0} / {job.rowsTotal || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {job.duration
                          ? `${(job.duration / 1000).toFixed(2)}s`
                          : 'N/A'}
                      </TableCell>
                      <TableCell>{new Date(job.createdAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/jobs/${job._id}`)}
                          className="gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Jobs;
