export const contactInfo = [
  {
    type: 'Phone',
    value: '+234 801 234 5678',
    href: 'tel:+2348012345678',
    description: 'Mon-Fri, 8am-5pm'
  },
  {
    type: 'Email',
    value: 'info@sykschool.edu.ng',
    href: 'mailto:info@sykschool.edu.ng',
    description: 'We reply within 24 hours'
  },
  {
    type: 'Address',
    value: 'Abuja, FCT, Nigeria',
    href: '#',
    description: 'Visit our campus'
  }
];

export const inquiryTypes = [
  { value: 'general', label: 'General Inquiry' },
  { value: 'admissions', label: 'Admissions' },
  { value: 'programs', label: 'Programs Information' },
  { value: 'financial', label: 'Financial Aid' },
  { value: 'technical', label: 'Technical Support' }
];

export type ContactInfo = typeof contactInfo[0];
export type InquiryType = typeof inquiryTypes[0];