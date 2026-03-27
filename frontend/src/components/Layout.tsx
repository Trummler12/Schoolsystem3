import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div>
      <header>
        <nav>
          <NavLink to="/topics">Topics</NavLink>
          {' | '}
          <NavLink to="/interesting">Interesting</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
