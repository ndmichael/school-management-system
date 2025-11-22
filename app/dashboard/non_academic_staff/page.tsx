import { Building2, Wrench, Package, Users, ClipboardList, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';

export default function NonAcademicStaffDashboard() {
  const stats = [
    {
      label: 'Active Facilities',
      value: '28',
      subtitle: 'All operational',
      icon: Building2,
      color: 'bg-green-500'
    },
    {
      label: 'Pending Requests',
      value: '12',
      subtitle: 'Maintenance tasks',
      icon: Wrench,
      color: 'bg-orange-500'
    },
    {
      label: 'Inventory Items',
      value: '543',
      subtitle: 'In stock',
      icon: Package,
      color: 'bg-blue-500'
    },
    {
      label: 'Staff Members',
      value: '45',
      subtitle: 'Non-academic',
      icon: Users,
      color: 'bg-purple-500'
    }
  ];

  const maintenanceRequests = [
    { facility: 'Library AC Unit', priority: 'high', reported: '2 hours ago', status: 'pending', reportedBy: 'Dr. Adebayo' },
    { facility: 'Lab 204 Projector', priority: 'medium', reported: '5 hours ago', status: 'in-progress', reportedBy: 'Prof. Okafor' },
    { facility: 'Cafeteria Sink', priority: 'high', reported: '1 day ago', status: 'pending', reportedBy: 'Kitchen Staff' },
    { facility: 'Admin Block Door', priority: 'low', reported: '2 days ago', status: 'completed', reportedBy: 'Security' },
  ];

  const facilities = [
    { name: 'Main Library', status: 'operational', capacity: '95%', lastMaintenance: '2 weeks ago' },
    { name: 'Laboratory Complex', status: 'operational', capacity: '88%', lastMaintenance: '1 week ago' },
    { name: 'Sports Complex', status: 'maintenance', capacity: '0%', lastMaintenance: 'Today' },
    { name: 'Student Hostel', status: 'operational', capacity: '92%', lastMaintenance: '3 days ago' },
  ];

  const recentActivities = [
    { action: 'Completed AC repair in Lecture Hall 3', staff: 'John Technician', time: '30 mins ago' },
    { action: 'Restocked cleaning supplies', staff: 'Mary Supervisor', time: '2 hours ago' },
    { action: 'Security patrol report submitted', staff: 'David Security', time: '4 hours ago' },
    { action: 'Generator maintenance completed', staff: 'Peter Engineer', time: '1 day ago' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-br from-green-600 via-green-700 to-teal-600 rounded-2xl p-8 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-3xl font-bold mb-2">Welcome, Operations Manager!</h2>
          <p className="text-green-100 mb-6">You have 12 pending maintenance requests and 3 facilities requiring attention.</p>
          <div className="flex flex-wrap gap-3">
            <button className="px-6 py-2.5 bg-white text-green-600 rounded-lg font-semibold hover:bg-green-50 transition-colors">
              View Requests
            </button>
            <button className="px-6 py-2.5 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors">
              Facility Status
            </button>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="group bg-white rounded-2xl p-6 border border-gray-200 hover:border-green-200 hover:shadow-xl transition-all">
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
        {/* Maintenance Requests */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-600" />
              Maintenance Requests
            </h3>
            <button className="text-sm text-green-600 hover:text-green-700 font-medium">View All</button>
          </div>
          <div className="space-y-4">
            {maintenanceRequests.map((request, index) => (
              <div key={index} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-green-200 transition-colors">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                  request.priority === 'high' ? 'bg-red-100' : request.priority === 'medium' ? 'bg-orange-100' : 'bg-blue-100'
                }`}>
                  <AlertCircle className={`w-5 h-5 ${
                    request.priority === 'high' ? 'text-red-600' : request.priority === 'medium' ? 'text-orange-600' : 'text-blue-600'
                  }`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-semibold text-gray-900">{request.facility}</h4>
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                      request.status === 'completed' ? 'bg-green-100 text-green-700' :
                      request.status === 'in-progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <p>Reported by: {request.reportedBy}</p>
                    <p className="text-xs text-gray-500 mt-1">{request.reported}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors">
                  Assign
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <ClipboardList className="w-5 h-5 text-green-600" />
            Recent Activities
          </h3>
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-start gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm text-gray-900 font-medium">{activity.action}</p>
                    <p className="text-xs text-gray-600 mt-1">{activity.staff}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{activity.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Facilities Overview */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-green-600" />
            Facilities Overview
          </h3>
          <button className="text-sm text-green-600 hover:text-green-700 font-medium">Manage All</button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {facilities.map((facility, index) => (
            <div key={index} className="group p-5 bg-gradient-to-br from-green-50 to-teal-50 rounded-xl border border-green-100 hover:border-green-200 hover:shadow-lg transition-all">
              <div className="flex items-center justify-between mb-3">
                <Building2 className="w-8 h-8 text-green-600" />
                <span className={`px-2 py-1 text-xs font-bold rounded ${
                  facility.status === 'operational' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                }`}>
                  {facility.status}
                </span>
              </div>
              <h4 className="font-bold text-gray-900 mb-2 text-sm">{facility.name}</h4>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Capacity</span>
                  <span className="font-bold text-gray-900">{facility.capacity}</span>
                </div>
                <p className="text-xs text-gray-600">Last maintenance: {facility.lastMaintenance}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Quick Actions</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="group p-6 bg-gradient-to-br from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 rounded-xl text-left transition-all hover:shadow-lg border border-green-200">
            <Wrench className="w-8 h-8 text-green-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">New Request</p>
            <p className="text-xs text-gray-600 mt-1">Log maintenance</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-blue-50 to-blue-100 hover:from-blue-100 hover:to-blue-200 rounded-xl text-left transition-all hover:shadow-lg border border-blue-200">
            <Package className="w-8 h-8 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Inventory</p>
            <p className="text-xs text-gray-600 mt-1">Check stock</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-purple-50 to-purple-100 hover:from-purple-100 hover:to-purple-200 rounded-xl text-left transition-all hover:shadow-lg border border-purple-200">
            <Users className="w-8 h-8 text-purple-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Staff Roster</p>
            <p className="text-xs text-gray-600 mt-1">View schedule</p>
          </button>
          
          <button className="group p-6 bg-gradient-to-br from-orange-50 to-orange-100 hover:from-orange-100 hover:to-orange-200 rounded-xl text-left transition-all hover:shadow-lg border border-orange-200">
            <TrendingUp className="w-8 h-8 text-orange-600 mb-3 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-gray-900">Reports</p>
            <p className="text-xs text-gray-600 mt-1">Generate reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}