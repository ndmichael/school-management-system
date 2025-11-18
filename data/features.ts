import { 
  Award, 
  Building2, 
  Users, 
  TrendingUp, 
  Shield, 
  Stethoscope 
} from 'lucide-react';

export const features = [
  {
    icon: Award,
    title: 'Accredited Excellence',
    description: 'Fully accredited by national and international health education boards with recognized certifications.',
    stats: '100% Accredited'
  },
  {
    icon: Building2,
    title: 'Modern Facilities',
    description: 'State-of-the-art laboratories, simulation centers, and clinical training environments with latest equipment.',
    stats: '15+ Labs'
  },
  {
    icon: Users,
    title: 'Expert Faculty',
    description: 'Learn from experienced healthcare professionals and certified instructors with real-world expertise.',
    stats: '150+ Instructors'
  },
  {
    icon: TrendingUp,
    title: 'High Success Rate',
    description: 'Outstanding graduate placement rate with partnerships across leading healthcare institutions.',
    stats: '98% Placement'
  },
  {
    icon: Shield,
    title: 'Quality Assurance',
    description: 'Rigorous curriculum standards, continuous assessment, and industry-aligned training programs.',
    stats: 'ISO Certified'
  },
  {
    icon: Stethoscope,
    title: 'Clinical Experience',
    description: 'Hands-on practical training in hospitals and clinics with supervised patient care rotations.',
    stats: '500+ Hours'
  }
];

export const stats = [
  { value: '25+', label: 'Years of Excellence' },
  { value: '2,500+', label: 'Active Students' },
  { value: '8,000+', label: 'Alumni Network' },
  { value: '200+', label: 'Partner Institutions' }
];

export type Feature = typeof features[0];
export type Stat = typeof stats[0];