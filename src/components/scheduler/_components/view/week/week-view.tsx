import React, { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { Badge } from "@/src/components/ui/badge";
import { AnimatePresence, motion } from "framer-motion";
import { useModal } from "@/src/providers/scheduler/modal-context";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";
import EventStyled from "../event-component/event-styled";
import { Button } from "@/src/components/ui/button";
import { ArrowLeft, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { Event, CustomEventModal } from "@/src/types/scheduler/index";
import CustomModal from "@/src/components/ui/custom-modal";
import { isSameDay, format, startOfWeek, addDays } from "date-fns";

const hours = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${hour}:00 ${ampm}`;
});

interface ChipData {
  id: number;
  color: "primary" | "warning" | "danger";
  title: string;
  description: string;
}

const chipData: ChipData[] = [
  {
    id: 1,
    color: "primary",
    title: "Ads Campaign Nr1",
    description: "Day 1 of 5: Google Ads, Target Audience: SMB-Alpha",
  },
  {
    id: 2,
    color: "warning",
    title: "Ads Campaign Nr2",
    description:
      "All Day: Day 2 of 5: AdSense + FB, Target Audience: SMB2-Delta3",
  },
  {
    id: 3,
    color: "danger",
    title: "Critical Campaign Nr3",
    description: "Day 3 of 5: High-Impact Ads, Target: E-Commerce Gamma",
  },
  {
    id: 4,
    color: "primary",
    title: "Ads Campaign Nr4",
    description: "Day 4 of 5: FB Ads, Audience: Retailers-Zeta",
  },
  {
    id: 5,
    color: "warning",
    title: "Campaign Ending Soon",
    description: "Final Day: Monitor closely, Audience: Delta2-Beta",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 5 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.12 } },
};

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


const shouldShowRecurringEvent = (event: Event, date: Date) => {
  if (
    event.isRecurring &&
    Array.isArray(event.recurringDays) &&
    event.recurringDays.length > 0
  ) {
    return event.recurringDays.includes(date.getDay());
  }
  return isSameDay(event.startDate, date);
};

export default function WeeklyView({
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
  classNames?: { prev?: string; next?: string; addEvent?: string };
}) {
  const { getters, handlers } = useScheduler();
  const hoursColumnRef = useRef<HTMLDivElement>(null);
  const [detailedHour, setDetailedHour] = useState<string | null>(null);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);

  const [currentDate, setCurrentDate] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? 0 : -dayOfWeek;
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() + diff);
    return startOfCurrentWeek;
  });

  const [colWidth, setColWidth] = useState<number[]>(Array(7).fill(1));
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const [direction, setDirection] = useState<number>(0);
  const { setOpen } = useModal();
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0);
  const timeIndicatorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const daysOfWeek = useMemo(() => {
    const startDay = new Date(currentDate);
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startDay);
      day.setDate(startDay.getDate() + i);
      return day;
    });
  }, [currentDate]);

useEffect(() => {
  console.log("Current week days:", daysOfWeek.map(d => d.toDateString()));
  console.log("All available events:", getters.events);
  
  // Check each event's recurring properties
  getters.events?.forEach(event => {
    console.log(`Event: ${event.title}`);
    console.log(`- isRecurring: ${event.isRecurring}`);
    console.log(`- recurringDays: ${JSON.stringify(event.recurringDays)}`);
    console.log(`- startDate: ${event.startDate.toISOString()}`);
  });
  
  // Check if each day has any matching events
  daysOfWeek.forEach(day => {
    const dayOfWeek = day.getDay();
    const matchingEvents = getters.events?.filter(event => 
      event.isRecurring && 
      Array.isArray(event.recurringDays) && 
      event.recurringDays.includes(dayOfWeek)
    );
    
    if (matchingEvents?.length) {
      console.log(`Day ${day.toDateString()} (${dayOfWeek}) has recurring events:`, 
        matchingEvents.map(e => e.title));
    }
  });
}, [daysOfWeek, getters.events]);

  useEffect(() => {
    // Debug log to check all events
    const allEvents = getters.events || [];
    console.log("All available events:", allEvents);

    // Debug log for the current week's events
    const eventsThisWeek = daysOfWeek.flatMap((day) =>
      getters.getEventsForDay(
        day.getDate(),
        new Date(day.getFullYear(), day.getMonth(), 1)
      )
    );
    console.log("Events this week:", eventsThisWeek);
  }, [getters.events, daysOfWeek]);

  useEffect(() => {
    const updateCurrentTimePosition = () => {
      const now = new Date();
      setCurrentTime(now);

      const hourFraction = now.getHours() + now.getMinutes() / 60;
      const verticalPosition =
        (hourFraction / 24) * (hoursColumnRef.current?.offsetHeight || 0);
      setCurrentTimePosition(verticalPosition);
    };

    updateCurrentTimePosition();

    timeIndicatorIntervalRef.current = setInterval(
      updateCurrentTimePosition,
      60000
    );

    return () => {
      if (timeIndicatorIntervalRef.current) {
        clearInterval(timeIndicatorIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    console.log("getters object:", getters);
    console.log("Available EVENTS:", getters.events);
    console.log("handleEventStyling function:", handlers.handleEventStyling);

    // Check if any week day matches today's date
    const today = new Date();
    const todayMatches = daysOfWeek.some(
      (day) =>
        day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()
    );

    console.log("Week contains today:", todayMatches);
    console.log("Today:", today.toDateString());
    console.log("Week days:", daysOfWeek.map((d) => d.toDateString()));
  }, [getters, daysOfWeek]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!hoursColumnRef.current) return;
      const rect = hoursColumnRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourHeight = rect.height / 24;
      const hour = Math.max(0, Math.min(23, Math.floor(y / hourHeight)));
      const minuteFraction = (y % hourHeight) / hourHeight;
      const minutes = Math.floor(minuteFraction * 60);

      const hour12 = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      setDetailedHour(
        `${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`
      );

      const headerOffset = 83;
      const position = Math.max(0, Math.min(rect.height, Math.round(y))) + headerOffset;
      setTimelinePosition(position);
    },
    []
  );

  function handleAddEvent(event?: Event) {
    const startDate = event?.startDate || new Date();
    const endDate = event?.endDate || new Date();

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
          ...event,
          startDate,
          endDate,
        };
      }
    );
  }

  const handleNextWeek = useCallback(() => {
    setDirection(1);
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  }, [currentDate]);

  const handlePrevWeek = useCallback(() => {
    setDirection(-1);
    const prevWeek = new Date(currentDate);
    prevWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(prevWeek);
  }, [currentDate]);

  function handleAddEventWeek(dayIndex: number, detailedHour: string) {
    if (!detailedHour) {
      console.error("Detailed hour not provided.");
      return;
    }

    const [timePart, ampm] = detailedHour.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    let hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);

    if (ampm === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }

    const chosenDay = daysOfWeek[dayIndex % 7].getDate();

    if (chosenDay < 1 || chosenDay > 31) {
      console.error("Invalid day selected:", chosenDay);
      return;
    }

    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      chosenDay,
      hours,
      minutes
    );

    handleAddEvent({
      startDate: date,
      endDate: new Date(date.getTime() + 60 * 60 * 1000),
      title: "",
      id: "",
      variant: "primary",
    });
  }

  const groupEventsByTimePeriod = (events: Event[] | undefined) => {
    if (!events || events.length === 0) return [];

    const sortedEvents = [...events].sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );

    const eventsOverlap = (event1: Event, event2: Event) => {
      const start1 = new Date(event1.startDate).getTime();
      const end1 = new Date(event1.endDate).getTime();
      const start2 = new Date(event2.startDate).getTime();
      const end2 = new Date(event2.endDate).getTime();

      return start1 < end2 && start2 < end1;
    };

    const graph: Record<string, Set<string>> = {};

    for (const event of sortedEvents) {
      graph[event.id] = new Set<string>();
    }

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        if (eventsOverlap(sortedEvents[i], sortedEvents[j])) {
          graph[sortedEvents[i].id].add(sortedEvents[j].id);
          graph[sortedEvents[j].id].add(sortedEvents[i].id);
        }
      }
    }

    const visited = new Set<string>();
    const groups: Event[][] = [];

    for (const event of sortedEvents) {
      if (!visited.has(event.id)) {
        const group: Event[] = [];
        const stack: Event[] = [event];
        visited.add(event.id);

        while (stack.length > 0) {
          const current = stack.pop()!;
          group.push(current);

          for (const neighborId of Array.from(graph[current.id])) {
            if (!visited.has(neighborId)) {
              const neighbor = sortedEvents.find((e) => e.id === neighborId);
              if (neighbor) {
                stack.push(neighbor);
                visited.add(neighborId);
              }
            }
          }
        }

        group.sort(
          (a, b) =>
            new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
        );

        groups.push(group);
      }
    }

    return groups;
  };

  return (
    <div className="mina-scheduler-week-container flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="flex justify-between items-center mb-2">
          <div className="flex gap-2 pl-2">
            {prevButton ? (
              <div onClick={handlePrevWeek}>{prevButton}</div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className={classNames?.prev}
                onClick={handlePrevWeek}
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Prev
              </Button>
            )}
            {nextButton ? (
              <div onClick={handleNextWeek}>{nextButton}</div>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className={classNames?.next}
                onClick={handleNextWeek}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            )}
          </div>
        </div>

        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={currentDate.toISOString()}
            custom={direction}
            variants={pageTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              opacity: { duration: 0.2 },
            }}
            className="grid grid-cols-8 gap-0 week-view-grid pl-2 border-l border-gray-200"
          >
            <div className="sticky top-0 left-0 z-30 week-number-cell h-10 flex items-center justify-center">
              <span className="text-sm font-semibold tracking-tight text-center px-2">
                Week {getters.getWeekNumber(currentDate)}
              </span>
            </div>

            <div className="col-span-7 flex flex-col relative">
              <div
                className="grid gap-0 flex-grow bg-white rounded-tr-lg"
                style={{
                  gridTemplateColumns: colWidth.map((w) => `${w}fr`).join(" "),
                  transition: isResizing
                    ? "none"
                    : "grid-template-columns 0.3s ease-in-out",
                }}
              >
                {daysOfWeek.map((day, idx) => {
                  const isCurrentDay = isSameDay(day, new Date());
                  return (
                    <div key={idx} className="relative group flex flex-col">
                      <div
                        className={`sticky week-header-cell top-0 z-20 h-8 sm:h-10 flex items-center justify-center 
                        ${isCurrentDay ? "current-week-day-header" : ""}`}
                      >
                        <div className="text-center">
                          <div className="text-[10px] sm:text-xs font-medium text-gray-600 uppercase">
                            {getters.getDayName(day.getDay())}
                          </div>
                          <div
                            className={clsx(
                              "text-xs sm:text-sm font-semibold",
                              isCurrentDay ? "text-green-600" : "text-gray-700"
                            )}
                          >
                            {day.getDate()}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {detailedHour && (
                <div
                  className="absolute flex z-40 left-0 w-full h-[1px] bg-primary/40 pointer-events-none"
                  style={{ top: `${timelinePosition}px` }}
                >
                  <Badge
                    variant="outline"
                    className="absolute -translate-y-1/2 bg-white z-50 left-[5px] text-xs"
                  >
                    {detailedHour}
                  </Badge>
                </div>
              )}

              <div
                className="absolute left-0 right-0 z-50 pointer-events-none"
                style={{ top: `${currentTimePosition + 40}px` }}
              >
                <div className="current-time-indicator">
                  <div className="dot"></div>
                </div>
              </div>
            </div>

            <div
              ref={hoursColumnRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={() => setDetailedHour(null)}
              className="relative grid grid-cols-8 col-span-8"
            >
              <div className="col-span-1 bg-white transition duration-400">
                {hours.map((hour, index) => (
                  <motion.div
                    key={`hour-${index}`}
                    variants={itemVariants}
                    className="cursor-pointer border-b border-gray-200 p-1 sm:p-2 h-10 sm:h-12 md:h-[56px] text-center text-[10px] sm:text-xs text-muted-foreground border-r hour-label"
                  >
                    {hour}
                  </motion.div>
                ))}
              </div>

              {daysOfWeek.map((day, dayIndex) => {
                const isCurrentDay = isSameDay(day, new Date());
                const dayEvents = getters.getEventsForDay(day.getDate(), day);
                const filteredEvents = dayEvents.filter((ev) =>
                  shouldShowRecurringEvent(ev, day)
                );
                const timeGroups = groupEventsByTimePeriod(filteredEvents);

                return (
                  <div
                    key={`day-${dayIndex}`}
                    className={`col-span-1 relative z-20 transition duration-300 cursor-pointer border-r 
                  text-center text-xs text-muted-foreground overflow-hidden 
                  ${isCurrentDay ? "current-week-day-column" : ""}`}
                    onClick={() =>
                      handleAddEventWeek(dayIndex, detailedHour as string)
                    }
                  >
                    {/* 1) render the 24 hour slots first */}
                    {Array.from({ length: 24 }, (_, hourIndex) => (
                      <div
                        key={`day-${dayIndex}-hour-${hourIndex}`}
                        className={`h-[56px] relative week-view-hour-cell
                      ${isCurrentDay ? "current-week-day-hour" : ""}`}
                      >
                        <div className="absolute inset-0 z-10 flex items-center justify-center text-xs opacity-0 hover:opacity-100">
                          Add Event
                        </div>
                      </div>
                    ))}

                    {/* 2) then absolutely-position your events on top */}
                    <AnimatePresence initial={false}>
                      {filteredEvents.map((event) => {
                        let eventsInSamePeriod = 1;
                        let periodIndex = 0;
                        for (let i = 0; i < timeGroups.length; i++) {
                          const idx = timeGroups[i].findIndex(
                            (e) => e.id === event.id
                          );
                          if (idx !== -1) {
                            eventsInSamePeriod = timeGroups[i].length;
                            periodIndex = idx;
                            break;
                          }
                        }

                        const style = handlers.handleEventStyling(
                          event,
                          filteredEvents,
                          {
                            eventsInSamePeriod,
                            periodIndex,
                            adjustForPeriod: true,
                          }
                        );

                        return (
                          <motion.div
                            key={event.id}
                            style={{
                              height: style.height,
                              top: style.top,
                              left: style.left,
                              maxWidth: style.maxWidth,
                              minWidth: style.minWidth,
                              position: "absolute",
                              zIndex: style.zIndex + 20, // above the z-20 container
                            }}
                            className="event-container"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EventStyled
                              event={{
                                ...event,
                                CustomEventComponent,
                                minmized: true,
                              }}
                              CustomEventModal={CustomEventModal}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}


