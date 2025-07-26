"use client";

import { useResponsive } from "@/src/hooks/use-responsive";
import { Card, CardContent } from "@/src/components/ui/card";
import { StudentClassCard } from "@/src/components/class/StudentClassCard";
import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { Button } from "@/src/components/ui/button";
import { SessionDebugger } from "@/src/components/debug/SessionDebug";
import { formatCurrency } from "@/src/lib/utils";

// Define the color options for class cards
const CLASS_COLORS = [
	"primary",
	"secondary",
	"success",
	"warning",
	"destructive",
	"default",
];

interface ClassSession {
	id: string;
	dayOfWeek: number;
	startTime: string;
	endTime: string;
}

interface Class {
	id: string;
	name: string;
	code: string;
	emoji: string;
	grade?: string;
	color?: string;
	schedule?: string;
	classSessions?: ClassSession[];
	_count?: {
		enrollments: number;
	};
}

const DaysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Helper function to format class schedules
const formatClassSchedule = (sessions?: ClassSession[]) => {
	if (!sessions || sessions.length === 0) return null;

	return sessions
		.map((session) => {
			const day = DaysOfWeek[session.dayOfWeek];
			return `${day} ${session.startTime}-${session.endTime}`;
		})
		.join(", ");
};

interface Student {
	id: string;
	firstName: string;
	lastName: string;
	schoolEmail: string;
	profileImage?: string | null;
	progress?:
		| {
				completedAssignments: number;
				totalAssignments: number;
				points: number;
				balance: number;
				streak: number;
		  }
		| null;
	teacher?:
		| {
				id: string;
				name: string;
				email: string;
				image?: string | null;
		  }
		| null;
}

interface StudentDashboardClientProps {
	student: Student | null;
	classes: Class[];
}

export default function StudentDashboardClient({
	student,
	classes,
}: StudentDashboardClientProps) {
	const { isMobile, isTablet, isDesktop } = useResponsive();

	// Get user initials for avatar fallback
	const getInitials = () => {
		if (!student) return "ST";
		return `${student.firstName?.charAt(0) || ""}${student.lastName?.charAt(0) || ""}`;
	};

	// Process classes to ensure they have colors and counts
	const classesWithColors = classes.map((classItem, index) => {
		// Generate schedule if not already provided
		const schedule =
			classItem.schedule || formatClassSchedule(classItem.classSessions);

		if (!classItem.color) {
			// Use the class item's index to pick a color, or cycle through colors if more classes than colors
			const colorIndex = index % CLASS_COLORS.length;
			return {
				...classItem,
				color: CLASS_COLORS[colorIndex],
				schedule,
				_count: classItem._count || { enrollments: 0 },
			};
		}
		return {
			...classItem,
			schedule,
			_count: classItem._count || { enrollments: 0 },
		};
	});

	return (
		<div className="min-h-screen bg-gray-50">
			<div className="container-responsive py-responsive">
				{/* Welcome Section - Responsive */}
				<div className="card-responsive bg-white border shadow-sm mb-4 sm:mb-6">
					<div className="flex-responsive-col items-start sm:items-center justify-between gap-3">
						<div className="flex items-center gap-3 sm:gap-4">
							<div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center">
								{student?.profileImage ? (
									<img
										src={student.profileImage}
										alt="Profile"
										className="w-full h-full rounded-full object-cover"
									/>
								) : (
									<span className="text-green-600 font-semibold text-lg sm:text-xl">
										{getInitials()}
									</span>
								)}
							</div>
							<div>
								<h1 className="text-responsive-lg font-bold text-gray-900">
									Welcome back,{" "}
									{`${student?.firstName || ""} ${student?.lastName || ""}`}!
								</h1>
								<p className="text-responsive-sm text-gray-600">
									{student?.schoolEmail}
								</p>
							</div>
						</div>

						{/* Stats - Responsive layout */}
						<div className="w-full sm:w-auto">
							<div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
								<div className="text-center bg-green-50 rounded-lg p-2 sm:p-3">
									<div className="text-lg sm:text-xl font-bold text-green-600">
										{student?.progress?.points || 0}
									</div>
									<div className="text-xs sm:text-sm text-gray-600">
										Points
									</div>
								</div>
								<div className="text-center bg-blue-50 rounded-lg p-2 sm:p-3">
									<div className="text-lg sm:text-xl font-bold text-blue-600">
										${student?.progress?.balance || 0}
									</div>
									<div className="text-xs sm:text-sm text-gray-600">
										Balance
									</div>
								</div>
								{!isMobile && (
									<>
										<div className="text-center bg-orange-50 rounded-lg p-2 sm:p-3">
											<div className="text-lg sm:text-xl font-bold text-orange-600">
												{student?.progress?.streak || 0}
											</div>
											<div className="text-xs sm:text-sm text-gray-600">
												Streak
											</div>
										</div>
										<div className="text-center bg-purple-50 rounded-lg p-2 sm:p-3">
											<div className="text-lg sm:text-xl font-bold text-purple-600">
												{student?.progress?.completedAssignments || 0}/
												{student?.progress?.totalAssignments || 0}
											</div>
											<div className="text-xs sm:text-sm text-gray-600">
												Complete
											</div>
										</div>
									</>
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Classes Grid - Responsive */}
				<div className="content-spacing">
					<div className="flex items-center justify-between mb-4">
						<h2 className="text-responsive-lg font-semibold text-gray-900">
							My Classes
						</h2>
						<span className="text-responsive-sm text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
							{classes.length}{" "}
							{classes.length === 1 ? "class" : "classes"}
						</span>
					</div>

					{classes.length > 0 ? (
						<div className="grid-classes gap-responsive">
							{classesWithColors.map((classItem) => (
								<StudentClassCard
									key={classItem.id}
									id={classItem.id}
									emoji={classItem.emoji}
									name={classItem.name}
									code={classItem.code}
									color={classItem.color}
									grade={classItem.grade}
									schedule={classItem.schedule}
									numberOfStudents={classItem._count?.enrollments}
								/>
							))}
						</div>
					) : (
						<div className="card-responsive bg-white border-2 border-dashed border-gray-300 text-center py-8 sm:py-12">
							<div className="text-4xl sm:text-6xl mb-3 sm:mb-4">📚</div>
							<h3 className="text-responsive-base font-medium text-gray-900 mb-2">
								No Classes Yet
							</h3>
							<p className="text-responsive-sm text-gray-600 max-w-md mx-auto">
								You haven't been enrolled in any classes yet. Check with your
								teacher or administrator to get started.
							</p>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
