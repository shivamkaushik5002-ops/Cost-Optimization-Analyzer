import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { toast } from 'react-toastify';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Skeleton } from '../components/ui/skeleton';
import { Upload as UploadIcon, FileText, Eye, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

const Upload = () => {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/api/upload/history');
      setJobs(response.data.jobs || []);
    } catch (error) {
      toast.error('Failed to fetch upload history');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const response = await api.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      toast.success('File uploaded successfully. Processing in background...');
      setFile(null);
      document.getElementById('file-input').value = '';
      fetchJobs();
      
      // Poll for job completion
      if (response.data.job?.id) {
        pollJobStatus(response.data.job.id);
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const pollJobStatus = async (jobId) => {
    const maxAttempts = 60; // Poll for up to 5 minutes (60 * 5 seconds)
    let attempts = 0;
    
    const poll = async () => {
      try {
        const response = await api.get(`/api/upload/job/${jobId}`);
        const job = response.data;
        
        if (job.status === 'completed') {
          toast.success(`File processing completed! ${job.rowsProcessed || 0} rows processed. Data will be available shortly.`);
          fetchJobs();
          // Trigger a page refresh or navigation to dashboard to see new data
          // The user can manually refresh or navigate to see the data
          return;
        } else if (job.status === 'failed') {
          toast.error('File processing failed. Please check the job details.');
          fetchJobs();
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          // Poll every 5 seconds
          setTimeout(poll, 5000);
        } else {
          toast.info('File is still processing. Check the upload history for status.');
        }
      } catch (error) {
        console.error('Error polling job status:', error);
        // Stop polling on error
      }
    };
    
    // Start polling after 5 seconds
    setTimeout(poll, 5000);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Upload Billing CSV</h1>
        <p className="text-muted-foreground">Upload AWS billing CSV files for analysis</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadIcon className="h-5 w-5" />
            Upload File
          </CardTitle>
          <CardDescription>Select a CSV file to upload and process</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select CSV File</label>
              <input
                id="file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent file:text-sm file:font-medium"
              />
            </div>
            <Button type="submit" disabled={!file || uploading} className="gap-2">
              <UploadIcon className="h-4 w-4" />
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>
            {jobs.length} upload{jobs.length !== 1 ? 's' : ''} found
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
              <p>No upload history. Upload your first CSV file to get started.</p>
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

export default Upload;
