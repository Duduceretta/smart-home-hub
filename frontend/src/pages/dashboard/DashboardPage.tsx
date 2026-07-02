import { DashboardHeader } from "@/features/dashboard/components/DashboardHeader";
import { DashboardMetrics } from "@/features/dashboard/components/DashboardMetrics";
import { EnergyChart } from "@/features/dashboard/components/EnergyChart";
import { QuickActions } from "@/features/dashboard/components/QuickActions";
import { RecentActivities } from "@/features/dashboard/components/RecentActivities";
import { RoomChart } from "@/features/dashboard/components/RoomChart";

export function DashboardPage() {
	return (
		<div className="flex flex-col gap-6 animate-fade-up">
			<DashboardHeader />
			<DashboardMetrics />
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<EnergyChart />
				<div className="lg:col-span-1 flex flex-col gap-6">
					<QuickActions />
					<RoomChart />
				</div>
			</div>
			<RecentActivities />
		</div>
	);
}
