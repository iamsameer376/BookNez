import { Card } from '@/components/ui/card';

const CricketBatIcon = ({ className }: { className?: string }) => (
  <span className="text-3xl" role="img" aria-label="cricket bat">
    🏏
  </span>
);

const SalonIcon = ({ className }: { className?: string }) => (
  <span className="text-3xl" role="img" aria-label="scissors">
    ✂️
  </span>
);

interface CategoryGridProps {
  onSelectCategory: (category: string) => void;
  selectedCategory: string | null;
}

const categories = [
  { id: 'turf', name: 'TURF', icon: CricketBatIcon, color: 'text-primary' },
  { id: 'salon', name: 'Salons', icon: SalonIcon, color: 'text-secondary' },
];

export const CategoryGrid = ({ onSelectCategory, selectedCategory }: CategoryGridProps) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {categories.map((category) => {
        const Icon = category.icon;
        const isSelected = selectedCategory === category.id;

        return (
          <Card
            key={category.id}
            className={`p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-lg ${isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
              }`}
            onClick={() => onSelectCategory(category.id)}
          >
            <div className="flex flex-col items-center space-y-3">
              <div className={`p-3 rounded-full bg-gradient-to-br from-primary/10 to-secondary/10`}>
                <Icon className={`h-6 w-6 ${category.color}`} />
              </div>
              <span className="text-sm font-medium text-center">{category.name}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
};
