"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/src/components/ui/tabs";
import { Button } from "@/src/components/ui/button";
import { PlusCircle } from "lucide-react";
import {
  createGenericLessonPlan,
  updateGenericLessonPlan,
  deleteGenericLessonPlan,
  deleteLessonPlan,
  GradeLevel,
} from "@/src/app/actions/lessonPlansActions";
import LessonPlanCard from "@/src/components/lessonPlans/LessonPlanCard";
import AddLessonPlanDialog from "@/src/components/lessonPlans/AddLessonPlanDialog";
import AddGenericLessonPlanCard from "@/src/components/lessonPlans/AddGenericLessonPlanCard";
import GenericLessonPlanDialog from "@/src/components/lessonPlans/GenericLessonPlanDialog";
import AddAnything from "@/src/components/AddAnything";
import { toast } from "sonner";
import TemplateGradeTabs from "@/src/components/lessonPlans/TemplateGradeTabs";
import SuperUserBadge from "@/src/components/SuperUserBadge";
import TemplateLessonPlanCard from "@/src/components/lessonPlans/TemplateLessonPlanCard";
import { useRouter } from "next/navigation";

// LessonPlan interface
interface LessonPlan {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  gradeLevel?: string;
  classes?: Array<{
    code: string;
    name: string;
    emoji?: string;
    grade?: string;
  }>;
}

interface LessonPlansContentProps {
  initialUserPlans: LessonPlan[];
  initialGenericPlans: LessonPlan[];
  isSuperUser: boolean;
}

