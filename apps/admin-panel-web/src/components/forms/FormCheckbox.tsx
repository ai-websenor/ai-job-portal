import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Control, FieldPath, FieldValues } from "react-hook-form";

interface FormCheckboxProps<TFieldValues extends FieldValues> {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function FormCheckbox<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled = false,
}: FormCheckboxProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-row items-start space-x-3 space-y-0">
          <FormControl>
            <Checkbox
              checked={field.value}
              onCheckedChange={field.onChange}
              disabled={disabled}
            />
          </FormControl>
          <div className="space-y-1 leading-none">
            <FormLabel>{label}</FormLabel>
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
