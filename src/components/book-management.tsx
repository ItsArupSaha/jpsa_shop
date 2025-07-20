
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Edit, Trash2, Download, FileText, FileSpreadsheet, Loader2 } from 'lucide-react';
import { getBooks, getBooksPaginated, addBook, updateBook, deleteBook, getSales } from '@/lib/actions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';


import type { Book, Sale } from '@/lib/types';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Calendar } from '@/components/ui/calendar';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  author: z.string().min(1, 'Author is required'),
  productionPrice: z.coerce.number().min(0, 'Production price must be positive'),
  sellingPrice: z.coerce.number().min(0, 'Selling price must be positive'),
  stock: z.coerce.number().int().min(0, 'Stock must be a non-negative integer'),
}).refine(data => data.sellingPrice >= data.productionPrice, {
  message: "Selling price cannot be less than production price.",
  path: ["sellingPrice"],
});

type BookFormValues = z.infer<typeof bookSchema>;

interface ClosingStock extends Book {
  closingStock: number;
}

interface BookManagementProps {
  initialBooks: Book[];
  initialHasMore: boolean;
}

export default function BookManagement({ initialBooks, initialHasMore }: BookManagementProps) {
  const [books, setBooks] = React.useState<Book[]>(initialBooks);
  const [hasMore, setHasMore] = React.useState(initialHasMore);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>(new Date());
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadInitialData = React.useCallback(async () => {
    const { books: newBooks, hasMore: newHasMore } = await getBooksPaginated({ pageLimit: 15 });
    setBooks(newBooks);
    setHasMore(newHasMore);
  }, []);

  const handleLoadMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    const lastBookId = books[books.length - 1]?.id;
    const { books: newBooks, hasMore: newHasMore } = await getBooksPaginated({ pageLimit: 15, lastVisibleId: lastBookId });
    setBooks(prev => [...prev, ...newBooks]);
    setHasMore(newHasMore);
    setIsLoadingMore(false);
  };

  const form = useForm<BookFormValues>({
    resolver: zodResolver(bookSchema),
    defaultValues: {
      title: '',
      author: '',
      productionPrice: 0,
      sellingPrice: 0,
      stock: 0,
    },
  });

  const handleEdit = (book: Book) => {
    setEditingBook(book);
    form.reset(book);
    setIsDialogOpen(true);
  };

  const handleAddNew = () => {
    setEditingBook(null);
    form.reset({ title: '', author: '', productionPrice: 0, sellingPrice: 0, stock: 0 });
    setIsDialogOpen(true);
  };
  
  const handleDelete = (id: string) => {
    startTransition(async () => {
      await deleteBook(id);
      await loadInitialData();
      toast({ title: "Book Deleted", description: "The book has been removed from the inventory." });
    });
  }

  const onSubmit = (data: BookFormValues) => {
    startTransition(async () => {
      if (editingBook) {
        await updateBook(editingBook.id, data);
        toast({ title: "Book Updated", description: "The book details have been saved." });
      } else {
        await addBook(data);
        toast({ title: "Book Added", description: "The new book is now in your inventory." });
      }
      await loadInitialData();
      setIsDialogOpen(false);
      setEditingBook(null);
    });
  };
  
  const handleCalculateClosingStock = async () => {
    if (!closingStockDate) {
      toast({ variant: 'destructive', title: 'Error', description: 'Please select a date.' });
      return;
    }
    
    setIsCalculating(true);
    // Fetch all books and sales for this calculation, ignoring component state
    const [allBooks, allSales] = await Promise.all([getBooks(), getSales()]);
    
    const salesAfterDate = allSales.filter(s => new Date(s.date) > closingStockDate);

    const calculatedData = allBooks.map(book => {
      const quantitySoldAfter = salesAfterDate.reduce((total, sale) => {
        const item = sale.items.find(i => i.bookId === book.id);
        return total + (item ? item.quantity : 0);
      }, 0);
      
      return {
        ...book,
        closingStock: book.stock + quantitySoldAfter
      }
    });

    setClosingStockData(calculatedData);
    setIsCalculating(false);
    setIsStockDialogOpen(false);
  }

  const handleDownloadPdf = () => {
    if (!closingStockData.length || !closingStockDate) return;
    
    const doc = new jsPDF();
    const dateString = format(closingStockDate, 'PPP');
    
    doc.text(`Closing Stock Report as of ${dateString}`, 14, 15);
    
    autoTable(doc, {
      startY: 20,
      head: [['Title', 'Author', 'Stock']],
      body: closingStockData.map(book => [book.title, book.author, book.closingStock]),
    });
    
    doc.save(`closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.pdf`);
  };

  const handleDownloadCsv = () => {
    if (!closingStockData.length || !closingStockDate) return;
    
    const csvData = closingStockData.map(book => ({
      Title: book.title,
      Author: book.author,
      Stock: book.closingStock,
    }));

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `closing-stock-report-${format(closingStockDate, 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="font-headline text-2xl">Book Inventory</CardTitle>
            <CardDescription>Manage your book catalog, prices, and stock levels.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 items-end">
             <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Book
            </Button>
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <Download className="mr-2 h-4 w-4" /> Download Stock
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Calculate Closing Stock</DialogTitle>
                        <DialogDescription>Select a date to calculate the closing stock for all books up to that day.</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 overflow-y-auto max-h-[calc(100vh-200px)]">
                        <div className="flex flex-col items-center gap-4">
                            <Calendar
                                mode="single"
                                selected={closingStockDate}
                                onSelect={setClosingStockDate}
                                initialFocus
                                numberOfMonths={1}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            />
                            <p className="text-sm text-muted-foreground">
                                {closingStockDate ? (
                                    <>Selected: {format(closingStockDate, "LLL dd, y")}</>
                                ) : (
                                    <span>Please pick a date.</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCalculateClosingStock} disabled={isCalculating || !closingStockDate}>
                            {isCalculating ? "Calculating..." : "Calculate"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {closingStockData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-2">Closing Stock as of {closingStockDate ? format(closingStockDate, 'PPP') : ''}</h3>
            <div className="border rounded-md">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Author</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {closingStockData.map(book => (
                    <TableRow key={book.id}>
                      <TableCell className="font-medium">{book.title}</TableCell>
                      <TableCell>{book.author}</TableCell>
                      <TableCell className="text-right">{book.closingStock}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
             <div className="flex items-center gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                <FileText className="mr-2 h-4 w-4" /> Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadCsv}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Download CSV
              </Button>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setClosingStockData([])}>Clear Results</Button>
            </div>
            <hr className="my-6"/>
          </div>
        )}

        <h3 className="text-lg font-semibold mb-2">Current Inventory</h3>
        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Author</TableHead>
                <TableHead className="text-right">Selling Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {books.map((book) => (
                <TableRow key={book.id}>
                  <TableCell className="font-medium">{book.title}</TableCell>
                  <TableCell>{book.author}</TableCell>
                  <TableCell className="text-right">${book.sellingPrice.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{book.stock}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(book)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                     <Button variant="ghost" size="icon" onClick={() => handleDelete(book.id)} disabled={isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {hasMore && (
          <div className="flex justify-center mt-4">
            <Button onClick={handleLoadMore} disabled={isLoadingMore}>
              {isLoadingMore ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/> Loading...</> : 'Load More'}
            </Button>
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>
              {editingBook ? 'Update the details of this book.' : 'Enter the details for the new book.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 flex flex-col overflow-hidden">
             <div className="flex-1 overflow-y-auto pr-4 pl-1 -mr-4 -ml-1">
                <div className="space-y-4 py-4 px-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Title</FormLabel>
                      <FormControl>
                        <Input placeholder="The Great Gatsby" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="author"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Author</FormLabel>
                      <FormControl>
                        <Input placeholder="F. Scott Fitzgerald" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="productionPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Production Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="5.50" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sellingPrice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Selling Price</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="10.99" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="15" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                </div>
              </div>
              <DialogFooter className="pt-4 border-t">
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
