export interface Course {
  id: string;
  name: string;
  facultyId: string;
  studentCount: number;
  quizCount: number;
}

export interface Faculty {
  id: string;
  name: string;
  courses: string[];
}

export interface Student {
  id: string;
  name: string;
  email: string;
  courseIds: string[];
}

export interface DashboardStats {
  totalCourses: number;
  totalQuizzes: number;
  totalStudents: number;
}

// Mock Data
export const mockFaculties: Faculty[] = [
  { id: '1', name: 'Dr. John Smith', courses: ['1', '2'] },
  { id: '2', name: 'Prof. Sarah Johnson', courses: ['3', '4'] },
  { id: '3', name: 'Dr. Michael Brown', courses: ['5'] },
  { id: '4', name: 'Prof. Emily Davis', courses: ['6', '7'] },
  { id: '5', name: 'Dr. Robert Wilson', courses: ['8'] },
];

export const mockCourses: Course[] = [
  { id: '1', name: 'Mathematics', facultyId: '1', studentCount: 45, quizCount: 8 },
  { id: '2', name: 'Physics', facultyId: '1', studentCount: 38, quizCount: 6 },
  { id: '3', name: 'Chemistry', facultyId: '2', studentCount: 42, quizCount: 7 },
  { id: '4', name: 'Biology', facultyId: '2', studentCount: 35, quizCount: 5 },
  { id: '5', name: 'Computer Science', facultyId: '3', studentCount: 52, quizCount: 12 },
  { id: '6', name: 'English Literature', facultyId: '4', studentCount: 28, quizCount: 4 },
  { id: '7', name: 'History', facultyId: '4', studentCount: 31, quizCount: 6 },
  { id: '8', name: 'Economics', facultyId: '5', studentCount: 39, quizCount: 8 },
];

export const mockStudents: Student[] = [
  { id: '1', name: 'Alice Johnson', email: 'alice@example.com', courseIds: ['1', '5'] },
  { id: '2', name: 'Bob Smith', email: 'bob@example.com', courseIds: ['2', '3'] },
  { id: '3', name: 'Charlie Brown', email: 'charlie@example.com', courseIds: ['1', '4'] },
  { id: '4', name: 'Diana Wilson', email: 'diana@example.com', courseIds: ['5', '6'] },
  { id: '5', name: 'Eva Davis', email: 'eva@example.com', courseIds: ['3', '7'] },
  // Add more students to reach realistic numbers
  ...Array.from({ length: 195 }, (_, i) => ({
    id: `${i + 6}`,
    name: `Student ${i + 6}`,
    email: `student${i + 6}@example.com`,
    courseIds: [mockCourses[Math.floor(Math.random() * mockCourses.length)].id],
  })),
];

export const dashboardStats: DashboardStats = {
  totalCourses: mockCourses.length,
  totalQuizzes: mockCourses.reduce((sum, course) => sum + course.quizCount, 0),
  totalStudents: mockStudents.length,
};

// Chart data
export const studentsPerCourseData = mockCourses.map(course => ({
  course: course.name,
  students: course.studentCount,
}));

export const quizzesPerCourseData = mockCourses.map(course => ({
  name: course.name,
  value: course.quizCount,
}));
