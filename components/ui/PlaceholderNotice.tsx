type Props = {
  label: string;
};

export function PlaceholderNotice({ label }: Props) {
  return (
    <p className="text-center text-sm italic text-muted-foreground">
      {label} — module not built yet.
    </p>
  );
}
