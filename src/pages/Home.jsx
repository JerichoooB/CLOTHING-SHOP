import Hero from "../components/Hero";
import Benefits from "../sections/Benefits";
import Categories from "../sections/Categories";
import FeaturedProducts from "../sections/FeaturedProducts";
import Story from "../sections/Story";
import Newsletter from "../sections/Newsletter";
import "./Home.css";
export default function Home({ onNavigate }) {
  return (
    <div className="home-page">
      <Hero page="Home" go={onNavigate} />
      <Benefits />
      <Categories onNavigate={onNavigate} />
      <FeaturedProducts onNavigate={onNavigate} />
      <Story onNavigate={onNavigate} />
      <Newsletter />
    </div>
  );
}
