"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Checkbox } from "@/src/components/ui/checkbox";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { format } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight, Clock, Plus, X } from "lucide-react";
import { TodoPriority, useTodos } from "@/src/hooks/useTodos";
import { toast } from "sonner";
import { DatePicker } from "@/src/components/ui/date-picker";
import { TimePicker } from "@/src/components/ui/time-picker";
import { SchedulerProvider, useScheduler } from "@/src/providers/scheduler/schedular-provider";
import { HEADER_HEIGHT } from "@/src/lib/constants/header_height";

const TodoSidebarInner = () => {
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [priority, setPriority] = useState<TodoPriority>("UPCOMING");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [createAsEvent, setCreateAsEvent] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const { refreshEvents } = useScheduler();

  const {
    todos,
    isLoading,
    error,
    createTodo,
    toggleTodoCompletion,
    deleteTodo,
    fetchTodos
  } = useTodos({ filter });

  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);

  const resetForm = () => {
    setNewTodoTitle("");
    setSelectedDate(new Date());
    setPriority("UPCOMING");
  };

  const handleAddTodo = async () => {
    if (newTodoTitle.trim() === "") return;

    try {
      // Create a proper date without timezone issues
      const newTodo = await createTodo({
        title: newTodoTitle,
        dueDate: selectedDate, // Use the selectedDate directly
        priority,
        createEvent: createAsEvent
      });
      
      // Always refresh events to ensure calendar updates immediately
      await refreshEvents();
      
      resetForm();
      setDialogOpen(false);
      
    } catch (error) {
      console.error("Error adding todo:", error);
      toast.error("Failed to create task");
    }
  };

  const handleDeleteTodo = async (id: string) => {
    await deleteTodo(id);
    // Always refresh calendar regardless of event status
    await refreshEvents();
  };

  const handleToggleCompletion = async (id: string) => {
    await toggleTodoCompletion(id);
  };

  const groupedTodos: Record<string, typeof todos> = {};

