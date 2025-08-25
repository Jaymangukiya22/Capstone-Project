import { mockCourses, mockFaculties, mockStudents } from '../data/mockData';

interface ContentViewsProps {
  activeTab: string;
  searchQuery: string;
}

const ContentViews = ({ activeTab, searchQuery }: ContentViewsProps) => {
  const renderCoursesView = () => {
    const filteredCourses = mockCourses.filter(course =>
      course.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mockFaculties.find(f => f.id === course.facultyId)?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white mb-6">Courses</h2>
        <div className="grid gap-4">
          {filteredCourses.map((course) => {
          const faculty = mockFaculties.find(f => f.id === course.facultyId);
          return (
            <div key={course.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{course.name}</h3>
                  <p className="text-gray-400 mt-1">Faculty: {faculty?.name}</p>
                  <div className="flex space-x-4 mt-3">
                    <span className="text-sm text-blue-400">{course.studentCount} Students</span>
                    <span className="text-sm text-green-400">{course.quizCount} Quizzes</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  const renderFacultiesView = () => {
    const filteredFaculties = mockFaculties.filter(faculty =>
      faculty.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Faculties</h2>
      <div className="grid gap-4">
        {filteredFaculties.map((faculty) => {
          const facultyCourses = mockCourses.filter(c => c.facultyId === faculty.id);
          return (
            <div key={faculty.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{faculty.name}</h3>
                  <p className="text-gray-400 mt-1">
                    Courses: {facultyCourses.map(c => c.name).join(', ')}
                  </p>
                  <div className="flex space-x-4 mt-3">
                    <span className="text-sm text-blue-400">{facultyCourses.length} Courses</span>
                    <span className="text-sm text-green-400">
                      {facultyCourses.reduce((sum, c) => sum + c.studentCount, 0)} Total Students
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
    );
  };

  const renderStudentsView = () => {
    const filteredStudents = mockStudents.filter(student =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold text-white mb-6">Students</h2>
      <div className="grid gap-4">
        {filteredStudents.slice(0, 20).map((student) => {
          const studentCourses = mockCourses.filter(c => student.courseIds.includes(c.id));
          return (
            <div key={student.id} className="bg-gray-800 rounded-lg p-6 border border-gray-700">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-semibold text-white">{student.name}</h3>
                  <p className="text-gray-400 mt-1">{student.email}</p>
                  <p className="text-sm text-blue-400 mt-2">
                    Enrolled in: {studentCourses.map(c => c.name).join(', ')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
        {filteredStudents.length > 20 && (
          <div className="text-center py-4">
            <p className="text-gray-400">
              Showing 20 of {filteredStudents.length} students
            </p>
          </div>
        )}
      </div>
    </div>
    );
  };

  switch (activeTab) {
    case 'courses':
      return renderCoursesView();
    case 'faculties':
      return renderFacultiesView();
    case 'students':
      return renderStudentsView();
    default:
      return null;
  }
};

export default ContentViews;
