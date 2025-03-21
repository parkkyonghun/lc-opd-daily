/**
 * Client-side API functions for interacting with reports
 */

export interface Report {
  id: string;
  date: string;
  branchId: string;
  writeOffs: number;
  ninetyPlus: number;
  status: string;
  reportType: string;
  title?: string;
  content?: string;
  submittedBy: string;
  submittedAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
  };
}

/**
 * Fetch all pending reports 
 * @param type Optional filter for report type ('plan' or 'actual')
 */
export async function fetchPendingReports(type?: string): Promise<Report[]> {
  try {
    const url = type ? `/api/reports/pending?type=${type}` : '/api/reports/pending';
    const response = await fetch(url);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to fetch pending reports');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching pending reports:', error);
    throw error;
  }
}

/**
 * Approve or reject a report
 * @param reportId ID of the report to approve/reject
 * @param status New status ('approved' or 'rejected')
 * @param comments Optional comments (required for rejections)
 * @param notifyUsers Whether to send notifications to users
 */
export async function approveReport(
  reportId: string, 
  status: 'approved' | 'rejected',
  comments?: string,
  notifyUsers: boolean = true
): Promise<{ message: string; report: Report }> {
  try {
    const response = await fetch(`/api/reports/${reportId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        status,
        comments,
        notifyUsers,
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to ${status} report`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error ${status === 'approved' ? 'approving' : 'rejecting'} report:`, error);
    throw error;
  }
}

/**
 * Fetch a report by ID
 * @param id Report ID
 */
export async function fetchReportById(id: string): Promise<Report> {
  try {
    const response = await fetch(`/api/reports/${id}`);
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to fetch report with ID ${id}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching report ${id}:`, error);
    throw error;
  }
}

/**
 * Create a new report
 * @param reportData Report data to create
 */
export async function createReport(reportData: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Report> {
  try {
    const response = await fetch('/api/reports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create report');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
}

/**
 * Update an existing report
 * @param id Report ID
 * @param reportData Updated report data
 */
export async function updateReport(id: string, reportData: Partial<Report>): Promise<Report> {
  try {
    const response = await fetch(`/api/reports/${id}`, {
      method: 'PATCH', 
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(reportData),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Failed to update report with ID ${id}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error updating report ${id}:`, error);
    throw error;
  }
} 