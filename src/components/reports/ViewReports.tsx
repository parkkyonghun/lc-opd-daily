"use client";
import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PencilIcon,
} from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatKHRCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { CreateReportModal } from "./CreateReportModal";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { KHCurrencyInput } from "@/components/ui/currency-input";
import { useReports } from "@/hooks/useReports";
import type {
  Report,
  Branch,
  ReportType,
  CreateReportData,
} from "@/types/reports";
import { toast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { UserDisplayName } from "@/components/user/UserDisplayName";

export function ViewReports() {
  const { data: session } = useSession();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingReport, setEditingReport] = useState<Report | null>(null);
  const [editWriteOffs, setEditWriteOffs] = useState("");
  const [editNinetyPlus, setEditNinetyPlus] = useState("");
  const [editComments, setEditComments] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createReportType, setCreateReportType] = useState<"plan" | "actual">(
    "plan"
  );

  // Use the useReports hook for all data management
  const {
    date,
    setDate,
    reportType,
    setReportType,
    selectedBranchId,
    setSelectedBranchId,
    reports,
    isLoading,
    pagination,
    userBranches,
    handlePageChange,
    handleFilter,
    updateReport,
  } = useReports({
    initialDate: new Date(),
  });

  // If user has no branches assigned, show error message
  if (!userBranches || userBranches.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Access Denied</CardTitle>
          <CardDescription>
            <p>
              You are not assigned to any branches. Please contact your
              administrator to get access.
            </p>
            <p>
              If you are an administrator, please go to the{" "}
              <Link href="/admin/branches">branches {userBranches.length}</Link> page to assign
              branches to users.
            </p>
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const handleEditClick = (report: Report) => {
    // Only check date for rejected reports that need resubmission
    if (report.status === "rejected") {
      // Check if the report is from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const reportDate = new Date(report.date);
      reportDate.setHours(0, 0, 0, 0);

      if (reportDate.getTime() !== today.getTime()) {
        toast({
          title: "Cannot Edit Report",
          description: "You can only edit rejected reports from today's session.",
          variant: "destructive",
        });
        return;
      }
    }

    // Only allow editing if user has access to the branch
    if (
      session?.user?.role !== "ADMIN" &&
      session?.user?.branchId !== report.branch.id
    ) {
      toast({
        title: "Access Denied",
        description: "You can only edit reports for your assigned branch.",
        variant: "destructive",
      });
      return;
    }

    // If report is rejected, show rejection comments
    if (report.status === "rejected") {
      toast({
        title: "Report Rejected",
        description: report.comments || "This report was rejected. Please make the necessary corrections and resubmit.",
        variant: "destructive",
      });
    }

    setEditingReport(report);
    setEditWriteOffs(report.writeOffs.toString());
    setEditNinetyPlus(report.ninetyPlus.toString());
    setEditComments(report.comments || "");
    setIsEditModalOpen(true);
  };

  const handleUpdateReport = async () => {
    if (!editingReport) return;

    // Parse and validate the numeric inputs
    const writeOffsNum = editWriteOffs ? parseFloat(editWriteOffs) : 0;
    const ninetyPlusNum = editNinetyPlus ? parseFloat(editNinetyPlus) : 0;

    if (isNaN(writeOffsNum) || writeOffsNum < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid Write-offs amount",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(ninetyPlusNum) || ninetyPlusNum < 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid 90+ Days amount",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/reports`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingReport.id,
          writeOffs: writeOffsNum,
          ninetyPlus: ninetyPlusNum,
          content: editComments,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update report");
      }

      const result = await response.json();

      toast({
        title: "Success",
        description: editingReport.status === "rejected" 
          ? "Report resubmitted successfully. Waiting for approval."
          : "Report updated successfully",
      });

      setIsEditModalOpen(false);
      setEditingReport(null);
      // Refresh the reports list
      handleFilter();
    } catch (error) {
      console.error("Error updating report:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update report",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateClick = async (type: "plan" | "actual") => {
    if (type === "actual" && date) {
      setIsSubmitting(true);
      try {
        const formattedDate = format(date, "yyyy-MM-dd");
        const response = await fetch(
          `/api/reports?date=${formattedDate}&branchId=${selectedBranchId}&reportType=plan`
        );
        
        if (!response.ok) {
          throw new Error("Failed to verify plan report");
        }
        
        const data = await response.json();
        const planExists = data.data && data.data.length > 0;
        
        if (!planExists) {
          toast({
            title: "Plan Report Required",
            description: "You need to create a Morning Plan report before creating an Evening Actual report for the same day and branch.",
            variant: "destructive",
          });
          
          // Automatically switch to Plan tab to help user create a Plan first
          setReportType("plan");
          
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        console.error("Error checking for plan report");
        toast({
          title: "Error",
          description: "Failed to verify plan report existence. Please try again.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }
      setIsSubmitting(false);
    }
    
    setCreateReportType(type);
    setIsCreateModalOpen(true);
  };

  const formatDate = (dateString: string) => {
    return dateString; // The date is already in YYYY-MM-DD format
  };

  const formatCurrency = formatKHRCurrency;

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-500";
      case "pending":
        return "bg-yellow-500";
      case "rejected":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Card className="border-0 shadow-md dark:bg-gray-800 dark:shadow-lg">
      <CardHeader className="pb-2">
        <CardTitle>View Reports</CardTitle>
        <CardDescription>
          Browse and filter{" "}
          {reportType === "plan" ? "morning plan" : "evening actual"} reports
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Responsive filter controls with enhanced visual design */}
        <div className="flex flex-col space-y-4 mb-6">
          {/* Report type and create controls in one row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Enhanced tabs with larger clickable area */}
            <div className="w-full">
              <Tabs
                className="w-full"
                value={reportType}
                onValueChange={(value: string) => {
                  if (value === "plan" || value === "actual") {
                    setReportType(value);
                    // No need to manually call handleFilter here as the useEffect in useReports 
                    // will handle fetching when reportType changes
                  }
                }}
              >
                <TabsList className="w-full grid grid-cols-2 p-1 h-12 dark:bg-gray-800">
                  <TabsTrigger
                    value="plan"
                    className={cn(
                      "flex items-center justify-center gap-1 py-3 data-[state=active]:text-white",
                      "data-[state=inactive]:dark:text-gray-300",
                      "data-[state=active]:bg-blue-600 data-[state=active]:shadow"
                    )}
                  >
                    <span className="text-sm font-medium">Morning Plan</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="actual"
                    className={cn(
                      "flex items-center justify-center gap-1 py-3 data-[state=active]:text-white",
                      "data-[state=inactive]:dark:text-gray-300",
                      "data-[state=active]:bg-green-600 data-[state=active]:shadow"
                    )}
                  >
                    <span className="text-sm font-medium">Evening Actual</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Single, prominent create button that adjusts to the selected report type */}
            <Button
              onClick={() => handleCreateClick(reportType)}
              className={cn(
                "w-full sm:w-auto flex items-center justify-center shadow transition-all duration-200 h-12 px-4 sm:px-6",
                reportType === "plan"
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              )}
              title={`Create a new ${reportType} report`}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <PlusIcon className="h-5 w-5 mr-2" />
              )}
              <span className="font-medium">
                {isSubmitting ? "Checking..." : `Create ${reportType === "plan" ? "Plan" : "Actual"}`}
              </span>
            </Button>
          </div>

          {/* Filters in one row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date selector with clearer label */}
            <div className="flex items-center w-full sm:w-auto">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 h-10",
                      !date && "text-muted-foreground dark:text-gray-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Select a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 dark:bg-gray-800 dark:border-gray-700">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    className="dark:bg-gray-800"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Branch selector for admin users or users with multiple branches */}
            {userBranches.length > 1 && (
              <div className="w-full sm:w-auto">
                <Select
                  value={selectedBranchId}
                  onValueChange={setSelectedBranchId}
                >
                  <SelectTrigger className="w-full sm:w-[200px] dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="dark:bg-gray-800 dark:border-gray-700">
                    {userBranches.map((branch) => (
                      <SelectItem key={branch.id} value={branch.id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        {/* Reports table */}
        <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
          <Table>
            <TableHeader className="bg-gray-50 dark:bg-gray-800">
              <TableRow className="hover:bg-gray-100 dark:hover:bg-gray-700 border-b dark:border-gray-700">
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Date</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Branch</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
                  {reportType === "actual" ? "Write-offs (Actual)" : "Write-offs"}
                </TableHead>
                {reportType === "actual" && (
                  <TableHead className="font-semibold text-blue-600 dark:text-blue-400">Write-offs (Plan)</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">
                  {reportType === "actual" ? "90+ Days (Actual)" : "90+ Days"}
                </TableHead>
                {reportType === "actual" && (
                  <TableHead className="font-semibold text-blue-600 dark:text-blue-400">90+ Days (Plan)</TableHead>
                )}
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Comments</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Submitted By</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-gray-200">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="bg-white dark:bg-gray-800">
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={reportType === "actual" ? 10 : 8} className="text-center py-8 dark:text-gray-300">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={reportType === "actual" ? 10 : 8} className="text-center py-8 dark:text-gray-300">
                    No reports found for the selected filters
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700">
                    <TableCell className="dark:text-gray-300">{formatDate(report.date)}</TableCell>
                    <TableCell className="dark:text-gray-300">{report.branch.name}</TableCell>
                    <TableCell className={cn("dark:text-gray-300", reportType === "actual" ? "font-medium" : "")}>
                      {formatCurrency(report.writeOffs)}
                    </TableCell>
                    {reportType === "actual" && (
                      <TableCell className="text-blue-600 dark:text-blue-400">
                        {report.writeOffsPlan !== null && report.writeOffsPlan !== undefined
                          ? formatCurrency(report.writeOffsPlan)
                          : "-"}
                      </TableCell>
                    )}
                    <TableCell className={cn("dark:text-gray-300", reportType === "actual" ? "font-medium" : "")}>
                      {formatCurrency(report.ninetyPlus)}
                    </TableCell>
                    {reportType === "actual" && (
                      <TableCell className="text-blue-600 dark:text-blue-400">
                        {report.ninetyPlusPlan !== null && report.ninetyPlusPlan !== undefined
                          ? formatCurrency(report.ninetyPlusPlan)
                          : "-"}
                      </TableCell>
                    )}
                    <TableCell className="max-w-[200px] truncate dark:text-gray-300">
                      {report.comments || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-white",
                          getStatusBadgeColor(report.status)
                        )}
                      >
                        {report.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="dark:text-gray-300">
                      <UserDisplayName userId={report.submittedBy} />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(report)}
                        disabled={
                          session?.user?.role !== "ADMIN" &&
                          session?.user?.branchId !== report.branch.id
                        }
                        className="hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <PencilIcon className="h-4 w-4 dark:text-gray-300" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground dark:text-gray-400">
              Showing {pagination.page} of {pagination.totalPages} pages
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Report</DialogTitle>
            <DialogDescription>
              Update the report details below
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="writeOffs">Write-offs</Label>
              <KHCurrencyInput
                id="writeOffs"
                value={editWriteOffs}
                onValueChange={setEditWriteOffs}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="ninetyPlus">90+ Days</Label>
              <KHCurrencyInput
                id="ninetyPlus"
                value={editNinetyPlus}
                onValueChange={setEditNinetyPlus}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="comments">Comments</Label>
              <Textarea
                id="comments"
                value={editComments}
                onChange={(e) => setEditComments(e.target.value)}
                placeholder="Enter comments..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateReport} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Update Report"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Modal */}
      <CreateReportModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        reportType={createReportType}
        onSuccess={() => {
          // Refresh the reports list
          handleFilter();
        }}
        userBranches={userBranches}
      />
    </Card>
  );
}
