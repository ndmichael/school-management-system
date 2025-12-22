export const contactInfo = [
  {
    type: 'Phone',
    value: '+234 901 897 8280',
    href: 'tel:+2349018978280',
    description: 'Mon-Fri, 8am-5pm'
  },
  {
    type: 'Phone',
    value: '+234 903 593 9506',
    href: 'tel:+2349035939506',
    description: 'Mon-Fri, 8am-5pm'
  },
  {
    type: 'Email',
    value: 'sykschoolofhealthtech@gmail.com',
    href: 'mailto:sykschoolofhealthtech@gmail.com',
    description: 'We reply within 24 hours'
  },
  {
    type: 'Address',
    value: 'No, 3. Rogo Road,Karaye ,Kano State',
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