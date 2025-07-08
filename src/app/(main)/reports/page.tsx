import ReportGenerator from '@/components/report-generator';
import { sales, expenses } from '@/lib/data';

export default function ReportsPage() {
  // In a real app, the component might fetch this data itself based on user input,
  // or the data fetching could happen inside the server action called by the component.
  const mockData = {
    sales,
    expenses,
  };
  return <ReportGenerator mockData={mockData} />;
}
