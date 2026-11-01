import { DetailPageSkeleton } from "@/components/shared/loading/pageSkeletons";

/** Fallback while any student page without its own loading.tsx is loading. Sidebar and header stay visible. */
export default function Loading() {
  return <DetailPageSkeleton />;
}
