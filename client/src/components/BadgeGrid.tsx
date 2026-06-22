import { useNavigate } from 'react-router-dom';
import type { Mountain } from '../types';
import MountainBadge from './MountainBadge';
import { PALETTES } from '../data/peaks-data';

interface Props {
  mountains: Mountain[];
  climbedIds: Set<number>;
}

const RANGE_ORDER = [
  'Sawatch Range',
  'Sangre de Cristo',
  'San Juan Mountains',
  'Elk Mountains',
  'Mosquito Range',
  'Front Range',
  'Tenmile Range',
];

const RANGE_TO_PALETTE: Record<string, keyof typeof PALETTES> = {
  'Sawatch Range':      'SAWATCH',
  'Sangre de Cristo':   'SANGRE',
  'San Juan Mountains': 'SANJUAN',
  'Elk Mountains':      'ELK',
  'Mosquito Range':     'MOSQUITO',
  'Front Range':        'FRONT',
  'Tenmile Range':      'TENMILE',
};

export default function BadgeGrid({ mountains, climbedIds }: Props) {
  const navigate = useNavigate();

  const byRange = RANGE_ORDER.reduce<Record<string, Mountain[]>>((acc, r) => {
    acc[r] = mountains.filter(m => m.range === r).sort((a, b) => b.elevation - a.elevation);
    return acc;
  }, {});

  mountains.forEach(m => {
    if (!byRange[m.range]) byRange[m.range] = [];
    if (!RANGE_ORDER.includes(m.range)) byRange[m.range].push(m);
  });

  const sections = Object.entries(byRange).filter(([, ms]) => ms.length > 0);

  return (
    <div className="space-y-8">
      {sections.map(([range, ms]) => {
        const rangeClimbed = ms.filter(m => climbedIds.has(m.id)).length;
        const palKey = RANGE_TO_PALETTE[range];
        const dotColor = palKey ? PALETTES[palKey].ac : '#6b7280';

        return (
          <div key={range}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
                <span className="text-sm font-semibold text-gray-300">{range}</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {rangeClimbed} / {ms.length}
              </span>
            </div>

            <div className="flex flex-wrap gap-4">
              {ms.map(m => (
                <MountainBadge
                  key={m.id}
                  mountain={m}
                  climbed={climbedIds.has(m.id)}
                  size={110}
                  onClick={() => navigate(climbedIds.has(m.id) ? `/history?mountain_id=${m.id}` : `/log?mountain_id=${m.id}`)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
