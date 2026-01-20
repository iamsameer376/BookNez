import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface CategoryGridProps {
  onSelectCategory: (category: string) => void;
  selectedCategory: string | null;
}

const categories = [
  {
    id: 'turf',
    name: 'Sports Turf',
    description: 'Book premium cricket, football & sports grounds',
    icon: '🏏',
    gradient: 'bg-gradient-to-r from-[#059669] to-[#10b981]', // Emerald to Emerald-500
    shadow: 'shadow-emerald-500/20',
    accent: 'bg-emerald-400/20',
    ring: 'ring-emerald-500'
  },
  {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'Luxury grooming, styling & wellness services',
    icon: '✂️',
    gradient: 'bg-gradient-to-r from-[#7c3aed] to-[#db2777]', // Violet to Pink
    shadow: 'shadow-purple-500/20',
    accent: 'bg-purple-400/20',
    ring: 'ring-purple-500'
  },
];

export const CategoryGrid = ({ onSelectCategory, selectedCategory }: CategoryGridProps) => {
  return (
    <div className="flex flex-col gap-4 w-full">
      {categories.map((category) => {
        const isSelected = selectedCategory === category.id;

        return (
          <div
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={cn(
              "group relative overflow-hidden rounded-2xl cursor-pointer transition-all duration-500 ease-out",
              "hover:scale-[1.02]", // Subtle scale
              category.shadow,
              isSelected ? `ring-2 ring-offset-2 ${category.ring}` : "hover:shadow-xl"
            )}
          >
            {/* Main Card Background */}
            <div className={cn(
              "absolute inset-0 transition-opacity duration-500",
              category.gradient,
              "opacity-90 group-hover:opacity-100" // Brighten on hover
            )} />

            {/* Decorative Patterns/Glows */}
            <div className="absolute -right-12 -top-12 h-40 w-40 rounded-full bg-white/10 blur-3xl transition-transform duration-700 group-hover:scale-150" />
            <div className="absolute -left-12 -bottom-12 h-40 w-40 rounded-full bg-black/10 blur-3xl" />

            {/* Content Container */}
            <div className="relative p-6 flex items-center justify-between">

              {/* Left Side: Icon & Text */}
              <div className="flex items-center gap-5">
                {/* Icon Container */}
                <div className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-2xl backdrop-blur-md shadow-inner transition-transform duration-500 group-hover:rotate-6",
                  "bg-white/20 border border-white/30"
                )}>
                  <span className="text-4xl drop-shadow-md filter" role="img" aria-label={category.name}>
                    {category.icon}
                  </span>
                </div>

                {/* Text Content */}
                <div className="flex flex-col gap-1">
                  <h3 className="text-xl font-bold text-white tracking-wide">
                    {category.name}
                  </h3>
                  <p className="text-sm text-white/90 font-medium opacity-90">
                    {category.description}
                  </p>
                </div>
              </div>

              {/* Right Side: Action Indicator */}
              <div className={cn(
                "flex h-10 w-10 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm transition-all duration-300",
                "group-hover:translate-x-1 group-hover:bg-white/30"
              )}>
                <ChevronRight className="h-6 w-6 text-white" />
              </div>

            </div>
          </div>
        );
      })}
    </div>
  );
};
