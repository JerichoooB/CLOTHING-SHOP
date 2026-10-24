import { Truck, ShieldCheck, RotateCcw, Leaf } from "lucide-react";
import "./Benefits.css";
const benefits = [
  [Truck, "FREE SHIPPING", "On orders from ₱1,500"],
  [ShieldCheck, "DEMO CHECKOUT", "No real money charged"],
  [RotateCcw, "EASY RETURNS", "Within 7 days"],
  [Leaf, "SUSTAINABLE CHOICES", "Better for the planet"],
];
export default function Benefits() {
  return (
    <section className="benefits">
      {benefits.map(([Icon, title, text]) => (
        <div key={title}>
          <Icon />
          <span>
            <strong>{title}</strong>
            <small>{text}</small>
          </span>
        </div>
      ))}
    </section>
  );
}
