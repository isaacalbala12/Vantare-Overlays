import { EventBanner } from "../components/EventBanner";
import { HeroSection } from "../components/HeroSection";
import { ProSidebar } from "../components/ProSidebar";
import { RatingChart } from "../components/RatingChart";
import { RatingsCards } from "../components/RatingsCards";
import { RecentRaces } from "../components/RecentRaces";

export function DashboardPage() {
  return (
    <>
      <HeroSection />

      <div className="max-w-[1920px] mx-auto px-6 py-6 relative z-20">
        <EventBanner />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Left Column (8 cols) */}
          <div className="xl:col-span-8 flex flex-col gap-6">
            <RatingsCards />
            <RatingChart />
            <RecentRaces />
          </div>

          {/* Right Column (4 cols) */}
          <div className="xl:col-span-4 flex flex-col gap-6">
            <ProSidebar />
          </div>
        </div>
      </div>
    </>
  );
}
