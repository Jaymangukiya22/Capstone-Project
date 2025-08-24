import { useState } from 'react';
import { X } from 'lucide-react';
import { mockFaculties, mockCourses } from '../data/mockData';

interface AddModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AddModal = ({ isOpen, onClose }: AddModalProps) => {
  const [activeForm, setActiveForm] = useState<'course' | 'faculty' | null>(null);
  const [courseName, setCourseName] = useState('');
  const [facultyName, setFacultyName] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeForm === 'course') {
      console.log('Adding course:', { courseName, facultyId: selectedFaculty });
      // Here you would typically add the course to your state/database
    } else if (activeForm === 'faculty') {
      console.log('Adding faculty:', { facultyName, courseId: selectedCourse });
      // Here you would typically add the faculty to your state/database
    }
    
    // Reset form
    setCourseName('');
    setFacultyName('');
    setSelectedFaculty('');
    setSelectedCourse('');
    setActiveForm(null);
    onClose();
  };

  const resetAndClose = () => {
    setActiveForm(null);
    setCourseName('');
    setFacultyName('');
    setSelectedFaculty('');
    setSelectedCourse('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-96 max-w-md mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {activeForm ? `Add ${activeForm === 'course' ? 'Course' : 'Faculty'}` : 'Add New'}
          </h2>
          <button
            onClick={resetAndClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        {!activeForm ? (
          <div className="space-y-4">
            <button
              onClick={() => setActiveForm('course')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg transition-colors"
            >
              Add Course
            </button>
            <button
              onClick={() => setActiveForm('faculty')}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded-lg transition-colors"
            >
              Add Faculty
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {activeForm === 'course' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Name
                  </label>
                  <input
                    type="text"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter course name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Faculty Name
                  </label>
                  <select
                    value={selectedFaculty}
                    onChange={(e) => setSelectedFaculty(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select Faculty</option>
                    {mockFaculties.map((faculty) => (
                      <option key={faculty.id} value={faculty.id}>
                        {faculty.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Faculty Name
                  </label>
                  <input
                    type="text"
                    value={facultyName}
                    onChange={(e) => setFacultyName(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    placeholder="Enter faculty name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Course Name
                  </label>
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Select Course</option>
                    {mockCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
            
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setActiveForm(null)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors"
              >
                Add {activeForm === 'course' ? 'Course' : 'Faculty'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AddModal;
