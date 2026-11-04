import React from 'react';
import { useRouter } from './context/RouterContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CreditModal } from './components/CreditModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SkillsPage } from './pages/SkillsPage.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { SkillDetailPage } from './pages/SkillDetailPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { McpHubPage } from './pages/McpHubPage.tsx';
import { LibraryPage } from './pages/LibraryPage.tsx';
import { CreatorStudioPage } from './pages/CreatorStudioPage.tsx';
import { CreatorHubPage } from './pages/CreatorHubPage.tsx';
import { SubmitSkillPage } from './pages/SubmitSkillPage.tsx';
import { CreatorProfilePage } from './pages/CreatorProfilePage.tsx';
import { MyProfilePage } from './pages/MyProfilePage.tsx';
import { AccountSettingsPage } from './pages/AccountSettingsPage.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx';
import { TeamSettingsPage } from './pages/TeamSettingsPage.tsx';
import { AdminSecurityPage } from './pages/AdminSecurityPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { ProtectedRoute, AuthLoadingScreen } from './components/ProtectedRoute.tsx';
import { useAuth } from './context/AuthContext.tsx';

const AUTH_ROUTES = ['/auth', '/login', '/signup', '/forgot-password', '/reset-password', '/auth/callback'];

export function App() {
  const { path } = useRouter();

  // Route matchers
  const skillDetailMatch = path.match(/^\/skills\/([a-zA-Z0-9_-]+)$/);
  const projectDetailMatch = path.match(/^\/projects\/([a-zA-Z0-9_-]+)$/);
  const creatorProfileMatch = path.match(/^\/creators\/([a-zA-Z0-9_-]+)$/) || path.match(/^\/u\/([a-zA-Z0-9_-]+)$/);

  let PageComponent = <HomePage />;
  const isChatPage = path === '/chat';

  if (path === '/creators') {
    PageComponent = <CreatorHubPage />;
  } else if (creatorProfileMatch) {
    const username = creatorProfileMatch[1];
    PageComponent = <CreatorProfilePage username={username} />;
  } else if (skillDetailMatch) {
    const slug = skillDetailMatch[1];
    PageComponent = <SkillDetailPage slug={slug} />;
  } else if (projectDetailMatch) {
    PageComponent = <ProjectDetailPage />;
  } else if (path === '/skills' || path === '/marketplace') {
    PageComponent = <SkillsPage />;
  } else if (path === '/categories') {
    PageComponent = <CategoriesPage />;
  } else if (path === '/mcp') {
    PageComponent = <McpHubPage />;
  } else if (path === '/dashboard' || path === '/workspace') {
    PageComponent = (
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    );
  } else if (path === '/library') {
    PageComponent = (
      <ProtectedRoute>
        <LibraryPage />
      </ProtectedRoute>
    );
  } else if (path === '/creator-studio' || path === '/creator' || path === '/sell' || path === '/creator/submit') {
    PageComponent = (
      <ProtectedRoute>
        <CreatorStudioPage />
      </ProtectedRoute>
    );
  } else if (path === '/chat') {
    PageComponent = <ChatPage />;
  } else if (path === '/projects') {
    PageComponent = <ProjectsPage />;
  } else if (path === '/settings' || path === '/account' || path === '/team' || path === '/billing' || path === '/preferences') {
    PageComponent = (
      <ProtectedRoute>
        <AccountSettingsPage />
      </ProtectedRoute>
    );
  } else if (path === '/admin' || path === '/security') {
    PageComponent = <AdminSecurityPage />;
  } else if (AUTH_ROUTES.includes(path)) {
    PageComponent = <AuthPage />;
  } else if (path === '/profile') {
    PageComponent = (
      <ProtectedRoute>
        <MyProfilePage />
      </ProtectedRoute>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-canvas text-text-primary antialiased">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <ErrorBoundary>
          {PageComponent}
        </ErrorBoundary>
      </main>
      {!isChatPage && <Footer />}
      <CreditModal />
    </div>
  );
}
