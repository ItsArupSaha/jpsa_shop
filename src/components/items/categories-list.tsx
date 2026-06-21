'use client';

import * as React from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Category } from '@/lib/types';

interface CategoriesListProps {
  categories: Category[];
  onAddClick: () => void;
  onEditClick: (category: Category) => void;
  onDeleteClick: (id: string) => void;
  isPending: boolean;
}

export function CategoriesList({
  categories,
  onAddClick,
  onEditClick,
  onDeleteClick,
  isPending
}: CategoriesListProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Categories</h3>
        <Button onClick={onAddClick} variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" /> Add Category
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((category) => (
          <div key={category.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <p className="font-medium">{category.name}</p>
              {category.description && (
                <p className="text-sm text-muted-foreground">{category.description}</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="sm" onClick={() => onEditClick(category)}>
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:bg-destructive/10"
                onClick={() => onDeleteClick(category.id)}
                disabled={isPending}
              >
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
