import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div>
      <header>
        <nav>
          <NavLink to="/topics">Topics</NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </div>
  )
}
