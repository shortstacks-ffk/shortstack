"use client";

import React, { useRef, useState, useCallback, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

import { ArrowLeft, ArrowRight } from "lucide-react";

import { useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { useModal } from "@/src/providers/scheduler/modal-context";
import AddEventModal from "@/src/components/scheduler/_modals/add-event-modal";
import EventStyled from "../event-component/event-styled";
import { CustomEventModal, Event } from "@/src/types/scheduler/index";
import { Button } from "@/src/components/ui/button";
import { Badge } from "@/src/components/ui/badge";
import CustomModal from "@/src/components/ui/custom-modal";

// Generate hours in 12-hour format
const hours = Array.from({ length: 24 }, (_, i) => {
  const hour = i % 12 || 12;
  const ampm = i < 12 ? "AM" : "PM";
  return `${hour}:00 ${ampm}`;
});

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Stagger effect between children
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
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    opacity: 0,
    transition: {
      opacity: { duration: 0.2, ease: "easeInOut" },
    },
  }),
};

// Precise time-based event grouping function
const groupEventsByTimePeriod = (events: Event[] | undefined) => {
  if (!events || events.length === 0) return [];
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  // Precise time overlap checking function
  const eventsOverlap = (event1: Event, event2: Event) => {
    const start1 = new Date(event1.startDate).getTime();
    const end1 = new Date(event1.endDate).getTime();
    const start2 = new Date(event2.startDate).getTime();
    const end2 = new Date(event2.endDate).getTime();
    
    // Strict time overlap - one event starts before the other ends
    return (start1 < end2 && start2 < end1);
  };
  
  // Use a graph-based approach to find connected components (overlapping event groups)
  const buildOverlapGraph = (events: Event[]) => {
    // Create adjacency list
    const graph: Record<string, string[]> = {};
    
    // Initialize graph
    events.forEach(event => {
      graph[event.id] = [];
    });
    
    // Build connections
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        if (eventsOverlap(events[i], events[j])) {
          graph[events[i].id].push(events[j].id);
          graph[events[j].id].push(events[i].id);
        }
      }
    }
    
    return graph;
  };
  
  // Find connected components using DFS
  const findConnectedComponents = (graph: Record<string, string[]>, events: Event[]) => {
    const visited: Record<string, boolean> = {};
    const components: Event[][] = [];
    
    // DFS function to traverse the graph
    const dfs = (nodeId: string, component: string[]) => {
      visited[nodeId] = true;
      component.push(nodeId);
      
      for (const neighbor of graph[nodeId]) {
        if (!visited[neighbor]) {
          dfs(neighbor, component);
        }
      }
    };
    
    // Find all connected components
    for (const event of events) {
      if (!visited[event.id]) {
        const component: string[] = [];
        dfs(event.id, component);
        
        // Map IDs back to events
        const eventGroup = component.map(id => 
          events.find(e => e.id === id)!
        );
        
        components.push(eventGroup);
      }
    }
    
    return components;
  };
  
  // Build the overlap graph
  const graph = buildOverlapGraph(sortedEvents);
  
  // Find connected components (groups of overlapping events)
  const timeGroups = findConnectedComponents(graph, sortedEvents);
  
  // Sort events within each group by start time
  return timeGroups.map(group => 
    group.sort((a, b) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    )
  );
};

