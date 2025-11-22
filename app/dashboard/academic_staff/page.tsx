import { BookOpen, Users, ClipboardCheck, TrendingUp, Calendar, FileText, Award, Clock } from 'lucide-react';

export default function AcademicStaffDashboard() {
  const stats = [
    {
      label: 'My Courses',
      value: '6',
      subtitle: 'Active this semester',
      icon: BookOpen,
      color: 'bg-purple-500'
    },
    {
      label: 'Total Students',
      value: '248',
      subtitle: 'Across all courses',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Pending Grades',
      value: '32',
      subtitle: 'Awaiting submission',
      icon: ClipboardCheck,
      color: 'bg-orange-500'
    },
    {
      label: 'Attendance Rate',
      value: '92%',
      subtitle: 'Overall average',
      icon: TrendingUp,
      color: 'bg-green-500'
    }
  ];

  const todaySchedule = [
    { course: 'Clinical Chemistry II', time: '9:00 AM - 11:00 AM', room: 'Lab 204', students: 42 },
    { course: 'Medical Biochemistry', time: '2:00 PM - 4:00 PM', room: 'Lecture Hall 3', students: 65 },
    { course: 'Research Methodology', time: '4:30 PM - 6:00 PM', room: 'Room 105', students: 38 },
  ];

  const recentSubmissions = [
    { student: 'Chidi Okonkwo', assignment: 'Lab Report - Week 5', course: 'Clinical Chemistry II', time: '2 hours ago', status: 'pending' },
    { student: 'Fatima Ibrahim', assignment: 'Case Study Analysis', course: 'Medical Biochemistry', time: '5 hours ago', status: 'pending' },
    { student: 'Daniel Eze', assignment: 'Research Proposal', course: 'Research Methodology', time: '1 day ago', status: 'graded' },
    { student: 'Blessing Adeyemi', assignment: 'Mid-term Essay', course: 'Clinical Chemistry II', time: '2 days ago', status: 'graded' },
  ];

  const myCourses = [
    { name: 'Clinical Chemistry II', students: 42, completion: 68, nextClass: 'Today, 9:00 AM' },
    { name: 'Medical Biochemistry', students: 65, completion: 72, nextClass: 'Today, 2:00 PM' },
    { name: 'Research Methodology', students: 38, completion: 55, nextClass: 'Today, 4:30 PM' },
    { name: 'Advanced Hematology', students: 28, completion: 80, nextClass: 'Tomorrow, 10:00 AM' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-2">Good Morning, Dr. Adebayo!</h2>
          <p className="text-purple-100 mb-6">You have 3 classes scheduled for today. Let's make it productive!</p>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-2.5 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors">
              View Schedule
            </button>
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors">
              Grade Submissions
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-200 hover:shadow-xl transition-all">
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm font-medium text-gray-900">{stat.label}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.subtitle}</p>
            </div>
          );
        })}
      </div>

      {/* Main Content Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Today's Schedule
            </h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">View Week</button>
          </div>
          <div className="space-y-4">
            {todaySchedule.map((class_, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">{class_.course}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span>{class_.time}</span>
                    <span>Room: {class_.room}</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" />
                      {class_.students} students
                    </span>
                  </div>
                </div>
                <button className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  Start Class
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Submissions */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-purple-600" />
            Recent Submissions
          </h3>
          <div className="space-y-4">
            {recentSubmissions.map((submission, index) => (
              <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 text-sm">{submission.student}</h4>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                    submission.status === 'pending' 
                      ? 'bg-orange-100 text-orange-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {submission.status === 'pending' ? 'Review' : 'Graded'}
                  </span>
                </div>
                <p className="text-xs text-gray-900 mb-1">{submission.assignment}</p>
                <p className="text-xs text-gray-500">{submission.course} • {submission.time}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors">
            View All Submissions
          </button>
        </div>
      </div>

      {/* My Courses */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" />
            My Courses
          </h3>
          <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">Manage All</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {myCourses.map((course, index) => (
            <div key={index} className="group p-5 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border border-purple-100 hover:border-purple-200 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <Award className="w-8 h-8 text-purple-600" />
                <span className="text-xs font-bold text-purple-600">{course.students} students</span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm">{course.name}</h4>
              <div className="space-y-2">
                <div className="relative w-full h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"
                    style={{ width: `${course.completion}%` }}
                  />
                </div>
                <p className="text-xs text-gray-600">{course.completion}% Complete</p>
                <p className="text-xs text-purple-600 font-medium">{course.nextClass}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl text-left transition-all hover:shadow-lg border border-purple-200">
            <ClipboardCheck className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Grade Assignments</p>
            <p className="text-xs text-gray-600 mt-1">32 pending</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl text-left transition-all hover:shadow-lg border border-blue-200">
            <Users className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">View Students</p>
            <p className="text-xs text-gray-600 mt-1">Manage records</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl text-left transition-all hover:shadow-lg border border-green-200">
            <FileText className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Upload Materials</p>
            <p className="text-xs text-gray-600 mt-1">Course resources</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl text-left transition-all hover:shadow-lg border border-orange-200">
            <Calendar className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Attendance</p>
            <p className="text-xs text-gray-600 mt-1">Mark present/absent</p>
          </button>
        </div>
      </div>
    </div>
  );
}