import { Users, UserCog, BookOpen, TrendingUp } from 'lucide-react';

export default function AdminDashboard() {
  const stats = [
    {
      label: 'Total Students',
      value: '2,547',
      change: '+12%',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      label: 'Total Staff',
      value: '158',
      change: '+3%',
      icon: UserCog,
      color: 'bg-purple-500'
    },
    {
      label: 'Active Courses',
      value: '45',
      change: '+5',
      icon: BookOpen,
      color: 'bg-green-500'
    },
    {
      label: 'Revenue',
      value: '₦12.5M',
      change: '+18%',
      icon: TrendingUp,
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-8 text-white">
        <h2 className="text-3xl font-bold mb-2">Welcome back, Admin!</h2>
        <p className="text-red-100">Here's what's happening with your school today.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-sm font-semibold text-green-600">{stat.change}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Applications</h3>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">John Doe {i}</p>
                  <p className="text-sm text-gray-600">Medical Lab Science</p>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">
                  Pending
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="p-4 bg-red-50 hover:bg-red-100 rounded-xl text-left transition-colors">
              <Users className="w-6 h-6 text-red-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Add Student</p>
            </button>
            <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-xl text-left transition-colors">
              <UserCog className="w-6 h-6 text-purple-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">Add Staff</p>
            </button>
            <button className="p-4 bg-green-50 hover:bg-green-100 rounded-xl text-left transition-colors">
              <BookOpen className="w-6 h-6 text-green-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">New Course</p>
            </button>
            <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-xl text-left transition-colors">
              <TrendingUp className="w-6 h-6 text-orange-600 mb-2" />
              <p className="font-semibold text-gray-900 text-sm">View Reports</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}