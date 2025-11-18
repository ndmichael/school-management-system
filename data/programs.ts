export const programs = [
  {
    id: "community-health",
    title: "Community Health Extension",
    description:
      "Comprehensive training in community healthcare, disease prevention, first aid, and health promotion in underserved communities.",
    duration: "2 Years",
    students: "450+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=800&h=600&fit=crop&q=80",
    featured: true,
    features: [
      'Community health assessment',
      'Disease prevention strategies',
      'First aid and emergency care',
      'Health education and promotion',
      'Maternal and child health',
      'Clinical practice placements'
    ]
  },
  {
    id: "medical-lab",
    title: "Medical Laboratory Science",
    description:
      "Master clinical laboratory techniques, hematology, microbiology, and diagnostic testing using modern equipment.",
    duration: "3 Years",
    students: "380+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=800&h=600&fit=crop&q=80",
    features: [
      'Clinical chemistry analysis',
      'Hematology and blood banking',
      'Medical microbiology',
      'Parasitology and immunology',
      'Laboratory quality control',
      'Modern diagnostic equipment'
    ]
  },
  {
    id: "pharmacy",
    title: "Pharmacy Technology",
    description:
      "Learn drug dispensing, supply management, compounding, pharmaceutical care, and patient medication counseling.",
    duration: "2.5 Years",
    students: "320+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&h=600&fit=crop&q=80",
    features: [
      'Pharmaceutical calculations',
      'Drug dispensing and compounding',
      'Pharmacy inventory management',
      'Patient medication counseling',
      'Pharmacology and therapeutics',
      'Clinical pharmacy practice'
    ]
  },
  {
    id: "environmental-health",
    title: "Environmental Health",
    description:
      "Focus on sanitation, waste management, environmental control, food hygiene, occupational health, and pollution control.",
    duration: "2 Years",
    students: "280+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1497436072909-60f360e1d4b1?w=800&h=600&fit=crop&q=80",
    features: [
      'Environmental sanitation',
      'Water quality management',
      'Food safety and hygiene',
      'Waste disposal systems',
      'Occupational health and safety',
      'Pollution control methods'
    ]
  },
  {
    id: "health-info",
    title: "Health Information Management",
    description:
      "Study modern health records management, medical coding, health informatics, and healthcare data analysis.",
    duration: "2 Years",
    students: "240+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1504868584819-f8e8b4b6d7e3?w=800&h=600&fit=crop&q=80",
    features: [
      'Electronic health records',
      'Medical coding and classification',
      'Health data management',
      'Healthcare statistics',
      'Medical terminology',
      'Health information systems'
    ]
  },
  {
    id: "dental-tech",
    title: "Dental Technology",
    description:
      "Specialized training in dental prosthetics, orthodontic appliances, crowns, bridges, and maxillofacial restoration.",
    duration: "2.5 Years",
    students: "200+",
    level: "Diploma",
    image:
      "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop&q=80",
    features: [
      'Dental prosthetics fabrication',
      'Crown and bridge construction',
      'Orthodontic appliances',
      'Dental materials science',
      'Maxillofacial prosthetics',
      'Laboratory equipment operation'
    ]
  }
];

export type Program = (typeof programs)[0];