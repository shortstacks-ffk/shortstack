"use client";

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export type TodoPriority = 'UPCOMING' | 'TODAY' | 'URGENT';

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  dueDate: Date | string;
  priority: TodoPriority;
  calendarEventId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
}

interface UseTodosOptions {
  filter?: 'all' | 'active' | 'completed';
  startDate?: Date;
  endDate?: Date;
}

export function useTodos(options: UseTodosOptions = {}) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Fetch todos
  const fetchTodos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const queryParams = new URLSearchParams();
      
      if (options.filter && options.filter !== 'all') {
        queryParams.set('filter', options.filter);
      }
      
      if (options.startDate) {
        queryParams.set('startDate', options.startDate.toISOString());
      }
      
      if (options.endDate) {
        queryParams.set('endDate', options.endDate.toISOString());
      }
      
      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : '';
      const response = await fetch(`/api/todos${queryString}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch todos');
      }
      
      const data = await response.json();
      setTodos(data);
    } catch (err) {
      console.error('Error fetching todos:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      toast.error('Failed to load tasks');
    } finally {
      setIsLoading(false);
    }
  }, [options.filter, options.startDate, options.endDate]);
  
  // Create a new todo
  const createTodo = async (todoData: {
    title: string;
    dueDate: Date | string;
    priority?: TodoPriority;
    createEvent?: boolean;
  }) => {
    try {
      setError(null);
      
      const response = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(todoData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create todo');
      }
      
      const data = await response.json();
      setTodos(prev => [data.todo, ...prev].sort((a, b) => 
        new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
      ));
      
      toast.success('Task created successfully');
      return data;
    } catch (err) {
      console.error('Error creating todo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to create task';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };
  
  // Update a todo
  const updateTodo = async (id: string, updates: {
    title?: string;
    completed?: boolean;
    dueDate?: Date | string;
    priority?: TodoPriority;
  }) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update todo');
      }
      
      const data = await response.json();
      
      setTodos(prev => prev.map(todo => 
        todo.id === id ? { ...todo, ...updates } : todo
      ));
      
      return data.todo;
    } catch (err) {
      console.error('Error updating todo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };
  
  // Delete a todo
  const deleteTodo = async (id: string) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/todos/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete todo');
      }
      
      setTodos(prev => prev.filter(todo => todo.id !== id));
      toast.success('Task deleted');
      
      return { success: true, id };
    } catch (err) {
      console.error('Error deleting todo:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete task';
      setError(errorMessage);
      toast.error(errorMessage);
      throw err;
    }
  };
  
  // Toggle todo completion
  const toggleTodoCompletion = async (id: string) => {
    const todo = todos.find(todo => todo.id === id);
    if (!todo) return;
    
    return updateTodo(id, { completed: !todo.completed });
  };
  
  // Load todos on initial render and when options change
  useEffect(() => {
    fetchTodos();
  }, [fetchTodos]);
  
  return {
    todos,
    isLoading,
    error,
    fetchTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleTodoCompletion,
  };
}