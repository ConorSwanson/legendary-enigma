import { NavLink } from 'react-router-dom';

const links = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/log', label: 'Log Climb', end: false },
  { to: '/history', label: 'My Climbs', end: false },
  { to: '/profile', label: 'Profile', end: false },
];

export default function NavBar() {
  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 flex items-center h-14 gap-1">
        <div className="flex items-center gap-2 mr-6">
          <span className="text-xl">⛰️</span>
          <span className="font-bold text-white tracking-tight">14ers Tracker</span>
        </div>
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-sky-400'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
