import { DashboardShell } from "@/components/dashboard-shell";
import { sampleAppState } from "@/lib/data/sample-data";

export default function Page() {
  return <DashboardShell initialState={sampleAppState} />;
}
