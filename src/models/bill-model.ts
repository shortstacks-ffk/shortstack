export interface Bill {
    id: string;
    title: string;
    amount: number;
    dueDate: Date;
    frequency: string;
    status: string;
    description?: string;
  }