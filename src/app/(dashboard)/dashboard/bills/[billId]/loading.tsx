import { LoadingState } from "@/src/components/loading-state";

export default function Loading() {
  return (
    <main className="container mx-auto p-4">
      <div className="container mx-auto p-6">
        <LoadingState items={4} />
      </div>
    </main>
  );
}