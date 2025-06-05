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
  // For events with recurring days array
  if (
    event.isRecurring &&
    Array.isArray(event.recurringDays) &&
    event.recurringDays.length > 0
  ) {
    return event.recurringDays.includes(date.getDay());
  }
  
  // For non-recurring events, just check if it's on the same date
  const eventDate = new Date(event.startDate);
  return (
    eventDate.getFullYear() === date.getFullYear() &&
    eventDate.getMonth() === date.getMonth() &&
    eventDate.getDate() === date.getDate()
  );
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

  useEffect(() => {
  // Create a more aggressive style override for week view events
  const style = document.createElement('style');
  style.id = 'week-view-event-fix';
  style.innerHTML = `
    /* Force events to be visible regardless of z-index stacking contexts */
    .mina-scheduler-week-container .event-container {
      background-color: #EBF5FF !important;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2) !important;
      display: block !important;
      visibility: visible !important;
      opacity: 1 !important;
      overflow: visible !important;
      z-index: 1000 !important;
      pointer-events: auto !important;
      position: absolute !important;
      min-height: 20px !important;
      transform: translateZ(0) !important;
    }

    /* Fix container positioning and overflow */
    .mina-scheduler-week-container .col-span-1 {
      position: relative !important;
      overflow: visible !important;
    }

    /* Make text in event containers visible */
    .mina-scheduler-week-container .event-container * {
      visibility: visible !important;
      opacity: 1 !important;
      color: #1a1a1a !important;
    }

    /* Add borders for visibility */
    .mina-scheduler-week-container .event-container {
      border-radius: 4px !important;
    }
    
    /* Add strong contrast for debugging */
    .mina-scheduler-week-container .AnimatePresence > * {
      outline: 2px dashed red !important;
    }
  `;
  document.head.appendChild(style);
  
  return () => {
    const existingStyle = document.getElementById('week-view-event-fix');
    if (existingStyle) {
      existingStyle.remove();
    }
  };
}, []);

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
                
                // 1. Create a more explicit date object for the current day
                const specificDay = new Date(day.getFullYear(), day.getMonth(), day.getDate());
                
                // 2. Debug log the date we're looking for
                console.log(`Looking for events on: ${specificDay.toDateString()}`);
                
                // 3. Get events for this specific day - using the first day of the month
                const monthDate = new Date(day.getFullYear(), day.getMonth(), 1);
                const dayEvents = getters.getEventsForDay(day.getDate(), monthDate);
                
                // 4. Debug log what we found
                console.log(`Found ${dayEvents?.length || 0} events for ${day.toDateString()}`);
                
                // 5. Add direct debugging of each event's dates
                if (dayEvents?.length) {
                  dayEvents.forEach(evt => {
                    const eventStart = new Date(evt.startDate);
                    console.log(`Event: ${evt.title} - Start: ${eventStart.toDateString()}`);
                  });
                }
                
                // Calculate time groups for events on this day
                const timeGroups = groupEventsByTimePeriod(dayEvents);
                
                // Log time groups for debugging
                console.log(`Time groups for ${day.toDateString()}:`, timeGroups.length);
                
                return (
                  <div
                    key={`day-${dayIndex}`}
                    className={`col-span-1 relative transition duration-300 cursor-pointer border-r 
                  text-center text-xs text-muted-foreground overflow-visible h-[1344px] 
                  ${isCurrentDay ? "current-week-day-column" : ""}`} // Changed overflow-hidden to overflow-visible and added explicit height
                    style={{
                      position: "relative",
                      zIndex: 1,
                      minHeight: "1344px", // 24 hours * 56px
                      height: "1344px",
                      display: "block",
                      overflow: "visible",
                    }}
                    onClick={() => handleAddEventWeek(dayIndex, detailedHour as string)}
                  >
                    {/* Hour slots */}
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

                    {/* Events */}
                    <AnimatePresence initial={false}>
                      {dayEvents && dayEvents.length > 0 && dayEvents.map((event) => {
                        console.log(`Rendering event: ${event.title} (${event.id})`);
                        
                        // Find the time group this event belongs to
                        let eventsInSamePeriod = 1;
                        let periodIndex = 0;
                        
                        for (let i = 0; i < timeGroups.length; i++) {
                          const idx = timeGroups[i].findIndex(e => e.id === event.id);
                          if (idx !== -1) {
                            eventsInSamePeriod = timeGroups[i].length;
                            periodIndex = idx;
                            break;
                          }
                        }

                        // Get styling for this event with more explicit debug
                        console.log(`Styling event ${event.title}:`, {
                          eventsInSamePeriod,
                          periodIndex
                        });
                        
                        try {
                          const style = handlers.handleEventStyling(event, dayEvents, {
                            eventsInSamePeriod,
                            periodIndex,
                            adjustForPeriod: true,
                          });
                          
                          // Override the top position with a direct calculation
                          const startHour = new Date(event.startDate).getHours();
                          const startMinute = new Date(event.startDate).getMinutes();
                          const topPosition = (startHour * 56) + (startMinute / 60 * 56);

                          console.log(`Event ${event.title} corrected position: ${topPosition}px (was ${style.top})`);

                          return (
                            <motion.div
                              key={event.id}
                              style={{
                                height: style.height,
                                top: `${topPosition}px`,  // Use our direct calculation
                                left: style.left,
                                maxWidth: style.maxWidth,
                                minWidth: style.minWidth,
                                position: "absolute", 
                                zIndex: 10,
                                // backgroundColor: "rgba(59, 130, 246, 0.2)",
                                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.2)",
                                borderRadius: "2px",
                                overflow: "visible",
                                display: "block",
                                width: "100%",
                                // transform: "translateZ(0)", // Force GPU rendering
                              }}
                              className="event-container"
                              onClick={(e) => e.stopPropagation()}
                              // Add explicit animation properties
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              transition={{ duration: 0.2 }}
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
                        } catch (error) {
                          console.error("Error rendering event:", error);
                          return null;
                        }
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


