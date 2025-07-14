'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PlusCircle, Edit, Trash2, Calendar as CalendarIcon, History } from 'lucide-react';
import { getBooks, addBook, updateBook, deleteBook, getSales } from '@/lib/actions';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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

export default function BookManagement() {
  const [books, setBooks] = React.useState<Book[]>([]);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isStockDialogOpen, setIsStockDialogOpen] = React.useState(false);
  const [editingBook, setEditingBook] = React.useState<Book | null>(null);
  const [closingStockDate, setClosingStockDate] = React.useState<Date | undefined>();
  const [closingStockData, setClosingStockData] = React.useState<ClosingStock[]>([]);
  const [isCalculating, setIsCalculating] = React.useState(false);
  const { toast } = useToast();
  const [isPending, startTransition] = React.useTransition();

  const loadBooks = React.useCallback(async () => {
    const initialBooks = await getBooks();
    setBooks(initialBooks);
  }, []);

  React.useEffect(() => {
    loadBooks();
  }, [loadBooks]);

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
      await loadBooks();
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
      await loadBooks();
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
    const sales = await getSales();
    
    const salesAfterDate = sales.filter(s => new Date(s.date) > closingStockDate);

    const calculatedData = books.map(book => {
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

  return (
    <Card className="animate-in fade-in-50">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="font-headline text-2xl">Book Inventory</CardTitle>
            <CardDescription>Manage your book catalog, prices, and stock levels.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
                <DialogTrigger asChild>
                    <Button variant="outline">
                        <History className="mr-2 h-4 w-4" /> Calculate Closing Stock
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Calculate Closing Stock</DialogTitle>
                        <DialogDescription>Select a date to calculate the closing stock for all books up to that day.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                        "w-full justify-start text-left font-normal",
                                        !closingStockDate && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {closingStockDate ? format(closingStockDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                    mode="single"
                                    selected={closingStockDate}
                                    onSelect={setClosingStockDate}
                                    initialFocus
                                    disabled={(date) => date > new Date()}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleCalculateClosingStock} disabled={isCalculating}>{isCalculating ? "Calculating..." : "Calculate"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Button onClick={handleAddNew} className="bg-primary hover:bg-primary/90">
              <PlusCircle className="mr-2 h-4 w-4" /> Add New Book
            </Button>
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
             <Button variant="outline" size="sm" className="mt-4" onClick={() => setClosingStockData([])}>Clear Results</Button>
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
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">{editingBook ? 'Edit Book' : 'Add New Book'}</DialogTitle>
            <DialogDescription>
              {editingBook ? 'Update the details of this book.' : 'Enter the details for the new book.'}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
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
              <DialogFooter>
                <Button type="submit" disabled={isPending}>{isPending ? "Saving..." : "Save changes"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
