import ReportGenerator from '@/components/report-generator';
import { getSales, getExpenses, getBooks } from '@/lib/actions';

export default async function ReportsPage() {
  const [sales, expenses, books] = await Promise.all([
    getSales(),
    getExpenses(),
    getBooks(),
  ]);
  
  const data = { sales, expenses, books };

  return <ReportGenerator data={data} />;
}
