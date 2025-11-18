export const admissionRequirements = [
  {
    category: 'Academic Requirements',
    items: [
      'SSCE/NECO/GCE O\'Level with minimum of 5 credits',
      'Credits must include English Language and Mathematics',
      'Relevant science subjects (Biology, Chemistry, Physics)',
      'Results must not be more than two sittings'
    ]
  },
  {
    category: 'Age Requirements',
    items: [
      'Minimum age of 16 years at the time of admission',
      'No maximum age limit for qualified candidates'
    ]
  },
  {
    category: 'Additional Documents',
    items: [
      'Birth certificate or age declaration',
      'Local government identification letter',
      'Passport photographs (recent)',
      'Medical fitness certificate'
    ]
  }
];

export const admissionSteps = [
  {
    step: 1,
    title: 'Submit Application',
    description: 'Complete the online application form and upload required documents.',
    duration: '10-15 minutes'
  },
  {
    step: 2,
    title: 'Document Verification',
    description: 'Our team reviews your credentials and academic qualifications.',
    duration: '2-3 business days'
  },
  {
    step: 3,
    title: 'Entrance Examination',
    description: 'Take the entrance exam at our campus or approved centers.',
    duration: '2 hours'
  },
  {
    step: 4,
    title: 'Interview & Admission',
    description: 'Successful candidates attend an interview and receive admission letters.',
    duration: '1 week'
  }
];

export const importantDates = [
  { event: 'Application Opens', date: 'November 1, 2024' },
  { event: 'Application Closes', date: 'February 28, 2025' },
  { event: 'Entrance Examination', date: 'March 15-20, 2025' },
  { event: 'Admission List Release', date: 'April 5, 2025' },
  { event: 'Registration Begins', date: 'April 15, 2025' },
  { event: 'Academic Session Starts', date: 'May 6, 2025' }
];

export const faqItems = [
  {
    question: 'Can I apply for multiple programs?',
    answer: 'Yes, you can apply for up to two programs, but you must indicate your first and second choice during application.'
  },
  {
    question: 'Is there an application fee?',
    answer: 'Yes, a non-refundable application fee of ₦10,000 is required. Payment can be made online or at designated banks.'
  },
  {
    question: 'Can I apply with awaiting results?',
    answer: 'Yes, candidates awaiting O\'Level results can apply. However, admission is conditional upon meeting the minimum requirements.'
  },
  {
    question: 'What is the acceptance fee?',
    answer: 'Upon receiving an admission letter, an acceptance fee of ₦50,000 must be paid within two weeks to confirm your admission.'
  }
];

export type AdmissionRequirement = typeof admissionRequirements[0];
export type AdmissionStep = typeof admissionSteps[0];
export type ImportantDate = typeof importantDates[0];
export type FAQ = typeof faqItems[0];