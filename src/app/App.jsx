import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import RequireAuth from '../features/auth/components/RequireAuth.jsx';
import RequireRole from '../features/auth/components/RequireRole.jsx';
import ForbiddenPage from '../features/auth/pages/ForbiddenPage.jsx';
import LoginPage from '../features/auth/pages/LoginPage.jsx';
import DashboardPage from '../features/dashboard/DashboardPage.jsx';
import ProjectDetailPage from '../features/project/pages/ProjectDetailPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route path='/forbidden' element={<ForbiddenPage />} />

      <Route element={<RequireAuth />}>
        <Route path='/' element={<Navigate to='/dashboard' replace />} />
        <Route path='/dashboard' element={<DashboardPage />} />

        <Route element={<RequireRole allowedRoles={['admin', 'editor']} />}>
          <Route path='/projects/:id' element={<ProjectDetailPage />} />
        </Route>
      </Route>

      <Route path='*' element={<Navigate to='/dashboard' replace />} />
    </Routes>
  );
}
