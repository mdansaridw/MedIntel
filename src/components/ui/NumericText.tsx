const numberPattern = /(\d+(?:[.,]\d+)*)/g

export function NumericText({ text, className }: { text: string; className?: string }) {
  const parts = text.split(numberPattern)

  return (
    <span className={className}>
      {parts.map((part, index) =>
        /^\d+(?:[.,]\d+)*$/.test(part) ? (
          <span key={`${part}-${index}`} className="numeric">
            {part}
          </span>
        ) : (
          part
        ),
      )}
    </span>
  )
}
