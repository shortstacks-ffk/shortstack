"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/src/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Calendar as CalendarIcon, CalendarDaysIcon } from "lucide-react";
import { BsCalendarMonth, BsCalendarWeek } from "react-icons/bs";

import AddEventModal from "../../_modals/add-event-modal";
import DailyView from "./day/daily-view";
import MonthView from "./month/month-view";
import WeeklyView from "./week/week-view";
import { useModal } from "@/src/providers/scheduler/modal-context";
import { ClassNames, CustomComponents, Views } from "@/types/scheduler/index";
import { cn } from "@/src/lib/utils";
import CustomModal from "@/src/components/ui/custom-modal";

export default function SchedulerViewFilteration({
  views = {
    views: ["day", "week", "month"],
    mobileViews: ["day"],
  },
  stopDayEventSummary = false,
  CustomComponents,
  classNames,
}: {
  views?: Views;
  stopDayEventSummary?: boolean;
  CustomComponents?: CustomComponents;
  classNames?: ClassNames;
}) {
  const { setOpen } = useModal();
  const [activeView, setActiveView] = useState<string>("day");
  const [clientSide, setClientSide] = useState(false);

  useEffect(() => {
    setClientSide(true);
  }, []);

  const [isMobile, setIsMobile] = useState(
    clientSide ? window.innerWidth <= 768 : false
  );

  useEffect(() => {
    if (!clientSide) return;
    setIsMobile(window.innerWidth <= 768);
    function handleResize() {
      if (window && window.innerWidth <= 768) {
        setIsMobile(true);
      } else {
        setIsMobile(false);
      }
    }

    window && window.addEventListener("resize", handleResize);

    return () => window && window.removeEventListener("resize", handleResize);
  }, [clientSide]);

  function handleAddEvent(selectedDay?: number) {
    const startDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      selectedDay ?? new Date().getDate(),
      0,
      0,
      0,
      0
    );

    const endDate = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      selectedDay ?? new Date().getDate(),
      23,
      59,
      59,
      999
    );

    const ModalWrapper = () => {
      const title =
        CustomComponents?.CustomEventModal?.CustomAddEventModal?.title ||
        "Add Event";

      return (
        <div>
          <h2 className="text-xl font-semibold mb-4">{title}</h2>
        </div>
      );
    };

    setOpen(
      <CustomModal title="Add Event">
        <AddEventModal
          CustomAddEventModal={
            CustomComponents?.CustomEventModal?.CustomAddEventModal?.CustomForm
          }
        />{" "}
      </CustomModal>
    );
  }

  const viewsSelector = isMobile ? views?.mobileViews : views?.views;

  useEffect(() => {
    if (viewsSelector?.length) {
      setActiveView(viewsSelector[0]);
    }
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      {clientSide && (
        <Tabs
          value={activeView}
          onValueChange={setActiveView}
          className={cn("w-full h-full flex flex-col", classNames?.tabs?.wrapper)}
        >
          <div className="flex justify-between items-center mb-2 px-3 py-1">
            <TabsList className={cn("grid grid-cols-3", classNames?.tabs?.tabList)}>
              {viewsSelector?.includes("day") && (
                <TabsTrigger value="day" className={classNames?.tabs?.tab}>
                  {CustomComponents?.customTabs?.CustomDayTab ? (
                    CustomComponents.customTabs.CustomDayTab
                  ) : (
                    <div className="flex items-center space-x-1">
                      <CalendarDaysIcon size={12} />
                      <span className="text-xs">Day</span>
                    </div>
                  )}
                </TabsTrigger>
              )}

              {viewsSelector?.includes("week") && (
                <TabsTrigger value="week" className={classNames?.tabs?.tab}>
                  {CustomComponents?.customTabs?.CustomWeekTab ? (
                    CustomComponents.customTabs.CustomWeekTab
                  ) : (
                    <div className="flex items-center space-x-1">
                      <BsCalendarWeek size={12} />
                      <span className="text-xs">Week</span>
                    </div>
                  )}
                </TabsTrigger>
              )}

              {viewsSelector?.includes("month") && (
                <TabsTrigger value="month" className={classNames?.tabs?.tab}>
                  {CustomComponents?.customTabs?.CustomMonthTab ? (
                    CustomComponents.customTabs.CustomMonthTab
                  ) : (
                    <div className="flex items-center space-x-1">
                      <BsCalendarMonth size={12} />
                      <span className="text-xs">Month</span>
                    </div>
                  )}
                </TabsTrigger>
              )}
            </TabsList>

            {CustomComponents?.customButtons?.CustomAddEventButton ? (
              <div onClick={() => handleAddEvent()}>
                {CustomComponents.customButtons.CustomAddEventButton}
              </div>
            ) : (
              <Button
                onClick={() => handleAddEvent()}
                size="sm"
                className={classNames?.buttons?.addEvent}
              >
                <CalendarIcon className="mr-1.5 h-3.5 w-3.5" />
                <span className="text-xs">Add Event</span>
              </Button>
            )}
          </div>

          {viewsSelector?.includes("day") && (
            <TabsContent
              value="day"
              className={cn("flex-1 overflow-auto", classNames?.tabs?.panel)}
            >
              <DailyView
                stopDayEventSummary={stopDayEventSummary}
                classNames={classNames?.buttons}
                prevButton={CustomComponents?.customButtons?.CustomPrevButton}
                nextButton={CustomComponents?.customButtons?.CustomNextButton}
                CustomEventComponent={CustomComponents?.CustomEventComponent}
                CustomEventModal={CustomComponents?.CustomEventModal}
              />
            </TabsContent>
          )}

          {viewsSelector?.includes("week") && (
            <TabsContent
              value="week"
              className={cn("flex-1 overflow-auto", classNames?.tabs?.panel)}
            >
              <WeeklyView
                classNames={classNames?.buttons}
                prevButton={CustomComponents?.customButtons?.CustomPrevButton}
                nextButton={CustomComponents?.customButtons?.CustomNextButton}
                CustomEventComponent={CustomComponents?.CustomEventComponent}
                CustomEventModal={CustomComponents?.CustomEventModal}
              />
            </TabsContent>
          )}

          {viewsSelector?.includes("month") && (
            <TabsContent
              value="month"
              className={cn("flex-1 overflow-auto", classNames?.tabs?.panel)}
            >
              <MonthView
                classNames={classNames?.buttons}
                prevButton={CustomComponents?.customButtons?.CustomPrevButton}
                nextButton={CustomComponents?.customButtons?.CustomNextButton}
                CustomEventComponent={CustomComponents?.CustomEventComponent}
                CustomEventModal={CustomComponents?.CustomEventModal}
              />
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}
