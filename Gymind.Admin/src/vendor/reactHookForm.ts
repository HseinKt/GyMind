type SubmitHandler<T> = (values: T) => void | Promise<void>;

export function useForm<T extends Record<string, unknown>>(options?: { defaultValues?: Partial<T> }) {
  function register(name: keyof T, config?: { valueAsNumber?: boolean; required?: boolean | string }) {
    return {
      name: String(name),
      defaultValue: options?.defaultValues?.[name] as string | number | undefined,
      "data-value-as-number": config?.valueAsNumber ? "true" : undefined,
      required: Boolean(config?.required)
    };
  }

  function handleSubmit(handler: SubmitHandler<T>) {
    return (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const form = event.currentTarget;
      const values: Record<string, unknown> = {};
      new FormData(form).forEach((value, key) => {
        const input = form.elements.namedItem(key) as HTMLInputElement | null;
        if (input?.dataset.valueAsNumber === "true") {
          values[key] = value === "" ? undefined : Number(value);
          return;
        }
        values[key] = value;
      });
      void handler(values as T);
    };
  }

  return { register, handleSubmit, formState: { errors: {} as Record<string, { message?: string }> } };
}
