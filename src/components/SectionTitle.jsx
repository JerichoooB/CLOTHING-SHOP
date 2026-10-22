import "./SectionTitle.css";
export default function SectionTitle({ eyebrow, title, onClick }) {
  return (
    <div className="section-title">
      <div>
        <h2>{title}</h2>
        {eyebrow && <p className="section-subtitle">— &nbsp; {eyebrow}</p>}
      </div>
      <button className="text-link" onClick={onClick}>
        VIEW ALL ⟶
      </button>
    </div>
  );
}
