'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/src/components/ui/table';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import { 
  getClassGradebook, 
  updateAssignmentGrade 
} from '@/src/app/actions/gradebookActions';
import { Loader2, Search, FileCheck, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface GradebookProps {
  classCode: string;
}

export default function Gradebook({ classCode }: GradebookProps) {
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{studentId: string, assignmentId: string} | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  
  useEffect(() => {
    const loadGradebookData = async () => {
      setLoading(true);
      try {
        const response = await getClassGradebook(classCode);
        if (response.success) {
          setStudents(response.data.students);
          setAssignments(response.data.assignments);
          setSubmissions(response.data.submissions);
        } else {
          toast.error(response.error || 'Error loading Gradebook data');
        }
      } catch (error) {
        console.error('Error fetching gradebook data:', error);
        toast.error('Could not load Gradebook');
      } finally {
        setLoading(false);
      }
    };

    loadGradebookData();
  }, [classCode]);

  // Rest of the helper functions remain the same...
  const filteredStudents = students.filter(student => 
    `${student.firstName} ${student.lastName}`.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getSubmission = (studentId: string, assignmentId: string) => {
    return submissions.find(sub => 
      sub.studentId === studentId && sub.assignmentId === assignmentId
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUBMITTED':
        return <Badge variant="outline" className="bg-yellow-50"><Clock className="w-3 h-3 mr-1" /> Pending</Badge>;
      case 'GRADED':
        return <Badge variant="outline" className="bg-green-50"><CheckCircle2 className="w-3 h-3 mr-1" /> Graded</Badge>;
      case 'RETURNED':
        return <Badge variant="outline" className="bg-blue-50"><FileCheck className="w-3 h-3 mr-1" /> Returned</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50"><AlertTriangle className="w-3 h-3 mr-1" /> Not Submitted</Badge>;
    }
  };

  const handleEditGrade = (studentId: string, assignmentId: string, currentGrade: number | null) => {
    setEditingCell({ studentId, assignmentId });
    setEditValue(currentGrade?.toString() || '');
  };

  const handleSaveGrade = async () => {
    // Same implementation as before...
    if (!editingCell) return;
    
    const { studentId, assignmentId } = editingCell;
    const gradeValue = parseInt(editValue);
    
    if (isNaN(gradeValue) || gradeValue < 0 || gradeValue > 100) {
      toast.error('Grade must be a number between 0 and 100');
      return;
    }
    
    try {
      const response = await updateAssignmentGrade(
        studentId, 
        assignmentId, 
        gradeValue
      );
      
      if (response.success) {
        // Update local state
        setSubmissions(prev => {
          const updatedSubmissions = [...prev];
          const submissionIndex = updatedSubmissions.findIndex(
            sub => sub.studentId === studentId && sub.assignmentId === assignmentId
          );
          
          if (submissionIndex >= 0) {
            // Update existing submission
            updatedSubmissions[submissionIndex] = {
              ...updatedSubmissions[submissionIndex],
              grade: gradeValue,
              status: 'GRADED'
            };
          } else {
            // Create new submission record if it doesn't exist
            updatedSubmissions.push({
              studentId,
              assignmentId,
              grade: gradeValue,
              status: 'GRADED',
              createdAt: new Date().toISOString()
            });
          }
          
          return updatedSubmissions;
        });
        
        toast.success('Grade updated successfully');
      } else {
        toast.error(response.error || 'Error updating grade');
      }
    } catch (error) {
      console.error('Error updating grade:', error);
      toast.error('Could not save grade');
    } finally {
      setEditingCell(null);
      setEditValue('');
    }
  };

  const calculateStudentAverage = (studentId: string) => {
    const studentSubmissions = submissions.filter(sub => 
      sub.studentId === studentId && sub.grade !== null
    );
    
    if (studentSubmissions.length === 0) return 'N/A';
    
    const total = studentSubmissions.reduce((sum, sub) => sum + sub.grade, 0);
    return Math.round(total / studentSubmissions.length);
  };

  const calculateAssignmentAverage = (assignmentId: string) => {
    const assignmentSubmissions = submissions.filter(sub => 
      sub.assignmentId === assignmentId && sub.grade !== null
    );
    
    if (assignmentSubmissions.length === 0) return 'N/A';
    
    const total = assignmentSubmissions.reduce((sum, sub) => sum + sub.grade, 0);
    return Math.round(total / assignmentSubmissions.length);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Updated return structure with flat UI
  return (
    <div className="w-full space-y-4">
      {/* Header section - replacing CardHeader */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-3">
        <h2 className="text-lg font-semibold">Gradebook</h2>
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search student..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Content section - replacing CardContent */}
      <Tabs defaultValue="grid" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>
        
        <TabsContent value="grid">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 bg-white">Student</TableHead>
                  {assignments.map(assignment => (
                    <TableHead key={assignment.id} className="text-center">
                      <div className="font-medium">{assignment.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(assignment.dueDate).toLocaleDateString()}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-center">Average</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStudents.length > 0 ? (
                  filteredStudents.map(student => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium sticky left-0 bg-white">
                        {student.firstName} {student.lastName}
                      </TableCell>
                      
                      {assignments.map(assignment => {
                        const submission = getSubmission(student.id, assignment.id);
                        const isEditing = editingCell?.studentId === student.id && 
                                         editingCell?.assignmentId === assignment.id;
                        
                        return (
                          <TableCell key={assignment.id} className="text-center">
                            {isEditing ? (
                              <div className="flex items-center space-x-2">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  className="w-16 text-center mx-auto"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveGrade();
                                    if (e.key === 'Escape') setEditingCell(null);
                                  }}
                                />
                                <Button 
                                  size="sm" 
                                  onClick={handleSaveGrade}
                                >
                                  Save
                                </Button>
                              </div>
                            ) : (
                              <div 
                                className="flex flex-col items-center cursor-pointer hover:bg-gray-50 py-1 rounded"
                                onClick={() => handleEditGrade(
                                  student.id, 
                                  assignment.id, 
                                  submission?.grade
                                )}
                              >
                                {submission ? (
                                  <>
                                    <div className="font-medium">
                                      {submission.grade !== null ? submission.grade : '—'}
                                    </div>
                                    <div className="mt-1">
                                      {getStatusBadge(submission.status)}
                                    </div>
                                  </>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            )}
                          </TableCell>
                        );
                      })}
                      
                      <TableCell className="text-center font-medium">
                        {calculateStudentAverage(student.id)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={assignments.length + 2} className="text-center py-8">
                      No students found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
        
        <TabsContent value="summary">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Student Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {students.map(student => (
                    <div key={student.id} className="flex justify-between items-center">
                      <span>{student.firstName} {student.lastName}</span>
                      <Badge variant={calculateStudentAverage(student.id) === 'N/A' ? 'outline' : 'default'}>
                        {calculateStudentAverage(student.id)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Assignment Averages</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {assignments.map(assignment => (
                    <div key={assignment.id} className="flex justify-between items-center">
                      <span>{assignment.name}</span>
                      <Badge variant={calculateAssignmentAverage(assignment.id) === 'N/A' ? 'outline' : 'default'}>
                        {calculateAssignmentAverage(assignment.id)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}