'use client';

import { motion } from 'framer-motion';
import { Award, Building } from 'lucide-react';

const departments = [
  { name: 'Nursing Department', description: 'Comprehensive training for nurses combining theory and practical skills.', icon: Building },
  { name: 'Laboratory Department', description: 'Training in medical laboratory science emphasizing accuracy and ethics.', icon: Building },
  { name: 'Public Health Department', description: 'Focuses on health promotion, disease prevention, and community health.', icon: Building },
];

const keyStaff = [
  { name: 'Dr. Yahaya Isah', role: 'Principal', image: '/staff/jane.jpg' },
  { name: 'Mr. Sani Ahmad', role: 'Vice Principal', image: '/staff/john.jpg' },
  { name: 'Dr. Emily Brown', role: 'Head of Nursing', image: '/staff/emily.jpg' },
];

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white">

      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-primary-600 to-secondary-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]" />
        <div className="relative max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-24 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-4xl lg:text-5xl font-bold mb-4"
          >
            About SYK School of Health Technology
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-lg text-primary-100 leading-relaxed max-w-2xl mx-auto"
          >
            Learn about our mission, vision, accredited programs, departments, and key staff. 
            We are committed to delivering excellence in health technology education.
          </motion.p>
        </div>

        <div className="absolute bottom-0 left-0 right-0 overflow-hidden leading-none">
          <svg className="relative block w-full h-12" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-white"/>
          </svg>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Mission & Vision</h2>
        <div className="grid md:grid-cols-2 gap-8">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow p-6 flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-gray-900">Our Mission</h3>
            <p className="text-gray-600 text-sm">
              To provide quality education and training in health technology, equipping students with practical skills and ethical values to excel in healthcare professions.
            </p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow p-6 flex flex-col gap-4">
            <h3 className="text-xl font-semibold text-gray-900">Our Vision</h3>
            <p className="text-gray-600 text-sm">
              To become a leading institution in health technology education recognized for excellence, innovation, and producing competent professionals who impact society positively.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Accreditation */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Accreditation</h2>
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow p-6 flex flex-col gap-4 max-w-3xl mx-auto text-center">
          <div className="w-12 h-12 bg-linear-to-br from-primary-600 to-secondary-600 text-white rounded-xl flex items-center justify-center mb-4 mx-auto">
            <Award className="w-6 h-6" />
          </div>
          <p className="text-gray-600 text-sm">
            SYK School of Health Tech is fully accredited by the relevant regulatory bodies. We maintain high standards in curriculum, facilities, and faculty to ensure our graduates are globally competent.
          </p>
        </motion.div>
      </section>

      {/* Departments */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Departments</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {departments.map((dept, idx) => {
            const Icon = dept.icon;
            return (
              <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow p-6 flex flex-col gap-4">
                <div className="w-12 h-12 bg-linear-to-br from-primary-600 to-secondary-600 text-white rounded-xl flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900">{dept.name}</h3>
                <p className="text-gray-600 text-sm">{dept.description}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Key Staff */}
      <section className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12 py-20">
        <h2 className="text-3xl font-bold text-gray-900 mb-12 text-center">Key Staff</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {keyStaff.map((staff, idx) => (
            <motion.div key={idx} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: idx * 0.1 }} className="bg-white rounded-2xl shadow-lg hover:shadow-2xl transition-shadow p-6 flex flex-col items-center gap-4 text-center">
              <img src={staff.image} alt={staff.name} className="w-24 h-24 rounded-full object-cover" />
              <h3 className="text-xl font-semibold text-gray-900">{staff.name}</h3>
              <p className="text-gray-600 text-sm">{staff.role}</p>
            </motion.div>
          ))}
        </div>
      </section>

    </main>
  );
}
