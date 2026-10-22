import React from 'react';
import { useRouter } from './context/RouterContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { CreditModal } from './components/CreditModal.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { SkillsPage } from './pages/SkillsPage.tsx';
import { CategoriesPage } from './pages/CategoriesPage.tsx';
import { SkillDetailPage } from './pages/SkillDetailPage.tsx';
import { McpHubPage } from './pages/McpHubPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { LibraryPage } from './pages/LibraryPage.tsx';
import { CreatorStudioPage } from './pages/CreatorStudioPage.tsx';
import { SubmitSkillPage } from './pages/SubmitSkillPage.tsx';
import { CreatorProfilePage } from './pages/CreatorProfilePage.tsx';
import { ChatPage } from './pages/ChatPage.tsx';
import { ProjectsPage } from './pages/ProjectsPage.tsx';
import { ProjectDetailPage } from './pages/ProjectDetailPage.tsx';
import { TeamSettingsPage } from './pages/TeamSettingsPage.tsx';
import { AdminSecurityPage } from './pages/AdminSecurityPage.tsx';
import { AuthPage } from './pages/AuthPage.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

export function App() {
  const { path } = useRouter();

  // Route matchers
  const skillDetailMatch = path.match(/^\/skills\/([a-zA-Z0-9_-]+)$/);
  const projectDetailMatch = path.match(/^\/projects\/([a-zA-Z0-9_-]+)$/);
  const creatorProfileMatch = path.match(/^\/creators\/([a-zA-Z0-9_-]+)$/);

  let PageComponent = <HomePage />;
  const isChatPage = path === '/chat';

  if (skillDetailMatch) {
    const slug = skillDetailMatch[1];
    PageComponent = <SkillDetailPage slug={slug} />;
  } else if (projectDetailMatch) {
    PageComponent = <ProjectDetailPage />;
  } else if (creatorProfileMatch) {
    PageComponent = <CreatorProfilePage />;
  } else if (path === '/skills') {
    PageComponent = <SkillsPage />;
  } else if (path === '/categories') {
    PageComponent = <CategoriesPage />;
  } else if (path === '/mcp' || path.startsWith('/docs')) {
    PageComponent = <McpHubPage />;
  } else if (path === '/dashboard' || path === '/workspace') {
    PageComponent = <DashboardPage />;
  } else if (path === '/library') {
    PageComponent = <LibraryPage />;
  } else if (path === '/creator' || path === '/sell') {
    PageComponent = <CreatorStudioPage />;
  } else if (path === '/creator/submit') {
    PageComponent = <SubmitSkillPage />;
  } else if (path === '/chat') {
    PageComponent = <ChatPage />;
  } else if (path === '/projects') {
    PageComponent = <ProjectsPage />;
  } else if (path === '/settings' || path === '/team') {
    PageComponent = <TeamSettingsPage />;
  } else if (path === '/admin' || path === '/security') {
    PageComponent = <AdminSecurityPage />;
  } else if (path === '/auth') {
    PageComponent = <AuthPage />;
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
