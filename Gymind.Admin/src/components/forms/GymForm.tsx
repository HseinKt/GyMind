import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

export interface GymFormValues { name: string; city?: string; logoUrl?: string; ownerUserId?: number; logoFile?: File | string; }

export function GymForm({ initialValues, onSubmit, saving = false }: { initialValues?: Partial<GymFormValues>; onSubmit: (values: GymFormValues, logoFile?: File) => Promise<void> | void; saving?: boolean }) {
  const { register, handleSubmit } = useForm<GymFormValues>({ defaultValues: initialValues });
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function updatePreview(file?: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(file ? URL.createObjectURL(file) : "");
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={handleSubmit((values) => {
        const logoFile = values.logoFile instanceof File ? values.logoFile : undefined;
        const { logoFile: _logoFile, ...gymValues } = values;
        return onSubmit(gymValues, logoFile && logoFile.size > 0 ? logoFile : undefined);
      })}
    >
      <label>Name<Input {...register("name", { required: true })} /></label>
      <label>City<Input {...register("city")} /></label>
      <label>Gym photo<Input type="file" accept="image/*" {...register("logoFile")} onChange={(event) => updatePreview(event.currentTarget.files?.[0])} /></label>
      {previewUrl ? (
        <img className="h-28 w-28 rounded-lg border border-forge-border object-cover" src={previewUrl} alt="Selected gym logo preview" />
      ) : null}
      <Button disabled={saving}>Save gym</Button>
    </form>
  );
}
