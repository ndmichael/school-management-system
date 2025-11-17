// components/sections/Hero.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Play, 
  CheckCircle2,
  Users,
  BookOpen,
  Award,
  Sparkles
} from 'lucide-react';

export function Hero() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const stats = [
    { label: 'Active Students', value: '2,500+', icon: Users },
    { label: 'Expert Faculty', value: '150+', icon: Award },
    { label: 'Courses Offered', value: '80+', icon: BookOpen },
  ];

  const features = [
    'World-class health education programs',
    'State-of-the-art facilities & laboratories',
    'Industry-recognized certifications',
    '24/7 Student support system'
  ];

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-white via-gray-50 to-primary-50/20 pt-24">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 left-[10%] w-[500px] h-[500px] bg-primary-200/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-32 right-[10%] w-[600px] h-[600px] bg-secondary-200/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />

      <div className="w-full relative z-10 py-16 px-6 sm:px-8 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-20 items-center mx-auto">
          
          {/* Left Content */}
          <div className={`space-y-10 transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            
            {/* Badge */}
            <div className="inline-flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-gradient-to-r from-primary-50 to-secondary-50 border border-primary-100 text-primary-700 text-sm font-semibold shadow-sm">
              <Sparkles className="w-4 h-4" />
              <span>Welcome to the Future of Healthcare Education</span>
            </div>

            {/* Headline */}
            <div className="space-y-6">
              <h1 className="text-4xl lg:text-5xl xl:text-6xl font-bold leading-[1.15] tracking-tight">
                <span className="block text-gray-900 mb-3">Empowering</span>
                <span className="block bg-gradient-to-r from-primary-600 via-secondary-500 to-primary-600 bg-clip-text text-transparent bg-[length:200%_auto] animate-gradient">
                  Tomorrow's
                </span>
                <span className="block text-gray-900 mt-3">Healthcare Heroes</span>
              </h1>
            </div>

            {/* Description */}
            <p className="text-lg text-gray-600 leading-relaxed">
              At <span className="font-semibold text-gray-900">SYK School of Health Technology</span>, 
              we're dedicated to excellence in healthcare education. Your journey starts here.
            </p>

            {/* Feature List */}
            <div className="space-y-4 pt-2">
              {features.map((feature, index) => (
                <div 
                  key={index}
                  className="flex items-center gap-4 text-gray-700 transition-all duration-300 hover:translate-x-2"
                  style={{ 
                    animation: `slide-in-from-left 0.6s ease-out ${(index + 1) * 0.1}s backwards` 
                  }}
                >
                  <div className="flex-shrink-0 w-7 h-7 bg-gradient-to-br from-secondary-100 to-secondary-50 rounded-full flex items-center justify-center shadow-sm">
                    <CheckCircle2 className="w-4.5 h-4.5 text-secondary-600" />
                  </div>
                  <span className="font-medium text-base">{feature}</span>
                </div>
              ))}
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-5 pt-8">
              <Link
                href="/auth/register"
                className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-xl font-semibold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
              >
                <span>Get Started Free</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <button className="group inline-flex items-center justify-center gap-3 px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold border-2 border-gray-200 hover:border-primary-300 hover:bg-primary-50/50 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                  <Play className="w-5 h-5 text-white ml-0.5" />
                </div>
                <span>Watch Demo</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 pt-12 border-t border-gray-200">
              {stats.map((stat, index) => {
                const Icon = stat.icon;
                return (
                  <div 
                    key={index}
                    className="group cursor-pointer"
                    style={{ 
                      animation: `fade-in 0.6s ease-out ${(index + 5) * 0.15}s backwards` 
                    }}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-100 to-secondary-100 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                          <Icon className="w-4.5 h-4.5 text-primary-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {stat.value}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">{stat.label}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Content - Hero Image */}
          <div className={`relative transition-all duration-1000 delay-300 ${
            isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'
          }`}>
            <div className="relative max-w-[600px] mx-auto lg:ml-auto lg:mr-0">
              
              {/* Main Image Container */}
              <div className="relative rounded-3xl overflow-hidden shadow-2xl group">
                {/* Overlay Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary-600/10 via-transparent to-secondary-600/10 group-hover:opacity-0 transition-opacity duration-500 z-10" />
                
                {/* Image */}
                <div className="aspect-[4/5] relative overflow-hidden bg-gradient-to-br from-primary-100 to-secondary-100">
                  <img
                    src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=1000&fit=crop&q=80"
                    alt="Healthcare students learning"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                </div>
              </div>

              {/* Floating Card 1 - Top Left */}
              <div className="absolute -top-6 -left-6 bg-white rounded-2xl shadow-2xl p-5 animate-float hidden lg:block">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-xl flex items-center justify-center">
                    <Award className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">98% Success</p>
                    <p className="text-sm text-gray-600">Graduate Placement</p>
                  </div>
                </div>
              </div>

              {/* Floating Card 2 - Bottom Right */}
              <div className="absolute -bottom-6 -right-6 bg-white rounded-2xl shadow-2xl p-5 animate-float hidden lg:block" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-secondary-500 to-primary-500 rounded-xl flex items-center justify-center">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <p className="text-base font-bold text-gray-900">15:1 Ratio</p>
                    <p className="text-sm text-gray-600">Student to Faculty</p>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -z-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-gradient-to-br from-primary-300/30 to-secondary-300/30 rounded-3xl blur-3xl opacity-50 group-hover:opacity-70 transition-opacity duration-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gray-300 rounded-full flex items-start justify-center p-2">
          <div className="w-1.5 h-2 bg-gray-400 rounded-full animate-scroll" />
        </div>
      </div>
    </section>
  );
}