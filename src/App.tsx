import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { MainLayout } from './components/layout/MainLayout';
import { AdminLayout } from './components/layout/AdminLayout';

// Public Pages
import { HomePage } from './pages/HomePage';
import { ExplorePage } from './pages/ExplorePage';
import { SearchPage } from './pages/SearchPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { CategoryDetailPage } from './pages/CategoryDetailPage';
import { WatchPage } from './pages/WatchPage';
import { ChannelPage } from './pages/ChannelPage';
import { PlaylistsPage } from './pages/PlaylistsPage';
import { PlaylistDetailPage } from './pages/PlaylistDetailPage';
import { WatchLaterPage } from './pages/WatchLaterPage';
import { HistoryPage } from './pages/HistoryPage';
import { ContinueWatchingPage } from './pages/ContinueWatchingPage';
import { MyPlaylistsPage } from './pages/MyPlaylistsPage';
import { ProfilePage } from './pages/ProfilePage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { AboutPage } from './pages/AboutPage';
import { ContactPage } from './pages/ContactPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { ReportVideoPage } from './pages/ReportVideoPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Admin Pages
import { AdminLoginPage } from './pages/admin/AdminLoginPage';
import { AdminDashboardPage } from './pages/admin/AdminDashboardPage';
import { AdminVideosPage } from './pages/admin/AdminVideosPage';
import { AdminAddVideoPage } from './pages/admin/AdminAddVideoPage';
import { AdminEditVideoPage } from './pages/admin/AdminEditVideoPage';
import { AdminCategoriesPage } from './pages/admin/AdminCategoriesPage';
import { AdminHomepageCMSPage } from './pages/admin/AdminHomepageCMSPage';
import { AdminReportsPage } from './pages/admin/AdminReportsPage';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminAuditLogsPage } from './pages/admin/AdminAuditLogsPage';
import { AdminSettingsPage } from './pages/admin/AdminSettingsPage';

import { ScrollToTop } from './components/common/ScrollToTop';
import { RouteLoadingBar } from './components/common/RouteLoadingBar';

export function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <RouteLoadingBar />
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public Layout Routes */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/explore" element={<ExplorePage />} />
              <Route path="/search" element={<SearchPage />} />
              <Route path="/categories" element={<CategoriesPage />} />
              <Route path="/categories/:slug" element={<CategoryDetailPage />} />
              <Route path="/watch/:videoId" element={<WatchPage />} />
              <Route path="/channels/:channelId" element={<ChannelPage />} />
              <Route path="/playlists" element={<PlaylistsPage />} />
              <Route path="/playlists/:playlistId" element={<PlaylistDetailPage />} />
              <Route path="/watch-later" element={<WatchLaterPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/continue-watching" element={<ContinueWatchingPage />} />
              <Route path="/my-playlists" element={<MyPlaylistsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ForgotPasswordPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/report-video/:videoId" element={<ReportVideoPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>

            {/* Standalone Admin Login */}
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* Protected Admin CMS Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="videos" element={<AdminVideosPage />} />
              <Route path="videos/new" element={<AdminAddVideoPage />} />
              <Route path="videos/:id/edit" element={<AdminEditVideoPage />} />
              <Route path="categories" element={<AdminCategoriesPage />} />
              <Route path="homepage" element={<AdminHomepageCMSPage />} />
              <Route path="collections" element={<AdminHomepageCMSPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
