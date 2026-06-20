import { NavLink } from 'react-router-dom';

const links = [
  {
    to: '/',
    end: true,
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.689-8.69a2.25 2.25 0 00-3.182 0l-8.69 8.69a.75.75 0 001.061 1.06l8.69-8.69z" />
        <path d="M12 5.432l8.159 8.159c.03.03.06.058.091.086v6.198c0 1.035-.84 1.875-1.875 1.875H15a.75.75 0 01-.75-.75v-4.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75V21a.75.75 0 01-.75.75H5.625a1.875 1.875 0 01-1.875-1.875v-6.198a2.29 2.29 0 00.091-.086L12 5.43z" />
      </svg>
    ),
  },
  {
    to: '/feed',
    end: false,
    label: 'Activity',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/log',
    end: false,
    label: 'Log',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 9a.75.75 0 00-1.5 0v2.25H9a.75.75 0 000 1.5h2.25V15a.75.75 0 001.5 0v-2.25H15a.75.75 0 000-1.5h-2.25V9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/history',
    end: false,
    label: 'My Climbs',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M2.625 6.75a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0A.75.75 0 018.25 6h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75zM2.625 12a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zM7.5 12a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12A.75.75 0 017.5 12zm-4.875 5.25a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0zm4.875 0a.75.75 0 01.75-.75h12a.75.75 0 010 1.5h-12a.75.75 0 01-.75-.75z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    to: '/profile',
    end: false,
    label: 'Profile',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
        <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clipRule="evenodd" />
      </svg>
    ),
  },
];

export default function NavBar() {
  return (
    <>
      {/* Top bar — desktop only */}
      <nav className="hidden md:block bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
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

      {/* Mobile top bar — logo only */}
      <nav className="md:hidden bg-gray-900 border-b border-gray-800 sticky top-0 z-10">
        <div className="px-4 flex items-center h-12">
          <span className="text-lg">⛰️</span>
          <span className="font-bold text-white tracking-tight ml-2">14ers Tracker</span>
        </div>
      </nav>

      {/* Bottom tab bar — mobile only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-gray-900 border-t border-gray-800 pb-safe">
        <div className="grid grid-cols-5 h-16">
          {links.map(({ to, label, end, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? 'text-sky-400' : 'text-gray-500'
                }`
              }
            >
              {icon}
              <span className="text-[10px] font-medium">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </>
  );
}
