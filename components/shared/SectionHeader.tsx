interface SectionHeaderProps {
  badge?: string;
  title: string;
  description?: string;
  centered?: boolean;
}

export function SectionHeader({ 
  badge, 
  title, 
  description, 
  centered = false 
}: SectionHeaderProps) {
  return (
    <div className={`space-y-4 ${centered ? 'text-center mx-auto max-w-3xl' : ''}`}>
      {badge && (
        <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-sm font-semibold ${centered ? 'mx-auto' : ''}`}>
          <span>{badge}</span>
        </div>
      )}
      <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-gray-900 leading-tight">
        {title}
      </h2>
      {description && (
        <p className="text-lg text-gray-600 leading-relaxed">
          {description}
        </p>
      )}
    </div>
  );
}