export default function LessonPlansContent({
  initialUserPlans,
  initialGenericPlans,
  isSuperUser,
}: LessonPlansContentProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get initial tab from URL params or default based on user type
  const initialTab =
    (searchParams.get("tab") as "my-plans" | "templates") ||
    (isSuperUser ? "templates" : "my-plans");
  const initialGrade = (searchParams.get("grade") as GradeLevel) || "all";

  const [activeTab, setActiveTab] = useState<"my-plans" | "templates">(
    initialTab
  );
  const [templateGradeTab, setTemplateGradeTab] =
    useState<GradeLevel>(initialGrade);
  const [isGenericDialogOpen, setIsGenericDialogOpen] = useState(false);
  const [selectedGenericPlan, setSelectedGenericPlan] =
    useState<LessonPlan | null>(null);

  // Handle lesson plan creation success - refresh the page like bills
  const handleLessonPlanCreated = () => {
    router.refresh();
  };

  const handleCreateGenericPlan = async (data: {
    name: string;
    description?: string;
  }) => {
    try {
      const response = await createGenericLessonPlan(data);
      if (response.success) {
        toast.success("Template created successfully");
        router.refresh();
        setIsGenericDialogOpen(false);
      } else {
        toast.error(response.error || "Failed to create template");
      }
    } catch (error) {
      console.error("Error creating generic lesson plan:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleUpdateGenericPlan = async (
    id: string,
    data: { name: string; description?: string }
  ) => {
    try {
      const response = await updateGenericLessonPlan(id, data);
      if (response.success) {
        toast.success("Template updated successfully");
        router.refresh();
        setSelectedGenericPlan(null);
      } else {
        toast.error(response.error || "Failed to update template");
      }
    } catch (error) {
      console.error("Error updating generic lesson plan:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeleteGenericPlan = async (id: string) => {
    try {
      const response = await deleteGenericLessonPlan(id);
      if (response.success) {
        toast.success("Template deleted successfully");
        router.refresh();
      } else {
        toast.error(response.error || "Failed to delete template");
      }
    } catch (error) {
      console.error("Error deleting generic lesson plan:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const handleDeleteUserPlan = async (id: string) => {
    try {
      const response = await deleteLessonPlan(id);
      if (response.success) {
        toast.success("Lesson plan deleted successfully");
        router.refresh();
      } else {
        toast.error(response.error || "Failed to delete lesson plan");
      }
    } catch (error) {
      console.error("Error deleting lesson plan:", error);
      toast.error("An unexpected error occurred");
    }
  };

  const getColumnColor = (index: number) => {
    switch (index % 3) {
      case 0:
        return "bg-blue-100";
      case 1:
        return "bg-green-100";
      case 2:
        return "bg-yellow-100";
      default:
        return "bg-blue-100";
    }
  };

  // Filter templates by grade
  const filteredGenericPlans = initialGenericPlans.filter(
    (plan) => templateGradeTab === "all" || plan.gradeLevel === templateGradeTab
  );

  return (
    <main className="container mx-auto p-4">
      {/* Show admin privilege indicator for super users */}
      {isSuperUser && (
        <div className="mb-6 flex items-center gap-2">
          <h2 className="text-lg font-medium">Template Management</h2>
          <SuperUserBadge />
        </div>
      )}

      {/* Show tabs only for regular teachers, not for super users */}
      {isSuperUser ? (
        // Super user view - only show templates
        <>
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Lesson Templates</h1>
            <Button
              onClick={() => setIsGenericDialogOpen(true)}
              className="bg-orange-500 hover:bg-orange-600"
            >
              <PlusCircle className="h-4 w-4 mr-2" />
              Create Template
            </Button>
          </div>

          <TemplateGradeTabs
            activeGrade={templateGradeTab}
            onChange={setTemplateGradeTab}
          />

          <div className="min-h-full bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 p-4 sm:p-6 bg-gray-50">
              {filteredGenericPlans.map((plan, index) => (
                <TemplateLessonPlanCard
                  key={plan.id}
                  plan={plan}
                  backgroundColor={getColumnColor(index)}
                  isSuperUser={true}
                  onEdit={() => setSelectedGenericPlan(plan)}
                  onDelete={() => handleDeleteGenericPlan(plan.id)}
                  onUpdate={() => router.refresh()}
                />
              ))}

              <AddGenericLessonPlanCard
                onClick={() => setIsGenericDialogOpen(true)}
              />
            </div>
          </div>
        </>
      ) : (
        // Regular teacher view - show tabs
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as "my-plans" | "templates");
            // Update URL to preserve tab state
            const url = new URL(window.location.href);
            url.searchParams.set("tab", value);
            if (value === "templates" && templateGradeTab !== "all") {
              url.searchParams.set("grade", templateGradeTab);
            } else {
              url.searchParams.delete("grade");
            }
            window.history.replaceState({}, "", url.toString());
          }}
          className="lesson-plan-tabs"
        >
          <TabsList className="mb-6 bg-orange-100">
            <TabsTrigger
              value="my-plans"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              My Lesson Plans
            </TabsTrigger>
            <TabsTrigger
              value="templates"
              className="data-[state=active]:bg-orange-500 data-[state=active]:text-white"
            >
              Lesson Templates
            </TabsTrigger>
          </TabsList>

          {/* My Plans tab content */}
          <TabsContent value="my-plans">
            <div className="min-h-full bg-gray-50">
              <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 p-4 sm:p-6 bg-gray-50">
                {initialUserPlans.map((plan, index) => (
                  <LessonPlanCard
                    key={plan.id}
                    plan={plan}
                    backgroundColor={getColumnColor(index)}
                    isTemplate={false}
                    onDelete={() => handleDeleteUserPlan(plan.id)}
                    onUpdate={() => router.refresh()}
                  />
                ))}

                <AddAnything
                  title="Create a Lesson"
                  FormComponent={AddLessonPlanDialog}
                />
              </div>
            </div>
          </TabsContent>

          {/* Templates tab content for regular teachers */}
          <TabsContent value="templates">
            <TemplateGradeTabs
              activeGrade={templateGradeTab}
              onChange={(grade) => {
                setTemplateGradeTab(grade);
                // Update URL to preserve grade filter
                const url = new URL(window.location.href);
                url.searchParams.set("tab", "templates");
                if (grade !== "all") {
                  url.searchParams.set("grade", grade);
                } else {
                  url.searchParams.delete("grade");
                }
                window.history.replaceState({}, "", url.toString());
              }}
            />

            <div className="grid grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 p-4 sm:p-6 bg-gray-50">
              {filteredGenericPlans.map((plan, index) => (
                <TemplateLessonPlanCard
                  key={plan.id}
                  plan={plan}
                  backgroundColor={getColumnColor(index)}
                  isSuperUser={false}
                  onUpdate={() => router.refresh()}
                />
              ))}

              {filteredGenericPlans.length === 0 && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  No templates available for{" "}
                  {templateGradeTab === "all"
                    ? "any grade level"
                    : `grades ${templateGradeTab}`}
                  .
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog for creating/editing templates - only enabled for super users */}
      {isSuperUser && (
        <GenericLessonPlanDialog
          isOpen={isGenericDialogOpen || !!selectedGenericPlan}
          onClose={() => {
            setIsGenericDialogOpen(false);
            setSelectedGenericPlan(null);
          }}
          onSubmit={
            selectedGenericPlan
              ? (data) => handleUpdateGenericPlan(selectedGenericPlan.id, data)
              : handleCreateGenericPlan
          }
          initialData={selectedGenericPlan || undefined}
          showGradeSelect={true}
        />
      )}
    </main>
  );
}
