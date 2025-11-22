import { BookOpen, Calendar, CreditCard, Award, Clock, TrendingUp, FileText, Download } from 'lucide-react';

export default function StudentDashboard() {
  const stats = [
    {
      label: 'Current CGPA',
      value: '3.85',
      subtitle: 'Out of 4.0',
      icon: Award,
      color: 'bg-blue-500'
    },
    {
      label: 'Enrolled Courses',
      value: '8',
      subtitle: 'This semester',
      icon: BookOpen,
      color: 'bg-purple-500'
    },
    {
      label: 'Attendance',
      value: '94%',
      subtitle: 'Overall',
      icon: Calendar,
      color: 'bg-green-500'
    },
    {
      label: 'Pending Fees',
      value: '₦0',
      subtitle: 'All cleared',
      icon: CreditCard,
      color: 'bg-orange-500'
    }
  ];

  const upcomingClasses = [
    { course: 'Clinical Chemistry', time: 'Today, 10:00 AM', room: 'Lab 204', instructor: 'Dr. Adebayo' },
    { course: 'Medical Microbiology', time: 'Today, 2:00 PM', room: 'Lab 301', instructor: 'Dr. Okafor' },
    { course: 'Hematology', time: 'Tomorrow, 9:00 AM', room: 'Lab 205', instructor: 'Prof. Chiamaka' },
  ];

  const recentAnnouncements = [
    { title: 'Semester Examination Schedule Released', date: '2 hours ago', priority: 'high' },
    { title: 'Library Operating Hours Extended', date: '1 day ago', priority: 'normal' },
    { title: 'Student Council Elections Coming Soon', date: '3 days ago', priority: 'normal' },
  ];

  const courseProgress = [
    { name: 'Clinical Chemistry', progress: 85, grade: 'A' },
    { name: 'Medical Microbiology', progress: 78, grade: 'B+' },
    { name: 'Hematology', progress: 92, grade: 'A+' },
    { name: 'Parasitology', progress: 88, grade: 'A' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-purple-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-2">Welcome back, Student!</h2>
          <p className="text-blue-100 mb-6">You're doing great this semester. Keep up the excellent work!</p>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-2.5 bg-white text-blue-600 rounded-lg font-semibold hover:bg-blue-50 transition-colors">
              View Timetable
            </button>
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors">
              Check Results
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-blue-200 hover:shadow-xl transition-all">
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
        {/* Upcoming Classes */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-600" />
              Upcoming Classes
            </h3>
            <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {upcomingClasses.map((class_, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-100 hover:border-blue-200 transition-colors">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-gray-900 mb-1">{class_.course}</h4>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {class_.time}
                    </span>
                    <span>Room: {class_.room}</span>
                    <span>{class_.instructor}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Announcements */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Announcements
          </h3>
          <div className="space-y-4">
            {recentAnnouncements.map((announcement, index) => (
              <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-2">
                  {announcement.priority === 'high' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded">
                      Important
                    </span>
                  )}
                </div>
                <h4 className="font-semibold text-gray-900 text-sm mb-1">{announcement.title}</h4>
                <p className="text-xs text-gray-500">{announcement.date}</p>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
            View All Announcements
          </button>
        </div>
      </div>

      {/* Course Progress */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Course Progress
          </h3>
          <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">View Details</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {courseProgress.map((course, index) => (
            <div key={index} className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-900">{course.name}</span>
                <span className="text-xs font-bold text-blue-600">{course.grade}</span>
              </div>
              <div className="relative w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${course.progress}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{course.progress}% Complete</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl text-left transition-all hover:shadow-lg border border-blue-200">
            <Download className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Download Materials</p>
            <p className="text-xs text-gray-600 mt-1">Course resources</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl text-left transition-all hover:shadow-lg border border-purple-200">
            <CreditCard className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Make Payment</p>
            <p className="text-xs text-gray-600 mt-1">Tuition & fees</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl text-left transition-all hover:shadow-lg border border-green-200">
            <FileText className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">View Results</p>
            <p className="text-xs text-gray-600 mt-1">Exam scores</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl text-left transition-all hover:shadow-lg border border-orange-200">
            <Calendar className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Class Schedule</p>
            <p className="text-xs text-gray-600 mt-1">Weekly timetable</p>
          </button>
        </div>
      </div>
    </div>
  );
}