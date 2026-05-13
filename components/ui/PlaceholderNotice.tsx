type Props = {
  label: string;
};

export function PlaceholderNotice({ label }: Props) {
  return (
    <div 
      style={{ 
        padding: "32px", 
        border: "1px dashed #EDE8E3", 
        borderRadius: "2px", 
        background: "#F7F4EF",
        textAlign: "center"
      }}
    >
      <p 
        style={{ 
          fontFamily: "var(--font-sans)", 
          fontSize: "13px", 
          fontWeight: 300, 
          fontStyle: "italic", 
          color: "var(--mid-gray)" 
        }}
      >
        {label} — module development in progress.
      </p>
    </div>
  );
}