export default function DailyView({
  prevButton,
  nextButton,
  CustomEventComponent,
  CustomEventModal,
  stopDayEventSummary,
  classNames,
}: {
  prevButton?: React.ReactNode;
  nextButton?: React.ReactNode;
  CustomEventComponent?: React.FC<Event>;
  CustomEventModal?: CustomEventModal;
  stopDayEventSummary?: boolean;
  classNames?: { prev?: string; next?: string; addEvent?: string };
}) {
  const hoursColumnRef = useRef<HTMLDivElement>(null);
  const [detailedHour, setDetailedHour] = useState<string | null>(null);
  const [timelinePosition, setTimelinePosition] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [direction, setDirection] = useState<number>(0);
  const { setOpen } = useModal();
  const { getters, handlers } = useScheduler();

  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  const [currentTimePosition, setCurrentTimePosition] = useState<number>(0);
  const timeIndicatorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const updateCurrentTimePosition = () => {
      const now = new Date();
      setCurrentTime(now);
      
      const hourFraction = now.getHours() + now.getMinutes() / 60;
      const verticalPosition = (hourFraction / 24) * (hoursColumnRef.current?.offsetHeight || 0);
      setCurrentTimePosition(verticalPosition);
    };

    updateCurrentTimePosition();
    timeIndicatorIntervalRef.current = setInterval(updateCurrentTimePosition, 60000);
    
    return () => {
      if (timeIndicatorIntervalRef.current) {
        clearInterval(timeIndicatorIntervalRef.current);
      }
    };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
      if (!hoursColumnRef.current) return;
      const rect = hoursColumnRef.current.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const hourHeight = rect.height / 24;
      const hour = Math.max(0, Math.min(23, Math.floor(y / hourHeight)));
      const minuteFraction = (y % hourHeight) / hourHeight;
      const minutes = Math.floor(minuteFraction * 60);

      // Format in 12-hour format
      const hour12 = hour % 12 || 12;
      const ampm = hour < 12 ? "AM" : "PM";
      setDetailedHour(
        `${hour12}:${Math.max(0, minutes).toString().padStart(2, "0")} ${ampm}`
      );

      // Ensure timelinePosition is never negative and is within bounds
      const position = Math.max(0, Math.min(rect.height, Math.round(y)));
      setTimelinePosition(position);
    },
    []
  );

  const getFormattedDayTitle = useCallback(
    () => currentDate.toDateString(),
    [currentDate]
  );

  const dayEvents = getters.getEventsForDay(
    currentDate?.getDate() || 0,
    currentDate
  );
  
  // Calculate time groups once for all events
  const timeGroups = groupEventsByTimePeriod(dayEvents);

  function handleAddEvent(event?: Event) {
    // Create the modal content with the provided event data or defaults
    const startDate = event?.startDate || new Date();
    const endDate = event?.endDate || new Date();

    // Open the modal with the content

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

  function handleAddEventDay(detailedHour: string) {
    if (!detailedHour) {
      console.error("Detailed hour not provided.");
      return;
    }

    // Parse the 12-hour format time
    const [timePart, ampm] = detailedHour.split(" ");
    const [hourStr, minuteStr] = timePart.split(":");
    let hours = parseInt(hourStr);
    const minutes = parseInt(minuteStr);

    // Convert to 24-hour format for Date object
    if (ampm === "PM" && hours < 12) {
      hours += 12;
    } else if (ampm === "AM" && hours === 12) {
      hours = 0;
    }

    const chosenDay = currentDate.getDate();

    // Ensure day is valid
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
      endDate: new Date(date.getTime() + 60 * 60 * 1000), // 1-hour duration
      title: "",
      id: "",
      variant: "primary",
    });
  }

  const handleNextDay = useCallback(() => {
    setDirection(1);
    const nextDay = new Date(currentDate);
    nextDay.setDate(currentDate.getDate() + 1);
    setCurrentDate(nextDay);
  }, [currentDate]);

  const handlePrevDay = useCallback(() => {
    setDirection(-1);
    const prevDay = new Date(currentDate);
    prevDay.setDate(currentDate.getDate() - 1);
    setCurrentDate(prevDay);
  }, [currentDate]);

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="mina-scheduler-day-container flex flex-col">
      <div className="flex-1 overflow-auto">
        <div className="">
          <div className="flex justify-between gap-2 flex-wrap mb-3">
            {/* More compact header */}
            <h1 className="text-2xl font-semibold mb-2 pl-2">
              {getFormattedDayTitle()}
            </h1>

            <div className="flex ml-auto gap-2">
              {prevButton ? (
                <div onClick={handlePrevDay}>{prevButton}</div>
              ) : (
                <Button
                  size="sm"
                  variant={"outline"}
                  className={classNames?.prev}
                  onClick={handlePrevDay}
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Prev
                </Button>
              )}
              {nextButton ? (
                <div onClick={handleNextDay}>{nextButton}</div>
              ) : (
                <Button
                  size="sm"
                  variant={"outline"}
                  className={classNames?.next}
                  onClick={handleNextDay}
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
                x: { type: "spring", stiffness: 300, damping: 30 },
                opacity: { duration: 0.2 },
              }}
              className="flex flex-col gap-3 pl-2"
            >
              {!stopDayEventSummary && (
                <div className="all-day-events">
                  <AnimatePresence initial={false}>
                    {dayEvents && dayEvents?.length
                      ? dayEvents?.map((event, eventIndex) => {
                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              className="mb-1"
                            >
                              <EventStyled
                                event={{
                                  ...event,
                                  CustomEventComponent,
                                  minmized: false,
                                }}
                                CustomEventModal={CustomEventModal}
                              />
                            </motion.div>
                          );
                        })
                      : "No events for today"}
                  </AnimatePresence>
                </div>
              )}

              <div className="relative rounded-md bg-default-50 hover:bg-default-100 transition duration-400">
                <motion.div
                  className="relative rounded-xl flex ease-in-out"
                  ref={hoursColumnRef}
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  onMouseMove={handleMouseMove}
                  onMouseLeave={() => setDetailedHour(null)}
                >
                  <div className="flex flex-col">
                    {hours.map((hour, index) => (
                      <motion.div
                        key={`hour-${index}`}
                        variants={itemVariants}
                        className="cursor-pointer transition duration-300 p-2 h-[56px] text-left text-xs text-muted-foreground border-default-200"
                      >
                        {hour}
                      </motion.div>
                    ))}
                  </div>
                  <div className="flex relative flex-grow flex-col">
                    {/* 1) 24h background rows */}
                    {Array.from({ length: 24 }).map((_, hourIndex) => (
                      <div
                        key={`hour-${hourIndex}`}
                        className="h-[56px] relative cursor-pointer border-b border-default-200"
                        onClick={() => handleAddEventDay(detailedHour!)}
                      >
                        <div className="absolute inset-0 flex items-center justify-center text-xs opacity-0 hover:opacity-100">
                          Add Event
                        </div>
                      </div>
                    ))}

                    {/* 2) absolutely-position events on top */}
                    <AnimatePresence initial={false}>
                      {dayEvents?.map((event) => {
                        // overlap logic same as before...
                        let eventsInSamePeriod = 1, periodIndex = 0;
                        for (let i = 0; i < timeGroups.length; i++) {
                          const idx = timeGroups[i].findIndex((e) => e.id === event.id);
                          if (idx !== -1) {
                            eventsInSamePeriod = timeGroups[i].length;
                            periodIndex = idx;
                            break;
                          }
                        }

                        const style = handlers.handleEventStyling(event, dayEvents, {
                          eventsInSamePeriod,
                          periodIndex,
                          adjustForPeriod: true,
                        });

                        return (
                          <motion.div
                            key={event.id}
                            style={{
                              position: "absolute",
                              top: style.top,
                              height: style.height,
                              left: style.left,
                              maxWidth: style.maxWidth,
                              minWidth: style.minWidth,
                              zIndex: style.zIndex + 10,
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <EventStyled
                              event={{ ...event, CustomEventComponent, minmized: true }}
                              CustomEventModal={CustomEventModal}
                            />
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>

                {/* Maintaining hover functionality */}
                {detailedHour && (
                  <div
                    className="absolute left-[40px] w-[calc(100%-43px)] h-[2px] bg-primary/40 rounded-full pointer-events-none"
                    style={{ top: `${timelinePosition}px` }}
                  >
                    <Badge
                      variant="outline"
                      className="absolute -translate-y-1/2 bg-white z-50 left-[-20px] text-xs"
                    >
                      {detailedHour}
                    </Badge>
                  </div>
                )}

                {isToday(currentDate) && (
                  <div
                    className="absolute left-0 right-0 z-50 pointer-events-none"
                    style={{ top: `${currentTimePosition}px` }}
                  >
                    <div className="current-time-indicator">
                      <div className="dot"></div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
