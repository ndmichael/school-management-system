export const programs = [
  {
    id: 'community-health',
    title: 'Community Health Extension',
    description: 'Comprehensive training in community healthcare, disease prevention, and health promotion for underserved populations.',
    duration: '2 Years',
    students: '450+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80',
    href: '/programs/community-health',
    featured: true
  },
  {
    id: 'medical-lab',
    title: 'Medical Laboratory Science',
    description: 'Master laboratory techniques, diagnostic testing, and analysis of biological specimens in modern healthcare settings.',
    duration: '3 Years',
    students: '380+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=600&fit=crop&q=80',
    href: '/programs/medical-lab'
  },
  {
    id: 'pharmacy',
    title: 'Pharmacy Technology',
    description: 'Learn pharmaceutical care, drug dispensing, inventory management, and patient counseling in clinical settings.',
    duration: '2.5 Years',
    students: '320+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=600&fit=crop&q=80',
    href: '/programs/pharmacy'
  },
  {
    id: 'environmental-health',
    title: 'Environmental Health',
    description: 'Specialize in sanitation, pollution control, occupational health, and environmental safety management.',
    duration: '2 Years',
    students: '280+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&h=600&fit=crop&q=80',
    href: '/programs/environmental-health'
  },
  {
    id: 'health-info',
    title: 'Health Information Management',
    description: 'Modern health records management, medical coding, data analysis, and healthcare information systems.',
    duration: '2 Years',
    students: '240+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop&q=80',
    href: '/programs/health-info'
  },
  {
    id: 'dental-tech',
    title: 'Dental Technology',
    description: 'Advanced training in dental prosthetics, orthodontics, and creating custom dental appliances.',
    duration: '2.5 Years',
    students: '200+',
    level: 'Diploma',
    image: 'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop&q=80',
    href: '/programs/dental-tech'
  }
];

export type Program = typeof programs[0];