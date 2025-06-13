"use client";

import { useState } from "react";
import { Button } from "@/src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/src/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Input } from "@/src/components/ui/input";
import { Textarea } from "@/src/components/ui/textarea";
import { toast } from "@/src/hooks/use-toast";
import { Upload, FileText, LinkIcon, Loader2, X, CheckCircle } from "lucide-react";
import { submitAssignment } from "@/src/app/actions/assignmentActions";
import { useRouter } from "next/navigation";

interface AssignmentSubmitDialogProps {
  children: React.ReactNode;
  assignment: any;
}

const AssignmentSubmitDialog = ({ children, assignment }: AssignmentSubmitDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTab, setCurrentTab] = useState("computer-upload");
  const [googleDocUrl, setGoogleDocUrl] = useState("");
  const [textEntry, setTextEntry] = useState("");
  const [uploadProgress, setUploadProgress] = useState(false);
  const [uploadError, setUploadError] = useState<string>("");
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setUploadError("");
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setUploadError("");
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!isSubmitting) {
      setIsOpen(open);
      // Reset form when closing the dialog
      if (!open) {
        setSelectedFile(null);
        setComment("");
        setTextEntry("");
        setGoogleDocUrl("");
        setCurrentTab("computer-upload");
        setUploadError("");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setUploadError("");
    
    try {
      // Create a FormData object to send the file
      const formData = new FormData();
      formData.append('assignmentId', assignment.id);
      
      let fileUrl = '';
      
      if (currentTab === 'computer-upload' && selectedFile) {
        // Validate file size (50MB limit)
        if (selectedFile.size > 50 * 1024 * 1024) {
          throw new Error('File size must be less than 50MB');
        }
        
        // First upload the file to our API
        setUploadProgress(true);
        
        const uploadFormData = new FormData();
        uploadFormData.append('file', selectedFile);
        uploadFormData.append('assignmentId', assignment.id);
        
        const uploadResponse = await fetch('/api/student/assignment/upload', {
          method: 'POST',
          body: uploadFormData
        });
        
        if (!uploadResponse.ok) {
          const errorData = await uploadResponse.json();
          throw new Error(errorData.error || 'File upload failed');
        }
        
        const uploadResult = await uploadResponse.json();
        setUploadProgress(false);
        
        if (uploadResult.success) {
          fileUrl = uploadResult.fileUrl;
          formData.append('fileUrl', fileUrl);
          formData.append('fileName', uploadResult.fileName);
          formData.append('fileType', uploadResult.fileType);
          formData.append('fileSize', uploadResult.size.toString());
        } else {
          throw new Error(uploadResult.error || 'File upload failed');
        }
      } else if (currentTab === 'text-entry') {
        formData.append('textContent', textEntry);
      } else if (currentTab === 'google-file') {
        // Validate Google Drive URL
        if (!googleDocUrl.includes('drive.google.com') && !googleDocUrl.includes('docs.google.com')) {
          throw new Error('Please enter a valid Google Drive or Google Docs URL');
        }
        formData.append('fileUrl', googleDocUrl);
        formData.append('fileName', 'Google Drive Link');
        formData.append('fileType', 'url/google-drive');
      }
      
      formData.append('comments', comment);
      
      // Call the server action to submit the assignment
      const response = await submitAssignment(formData);
      
      if (response.success) {
        toast({
          title: "Assignment submitted successfully!",
          description: "Your assignment has been uploaded and is ready for review.",
        });
        
        setIsOpen(false);
        setSelectedFile(null);
        setComment("");
        setTextEntry("");
        setGoogleDocUrl("");
        
        // Refresh the page to show the new submission
        router.refresh();
      } else {
        throw new Error(response.error || "Failed to submit assignment");
      }
    } catch (error: any) {
      console.error('Assignment submission error:', error);
      setUploadError(error.message);
      toast({
        title: "Submission failed",
        description: error.message || "There was an error submitting your assignment. Please try again.",
        variant: "destructive",
      });
      setUploadProgress(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled = isSubmitting || 
    (currentTab === "computer-upload" && !selectedFile) ||
    (currentTab === "text-entry" && !textEntry.trim()) ||
    (currentTab === "google-file" && !googleDocUrl.trim());

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Submit Assignment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Assignment Info */}
          <div className="p-4 bg-gray-50 rounded-lg border">
            <h3 className="font-medium text-lg text-gray-900">{assignment.name}</h3>
            {assignment.activity && (
              <p className="text-sm text-gray-600 mt-1">{assignment.activity}</p>
            )}
            {assignment.dueDate && (
              <p className="text-sm mt-2 flex items-center gap-1.5 text-gray-700">
                <span className="font-medium">Due:</span> 
                {new Date(assignment.dueDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            )}
          </div>

          {/* Error Display */}
          {uploadError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <X className="h-4 w-4 text-red-500" />
              <span className="text-sm text-red-700">{uploadError}</span>
            </div>
          )}

          <Tabs defaultValue="computer-upload" value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="computer-upload" className="text-sm">
                <Upload className="h-4 w-4 mr-2" />
                File Upload
              </TabsTrigger>
              <TabsTrigger value="text-entry" className="text-sm">
                <FileText className="h-4 w-4 mr-2" />
                Text Entry
              </TabsTrigger>
              <TabsTrigger value="google-file" className="text-sm">
                <LinkIcon className="h-4 w-4 mr-2" />
                Google Drive
              </TabsTrigger>
            </TabsList>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <TabsContent value="computer-upload" className="space-y-4">
                <div 
                  className={`border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center text-center transition-colors ${
                    selectedFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                >
                  {!selectedFile ? (
                    <>
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                        <Upload className="h-8 w-8 text-blue-500" />
                      </div>
                      <h4 className="text-lg font-medium text-gray-900 mb-2">Upload your file</h4>
                      <p className="text-sm text-gray-500 mb-4">Drag and drop your file here, or click to browse</p>
                      <label className="cursor-pointer">
                        <Input 
                          type="file" 
                          className="hidden" 
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.ppt,.pptx,.xls,.xlsx"
                        />
                        <div className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors">
                          Choose File
                        </div>
                      </label>
                      <p className="text-xs text-gray-400 mt-3">Max file size: 50MB</p>
                    </>
                  ) : (
                    <div className="w-full">
                      <div className="flex items-center gap-4 p-4 border border-green-200 rounded-lg bg-white">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                          <p className="text-xs text-gray-500">
                            {formatFileSize(selectedFile.size)} • {selectedFile.type || 'Unknown type'}
                          </p>
                        </div>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm" 
                          onClick={() => setSelectedFile(null)}
                          disabled={isSubmitting}
                        >
                          Change
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="text-entry" className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Response
                  </label>
                  <Textarea 
                    placeholder="Type your assignment response here..."
                    className="min-h-[250px] resize-none"
                    value={textEntry}
                    onChange={(e) => setTextEntry(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {textEntry.length} characters
                  </p>
                </div>
              </TabsContent>
              
              <TabsContent value="google-file" className="space-y-4">
                <div className="p-6 border rounded-lg bg-blue-50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <LinkIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Link to Google Document</h4>
                      <p className="text-xs text-gray-600">Share a link to your Google Drive file</p>
                    </div>
                  </div>
                  <Input 
                    placeholder="https://drive.google.com/..." 
                    className="mb-3"
                    value={googleDocUrl}
                    onChange={(e) => setGoogleDocUrl(e.target.value)}
                    disabled={isSubmitting}
                  />
                  <div className="text-xs text-blue-700 bg-blue-100 p-3 rounded border">
                    <strong>Important:</strong> Make sure your Google Doc is set to "Anyone with the link can view" 
                    so your teacher can access it.
                  </div>
                </div>
              </TabsContent>
              
              {/* Comments Section */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Comments (Optional)
                </label>
                <Textarea 
                  placeholder="Add any comments about your submission..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="h-20 resize-none"
                  disabled={isSubmitting}
                />
              </div>
              
              {/* Submit Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="min-w-[120px]"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 
                      {uploadProgress ? 'Uploading...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Submit
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AssignmentSubmitDialog;