todos.forEach(todo => {
  // Create a date that's normalized to avoid timezone issues
  const dueDate = new Date(todo.dueDate);
  // Format the date in a timezone-safe way
  const dateKey = format(dueDate, "yyyy-MM-dd");
  
  if (!groupedTodos[dateKey]) {
    groupedTodos[dateKey] = [];
  }
  groupedTodos[dateKey].push(todo);
});

  const sortedDateKeys = Object.keys(groupedTodos).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });
  
  // Get priority indicator properties
  const getPriorityProps = (priority: TodoPriority) => {
    switch (priority) {
      case "UPCOMING":
        return { color: "bg-green-500", textColor: "text-green-600" };
      case "TODAY":
        return { color: "bg-blue-500", textColor: "text-blue-600" };
      case "URGENT":
        return { color: "bg-red-500", textColor: "text-red-600" };
      default:
        return { color: "bg-gray-500", textColor: "text-gray-600" };
    }
  };

  // Update height to account for header and ensure it reaches the bottom
  const sidebarHeight = `calc(100vh - ${HEADER_HEIGHT}px)`;

  if (!isExpanded) {
    return (
      <div 
        className={`p-2 bg-[#f2fbf4] rounded-lg flex flex-col justify-between cursor-pointer`}
        onClick={() => setIsExpanded(true)}
        style={{ height: sidebarHeight }}
      >
        <div></div> {/* Empty div for spacing */}
        <div className="flex justify-center mb-4 mt-4">
          <ChevronLeft />
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={sidebarRef}
      className={`flex flex-col p-4 bg-[#f2fbf4] rounded-lg relative w-80 overflow-hidden`}
      style={{ height: sidebarHeight }}
    >
      {/* Add task button that triggers form display */}
      <Button 
        ref={buttonRef}
        className="w-full cursor-pointer bg-orange-500 hover:bg-orange-600 text-white"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="h-4 w-4 mr-2" /> Add Task
      </Button>
      
      {/* Form overlay with absolute positioning */}
      {dialogOpen && (
        <div 
          className="absolute inset-0 z-50 bg-black/30 p-2"
          onClick={() => setDialogOpen(false)}
        >
          {/* Task form - centered card */}
          <div 
            className="bg-white rounded-md shadow-lg p-4 mt-16 mx-auto max-w-[300px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium">New Task</h3>
              <button 
                className="rounded-full p-1 hover:bg-gray-100"
                onClick={() => setDialogOpen(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <Input
                autoFocus
                value={newTodoTitle}
                onChange={(e) => setNewTodoTitle(e.target.value)}
                placeholder="Enter task title..."
                className="bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTodo();
                }}
              />
              
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="due-date">Due Date</Label>
                  <div className="relative">
                    <Input
                      id="due-date"
                      type="date"
                      value={format(selectedDate, 'yyyy-MM-dd')}
                      onChange={(e) => {
                        if (e.target.value) {
                          // Preserve the time when changing the date
                          const dateParts = e.target.value.split('-').map(Number);
                          const newDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);
                          
                          // Transfer time from the existing selectedDate
                          newDate.setHours(
                            selectedDate.getHours(),
                            selectedDate.getMinutes(),
                            selectedDate.getSeconds(),
                            selectedDate.getMilliseconds()
                          );
                          
                          setSelectedDate(newDate);
                        }
                      }}
                      className="bg-white pl-1 pr-2 text-center cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                      onClick={(e) => {
                        // This ensures clicking anywhere on the input opens the date picker
                        (e.target as HTMLInputElement).showPicker();
                      }}
                    />
                    <Calendar 
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Due Time</Label>
                  <TimePicker 
                    value={selectedDate} 
                    onChange={setSelectedDate} 
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="add-to-calendar-dialog"
                  checked={createAsEvent}
                  onCheckedChange={(checked) => setCreateAsEvent(checked === true)}
                />
                <Label htmlFor="add-to-calendar-dialog">Add to calendar</Label>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div 
                  className={`flex items-center justify-center gap-1 p-2 rounded-md cursor-pointer border ${
                    priority === "UPCOMING" ? "border-green-500 bg-green-100" : "border-gray-200"
                  }`}
                  onClick={() => setPriority("UPCOMING")}
                >
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-xs text-green-600">Upcoming</span>
                </div>
                
                <div 
                  className={`flex items-center justify-center gap-1 p-2 rounded-md cursor-pointer border ${
                    priority === "TODAY" ? "border-blue-500 bg-blue-50" : "border-gray-200"
                  }`}
                  onClick={() => setPriority("TODAY")}
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-xs text-blue-600">Due Today</span>
                </div>
                
                <div 
                  className={`flex items-center justify-center gap-1 p-2 rounded-md cursor-pointer border ${
                    priority === "URGENT" ? "border-red-500 bg-red-50" : "border-gray-200"
                  }`}
                  onClick={() => setPriority("URGENT")}
                >
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-xs text-red-600">Urgent</span>
                </div>
              </div>

              <Button 
                className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
                onClick={handleAddTodo}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Added spacer to push content down */}
      <div className="mb-4"></div>
      {/* Filter tabs */}
      <div className="flex border rounded-md overflow-hidden mt-4">
        <button
          className={`flex-1 py-1.5 text-xs font-medium ${filter === "all" ? "bg-orange-500 text-white" : "bg-muted/30"}`}
          onClick={() => setFilter("all")}
        >
          All
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-medium ${filter === "active" ? "bg-orange-500 text-white" : "bg-muted/30"}`}
          onClick={() => setFilter("active")}
        >
          Active
        </button>
        <button
          className={`flex-1 py-1.5 text-xs font-medium ${filter === "completed" ? "bg-orange-500 text-white" : "bg-muted/30"}`}
          onClick={() => setFilter("completed")}
        >
          Done
        </button>
      </div>

      {/* Task list with more top margin */}
      <div className="mt-4 flex-grow overflow-y-auto pr-1">
        <div className="space-y-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading tasks...</div>
          ) : sortedDateKeys.length > 0 ? (
            sortedDateKeys.map(dateKey => {
              const todosForDate = groupedTodos[dateKey];
              
              // Parse the date in a way that preserves the date components
              const [year, month, day] = dateKey.split('-').map(Number);
              const dateObj = new Date(year, month - 1, day);
              
              return (
                <div key={dateKey} className="space-y-2">
                  <h3 className="font-medium text-xs text-foreground/70 mb-1">
                    {format(dateObj, "EEEE, MMM d")}
                  </h3>
                  <div className="space-y-2">
                    {todosForDate.map((todo) => {
                      const priorityProps = getPriorityProps(todo.priority);
                      
                      return (
                        <div 
                          key={todo.id} 
                          className="flex items-center gap-1 py-1 px-2 rounded-md border bg-white relative"
                        >
                          {/* Priority indicator */}
                          <div 
                            className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-md ${priorityProps.color}`} 
                          />
                          
                          <Checkbox 
                            checked={todo.completed}
                            onCheckedChange={() => handleToggleCompletion(todo.id)}
                            className="h-3.5 w-3.5"
                          />
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1 flex-wrap">
                              <p className={`text-xs truncate ${todo.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {todo.title}
                              </p>
                              <span className={`text-[10px] ${priorityProps.textColor} font-medium ml-auto`}>
                                {format(new Date(todo.dueDate), "h:mm a")}
                              </span>
                            </div>
                          </div>
                          
                          <Button 
                            size="sm"
                            variant="ghost"
                            className="h-5 w-5 p-0 ml-1"
                            onClick={() => handleDeleteTodo(todo.id)}
                          >
                            <X className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-8 text-muted-foreground">No tasks found</div>
          )}
        </div>
      </div>
      
      {/* Collapse button at bottom left */}
      <div 
        className="bottom-4 mb-2 mt-2 cursor-pointer p-2"
        onClick={() => setIsExpanded(false)}
      >
        <ChevronRight />
      </div>
    </div>
  );
};

// Wrap the inner component with the provider
export function TodoSidebar() {
  return (
    <SchedulerProvider>
      <TodoSidebarInner />
    </SchedulerProvider>
  );
}