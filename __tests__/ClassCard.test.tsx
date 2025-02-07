import { render, screen, fireEvent } from '@testing-library/react';
import { ClassCard } from '@/src/components/ClassCard';
import { deleteClass } from '@/src/app/actions/classActions';

jest.mock('@/src/app/actions/classActions');

describe('ClassCard', () => {
  const mockProps = {
    id: '1',
    emoji: '📚',
    name: 'Test Class',
    code: 'ABC123',
    colorClass: 'bg-blue-100',
    numberOfStudents: 20,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders class information correctly', () => {
    render(<ClassCard {...mockProps} />);

    expect(screen.getByText('Test Class')).toBeInTheDocument();
    expect(screen.getByText('📚')).toBeInTheDocument();
    expect(screen.getByText('Code: ABC123')).toBeInTheDocument();
    expect(screen.getByText('Capacity: 20 students')).toBeInTheDocument();
  });

  it('handles delete action', async () => {
    window.confirm = jest.fn(() => true);
    (deleteClass as jest.Mock).mockResolvedValue({ success: true });

    render(<ClassCard {...mockProps} />);
    
    const deleteButton = screen.getByText('Delete');
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalled();
    expect(deleteClass).toHaveBeenCalledWith('1');
  });
}); 