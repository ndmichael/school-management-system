import { BookOpen, ClipboardCheck, Calendar, Clock, Users } from 'lucide-react';
import Link from "next/link";


export default function AcademicStaffDashboard() {
  // Keep these as placeholders for now; next step we’ll wire them to real queries
  const stats = [
    {
      label: 'Assigned Courses',
      value: '—',
      subtitle: 'This semester',
      icon: BookOpen,
      color: 'bg-purple-500',
    },
    {
      label: 'Students (Eligible)',
      value: '—',
      subtitle: 'Across assigned courses',
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      label: 'Pending Grades',
      value: '—',
      subtitle: 'Not submitted yet',
      icon: ClipboardCheck,
      color: 'bg-orange-500',
    },
  ];

  // Replace with real schedule later: course_offering_staff → course_offerings → courses/sessions
  const todaySchedule = [
    { course: 'Clinical Chemistry II', time: '9:00 AM - 11:00 AM', room: 'Lab 204', students: 42 },
    { course: 'Medical Biochemistry', time: '2:00 PM - 4:00 PM', room: 'Lecture Hall 3', students: 65 },
    { course: 'Research Methodology', time: '4:30 PM - 6:00 PM', room: 'Room 105', students: 38 },
  ];

  // Replace with real “grade submission queue” later (assigned offerings + results completeness)
  const gradeQueue = [
    { course: 'Clinical Chemistry II', session: '2024/2025', semester: 'first', pending: 12, status: 'In progress' },
    { course: 'Medical Biochemistry', session: '2024/2025', semester: 'first', pending: 20, status: 'Not started' },
    { course: 'Research Methodology', session: '2024/2025', semester: 'first', pending: 0, status: 'Complete' },
  ] as const;

  return (
    <div className="space-y-6">
      {/* Header / Primary Actions */}
      <div className="bg-linear-to-br from-purple-600 via-purple-700 to-indigo-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-2">Academic Staff</h2>
          <p className="text-purple-100 mb-6">
            Manage your assigned courses, view schedule, and submit grades.
          </p>

          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard/academic_staff/schedule"
              className="px-6 py-2.5 bg-white text-purple-600 rounded-lg font-semibold hover:bg-purple-50 transition-colors"
            >
              View Schedule
            </Link>

            <Link
              href="/dashboard/academic_staff/results/grade-submission"
              className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors"
            >
              Grade Submission
            </Link>

          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid sm:grid-cols-3 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-purple-200 hover:shadow-xl transition-all"
            >
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

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-600" />
              Today&apos;s Schedule
            </h3>
            <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
              View Week
            </button>
          </div>

          {todaySchedule.length === 0 ? (
            <div className="py-10 text-center text-gray-600">
              No classes scheduled for today.
            </div>
          ) : (
            <div className="space-y-4">
              {todaySchedule.map((class_, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-100 hover:border-purple-200 transition-colors"
                >
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
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Grade Submission Queue */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            Grade Submission
          </h3>

          <div className="space-y-4">
            {gradeQueue.map((item, index) => (
              <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">{item.course}</p>
                    <p className="text-xs text-gray-500">
                      {item.session} • {item.semester}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      item.pending > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {item.pending > 0 ? `${item.pending} pending` : 'Complete'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <p className="text-xs text-gray-600">{item.status}</p>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>

          <Link
            href="/dashboard/academic_staff/results"
            className="w-full mt-4 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg font-medium transition-colors block text-center"
          >
            Go to Results
          </Link>
        </div>
      </div>
    </div>
  );
}
