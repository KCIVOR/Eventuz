type Props = {
  label: string;
};

export function PlaceholderNotice({ label }: Props) {
  return (
    <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
      {label} — module not built yet.
    </p>
  );
}
