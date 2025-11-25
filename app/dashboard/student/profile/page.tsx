import { currentStudent } from "@/data/student";
import { User, Mail, Phone, MapPin, Calendar, BookOpen, School } from "lucide-react";

export default function ProfilePage() {
  const student = currentStudent;

  return (
    <div className="space-y-6">
      {/* Your existing header is already rendered at layout level */}

      {/* Profile Summary */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
        <div className="flex items-center gap-5">
          <img
            src={student.avatar}
            alt={student.name}
            className="w-20 h-20 rounded-xl border object-cover"
          />

          <div>
            <h2 className="text-2xl font-bold text-gray-900">{student.name}</h2>
            <p className="text-sm text-gray-500">{student.matricNo}</p>
            <span
              className={`inline-block mt-2 px-3 py-1 text-xs rounded-full font-medium ${
                student.status === "active"
                  ? "bg-green-100 text-green-700"
                  : student.status === "suspended"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-blue-100 text-blue-700"
              }`}
            >
              {student.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Personal + Academic Info Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" /> Personal Information
          </h3>

          <div className="space-y-4 text-sm">
            <Info label="Email" value={student.email} icon={<Mail className="w-4 h-4 text-blue-600" />} />
            <Info label="Phone" value={student.phone} icon={<Phone className="w-4 h-4 text-blue-600" />} />
            <Info label="Address" value={student.address} icon={<MapPin className="w-4 h-4 text-blue-600" />} />
            <Info label="State of Origin" value={student.stateOfOrigin} />
            <Info label="Nationality" value={student.nationality} />
            <Info label="Gender" value={student.gender} />
            <Info label="Date of Birth" value={student.dateOfBirth} icon={<Calendar className="w-4 h-4 text-blue-600" />} />
          </div>
        </div>

        {/* Academic Info */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-600" /> Academic Information
          </h3>

          <div className="space-y-4 text-sm">
            <Info label="Department" value={student.department} icon={<School className="w-4 h-4 text-purple-600" />} />
            <Info label="Program" value={student.program} />
            <Info label="Level" value={student.level} />
            <Info label="CGPA" value={student.cgpa.toString()} />
            <Info label="Enrollment Date" value={student.enrollmentDate} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --- Reusable Small Info Component --- */
function Info({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      {icon && <div className="mt-1">{icon}</div>}
      <div>
        <p className="text-gray-500 text-xs">{label}</p>
        <p className="font-medium text-gray-900">{value}</p>
      </div>
    </div>
  );
}
