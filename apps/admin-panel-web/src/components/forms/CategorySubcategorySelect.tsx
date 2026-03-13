/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect } from 'react';
import { Control, FieldPath, FieldValues, useWatch, useFormContext } from 'react-hook-form';
import { useQuery } from '@tanstack/react-query';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import http from '@/api/http';
import endpoints from '@/api/endpoints';

// Constant for "Other" option value - must match backend
export const OTHER_CATEGORY_VALUE = 'other';

interface CategoryOption {
  id: string;
  name: string;
  parentId: string | null;
}

interface ApiResponse<T> {
  message: string;
  data: T;
}

interface CategorySubcategorySelectProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  categoryFieldName: FieldPath<TFieldValues>;
  subCategoryFieldName: FieldPath<TFieldValues>;
  customCategoryFieldName: FieldPath<TFieldValues>;
  customSubCategoryFieldName: FieldPath<TFieldValues>;
  disabled?: boolean;
}

export function CategorySubcategorySelect<TFieldValues extends FieldValues>({
  control,
  categoryFieldName,
  subCategoryFieldName,
  customCategoryFieldName,
  customSubCategoryFieldName,
  disabled = false,
}: CategorySubcategorySelectProps<TFieldValues>) {
  const { setValue } = useFormContext<TFieldValues>();
  const selectedCategoryId = useWatch({ control, name: categoryFieldName });
  const selectedSubCategoryId = useWatch({ control, name: subCategoryFieldName });

  // Fetch parent categories
  const { data: categoriesResponse, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ['categories', 'parents'],
    queryFn: async () => {
      const response = await http.get<ApiResponse<CategoryOption[]>>(endpoints.category.parents);
      return response as unknown as ApiResponse<CategoryOption[]>;
    },
  });

  // Fetch subcategories when category is selected
  const { data: subcategoriesResponse, isLoading: isSubcategoriesLoading } = useQuery({
    queryKey: ['categories', selectedCategoryId, 'subcategories'],
    queryFn: async () => {
      if (!selectedCategoryId || selectedCategoryId === OTHER_CATEGORY_VALUE) {
        return { data: [] } as ApiResponse<CategoryOption[]>;
      }
      const response = await http.get<ApiResponse<CategoryOption[]>>(
        endpoints.category.subcategories(selectedCategoryId),
      );
      return response as unknown as ApiResponse<CategoryOption[]>;
    },
    enabled: !!selectedCategoryId && selectedCategoryId !== OTHER_CATEGORY_VALUE,
  });

  // Reset subcategory when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      setValue(subCategoryFieldName, '' as any);
      setValue(customSubCategoryFieldName, '' as any);
    }
  }, [selectedCategoryId, setValue, subCategoryFieldName, customSubCategoryFieldName]);

  const categories = categoriesResponse?.data || [];
  const subcategories = subcategoriesResponse?.data || [];

  const showCustomCategory = selectedCategoryId === OTHER_CATEGORY_VALUE;
  const showSubcategorySelect = selectedCategoryId && selectedCategoryId !== OTHER_CATEGORY_VALUE;
  const showCustomSubCategory = selectedSubCategoryId === OTHER_CATEGORY_VALUE;

  return (
    <div className="space-y-4">
      {/* Category Dropdown */}
      <FormField
        control={control}
        name={categoryFieldName}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value || ''}
              disabled={disabled || isCategoriesLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
                <SelectItem value={OTHER_CATEGORY_VALUE}>Other</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Custom Category Input (when "Other" selected) */}
      {showCustomCategory && (
        <FormField
          control={control}
          name={customCategoryFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Category</FormLabel>
              <FormControl>
                <Input placeholder="Enter category name" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Subcategory Dropdown (when valid category selected) */}
      {showSubcategorySelect && (
        <FormField
          control={control}
          name={subCategoryFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subcategory (Optional)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value || ''}
                disabled={disabled || isSubcategoriesLoading}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subcategory" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {subcategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER_CATEGORY_VALUE}>Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Custom Subcategory Input (when "Other" selected for subcategory) */}
      {showCustomSubCategory && (
        <FormField
          control={control}
          name={customSubCategoryFieldName}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Custom Subcategory</FormLabel>
              <FormControl>
                <Input placeholder="Enter subcategory name" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </div>
  );
}
