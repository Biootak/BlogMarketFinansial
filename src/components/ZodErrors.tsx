export function ZodErrors({ error }: { error: string[] }) {
  if (!error) return null;
  return error.map((err: string, index: number) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: error messages are unique per field, index is stable
    <div key={index} className="text-pink-500 text-xs italic mt-1 py-2">
      {err}
    </div>
  ));
}
