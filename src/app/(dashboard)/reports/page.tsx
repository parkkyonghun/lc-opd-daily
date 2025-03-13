import { Breadcrumbs } from "@/components/dashboard/layout/Breadcrumbs";
import ViewReports from "@/components/view-reports";

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <Breadcrumbs />
      {/* <h1 className="text-3xl font-bold">View Reports</h1> */}
      <ViewReports />
    </div>
  );
}
