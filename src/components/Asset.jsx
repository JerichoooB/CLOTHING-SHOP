import "./Asset.css";
export default function Asset({
  src = "/images/clover-editorials.png",
  cell = 0,
  editorial: wide = false,
  grid,
  className = "",
  label = "",
}) {
  const cols = grid?.[0] ?? (wide ? 2 : 4),
    rows = grid?.[1] ?? (wide ? 3 : 4),
    ratio = wide ? 2.25 : 1;
  return (
    <svg
      role="img"
      aria-label={label}
      className={`asset ${className}`}
      viewBox={`${(cell % cols) * ratio} ${Math.floor(cell / cols)} ${ratio} 1`}
      preserveAspectRatio={wide ? "xMaxYMin slice" : "xMidYMid slice"}
    >
      <image
        href={src}
        x="0"
        y="0"
        width={cols * ratio}
        height={rows}
        preserveAspectRatio="none"
      />
    </svg>
  );
}
