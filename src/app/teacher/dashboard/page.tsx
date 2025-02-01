"use client"
import SearchBar from "@/components/search-bar"
import Notification from "@/components/notification"
import DashboardAddClassCard from "@/components/dashboard-add-class-card"

const DashboardHome = () => {
  return ( <>
      <header className="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
        <div className="flex flex-1 items-center gap-2 px-3 rounded-half mx-auto bg-muted/50 pt-8 pl-8">
          <SearchBar />
          <Notification />
        </div>
      </header>
      <main className="flex flex-col gap-10 p-4">

      <div className="mx-auto w-full max-w-3xl">
          <h1 className="text-2xl font-semibold my-4">Most Recent</h1>
          <DashboardAddClassCard />
        </div>
        <h1 className="text-2xl font-semibold">Performance</h1>
        <div className="mx-auto h-[100vh] w-full max-w-3xl rounded-xl bg-muted/50">
        </div>
      </main>
  
  </> );
}
 
export default DashboardHome;