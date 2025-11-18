import { LucideIcon } from "lucide-react";

const iconStyles = {
  wrapper:
    "w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110",
  gradient: "bg-gradient-to-br from-primary-500 to-secondary-500",
  glow:
    "absolute inset-0 rounded-2xl bg-gradient-to-br from-primary-400/40 to-secondary-400/40 blur-2xl opacity-0 group-hover:opacity-40 transition-opacity duration-300",
};

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  stats?: string;
}

export function FeatureCard({ icon: Icon, title, description, stats }: FeatureCardProps) {
  return (
    <div className="group relative bg-white/90 backdrop-blur-xl border border-gray-200 hover:border-primary-300 rounded-3xl p-10 shadow-sm hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">

      {/* Icon */}
      <div className="relative mb-8 inline-flex">
        <div className={`${iconStyles.wrapper} ${iconStyles.gradient}`}>
          <Icon className="w-8 h-8 text-white" />
        </div>
        <div className={iconStyles.glow} />
      </div>

      {/* Content */}
      <div className="space-y-4">
        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-primary-700 transition-colors">
          {title}
        </h3>
        <p className="text-gray-600 leading-relaxed">
          {description}
        </p>

        {stats && (
          <div className="pt-3">
            <span className="inline-block px-4 py-1.5 bg-primary-50 text-primary-700 font-semibold text-sm rounded-full shadow-sm">
              {stats}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
