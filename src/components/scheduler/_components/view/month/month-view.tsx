"use client";

import React, { useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/src/components/ui/button";
import { Card } from "@/src/components/ui/card";
import { Badge } from "@/src/components/ui/badge";
import { ArrowLeft, ArrowRight } from "lucide-react";
import clsx from "clsx";

import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { useModal } from "@/src/providers/scheduler/modal-context";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";
import ShowMoreEventsModal from "@/src/components/scheduler/_modals/show-more-events-modal";
import EventStyled from "../event-component/event-styled";
import { Event, CustomEventModal } from "@/src/types/scheduler/index";
import CustomModal from "@/src/components/ui/custom-modal";

const pageTransitionVariants = {
  enter: (direction: number) => ({
    opacity: 0,
  }),
  center: {
    opacity: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    transition: {
      opacity: { duration: 0.2, ease: "easeInOut" },
    },
  }),
};

export default function MonthView({
  prevButton,
  nextButton,
  CustomEventComponent,
  CustomEventModal,
  classNames,
}: {
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
  CustomEventComponent?: React.FC<Event>;
  CustomEventModal?: CustomEventModal;
  classNames?: { prev?: string; next?: string; addEvent?: string; todayCell?: string };
}) {
  const { getters, weekStartsOn } = useScheduler();
  const { setOpen } = useModal();

  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [direction, setDirection] = useState<number>(0);

  const daysInMonth = getters.getDaysInMonth(
    currentDate.getMonth(),
    currentDate.getFullYear()
  );

  const handlePrevMonth = useCallback(() => {
    setDirection(-1);
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - 1,
      1
    );
    setCurrentDate(newDate);
  }, [currentDate]);

  const handleNextMonth = useCallback(() => {
    setDirection(1);
    const newDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
    setCurrentDate(newDate);
  }, [currentDate]);

  function handleAddEvent(selectedDay: number) {
    const startDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDay,
      0,
      0,
      0
    );

    const endDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      selectedDay,
      23,
      59,
      59
    );

    setOpen(
      <CustomModal title="Add Event">
        <AddEventModal
          CustomAddEventModal={
            CustomEventModal?.CustomAddEventModal?.CustomForm
          }
        />
      </CustomModal>,
      async () => {
        return {
          startDate,
          endDate,
          title: "",
          id: "",
          variant: "primary",
        };
      }
    );
  }

  function handleShowMoreEvents(dayEvents: Event[], date: Date) {
    setOpen(
      <CustomModal title={date.toDateString()}>
        <ShowMoreEventsModal />
      </CustomModal>,
      async () => ({ dayEvents, date })
    );
  }


  const containerVariants = {
    enter: { opacity: 0 },
    center: {
      opacity: 1,
      transition: {
        staggerChildren: 0.02,
      },
    },
    exit: { opacity: 0 },
  };

  const itemVariants = {
    enter: { opacity: 0, y: 20 },
    center: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  const daysOfWeek =
    weekStartsOn === "monday"
      ? ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
      : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const firstDayOfMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    1
  );

  const startOffset =
    (firstDayOfMonth.getDay() - (weekStartsOn === "monday" ? 1 : 0) + 7) % 7;

  const prevMonth = new Date(
    currentDate.getFullYear(),
    currentDate.getMonth() - 1,
    1
  );
  const lastDateOfPrevMonth = new Date(
    prevMonth.getFullYear(),
    prevMonth.getMonth() + 1,
    0
  ).getDate();

  const isSameDay = (day: number, date: Date) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="p-2">
      <div className="flex flex-col mb-2">
        <motion.h2
          key={currentDate.getMonth()}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="text-lg font-bold my-1"
        >
          {currentDate.toLocaleString("default", { month: "long" })}{" "}
          {currentDate.getFullYear()}
        </motion.h2>
        <div className="flex gap-2 mb-1">
          {prevButton ? (
            <div onClick={handlePrevMonth}>{prevButton}</div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={classNames?.prev}
              onClick={handlePrevMonth}
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              Prev
            </Button>
          )}
          {nextButton ? (
            <div onClick={handleNextMonth}>{nextButton}</div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className={classNames?.next}
              onClick={handleNextMonth}
            >
              Next
              <ArrowRight className="h-3 w-3 ml-1" />
            </Button>
          )}
        </div>
      </div>

      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
          custom={direction}
          variants={{
            ...pageTransitionVariants,
            center: {
              ...pageTransitionVariants.center,
              transition: {
                opacity: { duration: 0.2 },
                staggerChildren: 0.02,
              },
            },
          }}
          initial="enter"
          animate="center"
          exit="exit"
          className="month-grid grid grid-cols-7 gap-px text-center"
        >
          {/* Day names header row */}
          {daysOfWeek.map((day, idx) => (
            <div
              key={idx}
              className="text-center py-1 text-xs font-medium bg-gray-50"
            >
              {day}
            </div>
          ))}

          {/* Previous month's days */}
          {Array.from({ length: startOffset }).map((_, idx) => (
            <div key={`offset-${idx}`} className="month-day-cell opacity-50 bg-gray-50">
              <div className="text-sm font-medium text-muted-foreground">
                {lastDateOfPrevMonth - startOffset + idx + 1}
              </div>
            </div>
          ))}

          {/* Current month's days */}
          {daysInMonth.map((dayObj) => {
            const dayEvents = getters.getEventsForDay(dayObj.day, currentDate);
            const isCurrentDay = isSameDay(dayObj.day, currentDate);
            const thisDate = new Date(
              currentDate.getFullYear(),
              currentDate.getMonth(),
              dayObj.day
            );

            return (
              <motion.div
                className={clsx(
                  "month-day-cell",
                  isCurrentDay && "current-day"
                )}
                key={dayObj.day}
                variants={itemVariants}
                onClick={() => handleAddEvent(dayObj.day)}
              >
                <div
                  className={clsx(
                    "text-xs sm:text-sm font-medium mb-1",
                    dayEvents.length > 0 ? "text-primary-600" : "text-gray-700",
                    new Date().getDate() === dayObj.day &&
                      new Date().getMonth() === currentDate.getMonth() &&
                      new Date().getFullYear() === currentDate.getFullYear()
                      ? "text-secondary-500"
                      : ""
                  )}
                >
                  {dayObj.day}
                </div>
                
                <div className="flex-grow flex flex-col gap-1">
                  <AnimatePresence mode="wait">
                    {dayEvents?.length > 0 && (
                      <motion.div
                        key={dayEvents[0].id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <EventStyled
                          event={{
                            ...dayEvents[0],
                            CustomEventComponent,
                            minmized: true,
                          }}
                          CustomEventModal={CustomEventModal}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  {dayEvents.length > 1 && (
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        handleShowMoreEvents(dayEvents, thisDate);
                      }}
                      className="text-xs bg-gray-100 hover:bg-gray-200 rounded px-1 py-0.5 text-center cursor-pointer"
                    >
                      {`+${dayEvents.length - 1} more`}
                    </div>
                  )}
                </div>

                {dayEvents.length === 0 && (
                  <div className="absolute inset-0 bg-primary/5 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                    <span className="text-xs font-medium">Add Event</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
