'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2,
  Users,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';
import { PrimaryButton, SecondaryButton } from '@/components/shared';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { label: 'Students', value: '2.5K+', icon: Users },
    { label: 'Faculty', value: '150+', icon: Award },
    { label: 'Courses', value: '80+', icon: BookOpen },
  ];

  const features = [
    'World-class health programs',
    'State-of-the-art facilities',
    'Industry certifications'
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-primary-50/20 pt-24">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-[10%] w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-[10%] w-[600px] h-[600px] bg-secondary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="w-full relative z-10 py-16 px-6 sm:px-8 lg:px-12">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Content */}
          <div className={`space-y-8 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-primary-50 to-secondary-50 border border-primary-100 text-primary-700 text-sm font-semibold">
              <Sparkles className="w-4 h-4" />
              <span>Welcome to SYK</span>
            </div>

            <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-tight">
              <span className="block text-gray-900">Empowering</span>
              <span className="block bg-linear-to-r from-primary-600 via-secondary-500 to-primary-600 bg-clip-text text-transparent">
                Tomorrow&quot;s
              </span>
              <span className="block text-gray-900">Healthcare Heroes</span>
            </h1>

            <p className="text-lg text-gray-600 leading-relaxed">
              Excellence in healthcare education. Your journey to a rewarding career starts here.
            </p>

            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3 text-gray-700">
                  <div className="shrink-0 w-6 h-6 bg-linear-to-br from-secondary-100 to-secondary-50 rounded-full flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4 text-secondary-600" />
                  </div>
                  <span className="font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <PrimaryButton href="/apply">
                Get Started Free
              </PrimaryButton>
              
              <SecondaryButton onClick={() => console.log('Play demo')}>
                Watch Demo
              </SecondaryButton>
            </div>

            <div className="grid grid-cols-3 gap-6 pt-8 border-t border-gray-200">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div key={index} className="group cursor-pointer">
                    <div className="flex flex-col gap-2">
                      <div className="w-9 h-9 bg-linear-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon className="w-5 h-5 text-primary-600" />
                      </div>
                      <p className="text-2xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {stat.value}
                      </p>
                      <p className="text-xs text-gray-600 font-medium">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Image */}
          <div className={`relative transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}>
            <div className="relative max-w-[500px] mx-auto lg:ml-auto lg:mr-0">
              
              <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                <div className="absolute inset-0 bg-linear-to-br from-primary-600/10 via-transparent to-secondary-600/10 group-hover:opacity-0 transition-opacity duration-500 z-10" />
                
                <div className="aspect-\[3/4] relative overflow-hidden bg-linear-to-br from-primary-100 to-secondary-100">
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=800&fit=crop&q=80"
                    alt="Healthcare students"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Floating Card 1 */}
              <div className="absolute -top-4 -left-4 bg-white rounded-2xl shadow-2xl p-4 animate-float hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">98% Success</p>
                    <p className="text-xs text-gray-600">Graduate Placement</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 */}
              <div className="absolute -bottom-4 -right-4 bg-white rounded-2xl shadow-2xl p-4 animate-float hidden lg:block" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-linear-to-br from-secondary-500 to-primary-500 rounded-xl flex items-center justify-center">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">15:1 Ratio</p>
                    <p className="text-xs text-gray-600">Student to Faculty</p>
                  </div>
                </div>
              </div>

              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-br from-primary-300/30 to-secondary-300/30 rounded-3xl blur-3xl opacity-50" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}