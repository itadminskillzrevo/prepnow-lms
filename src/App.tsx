import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";

// Pages
import Index from "./pages/Index";
import Welcome from "./pages/Welcome";
import LaunchSoon from "./pages/LaunchSoon";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Courses from "./pages/Courses";
import CourseDetail from "./pages/CourseDetail";
import CoursePayment from "./pages/CoursePayment";
import MyCourses from "./pages/MyCourses";
import Profile from "./pages/Profile";
import Notifications from "./pages/Notifications";
import CreateCourse from "./pages/CreateCourse";
import CourseEditor from "./pages/CourseEditor";
import LessonViewer from "./pages/LessonViewer";
import InstructorAnalytics from "./pages/InstructorAnalytics";
import InstructorStudents from "./pages/InstructorStudents";
import BatchManagement from "./pages/BatchManagement";
import BatchDetail from "./pages/BatchDetail";
import LiveClassManagement from "./pages/LiveClassManagement";
import AcademicCalendar from "./pages/AcademicCalendar";
import MyBatches from "./pages/MyBatches";
import CurriculumManagement from "./pages/CurriculumManagement";
import CurriculumEditor from "./pages/CurriculumEditor";
import AdminEnrollments from "./pages/AdminEnrollments";
import AdminStudentProgress from "./pages/AdminStudentProgress";
import AdminAnalytics from "./pages/AdminAnalytics";
import AdminCourseStudents from "./pages/AdminCourseStudents";
import AdminBatchStudents from "./pages/AdminBatchStudents";
import AdminUserDashboard from "./pages/AdminUserDashboard";
import NotFound from "./pages/NotFound";

// New Tabbed Pages

import Approvals from "./pages/Approvals";
import Users from "./pages/Users";
import Settings from "./pages/Settings";
import Certificate from "./pages/Certificate";
import Announcements from "./pages/Announcements";
import CouponManagement from "./pages/CouponManagement";
import Examination from "./pages/Examination";
import FinanceManagement from "./pages/FinanceManagement";

// Jr (School Student) Module
import { JrAuthProvider } from "@/jr/contexts/JrAuthContext";
import { JrProtectedRoute } from "@/jr/components/JrProtectedRoute";
import JrLanding from "./jr/pages/JrLanding";
import JrAuth from "./jr/pages/JrAuth";
import JrAdminAuth from "./jr/pages/JrAdminAuth";
import JrAbout from "./jr/pages/JrAbout";
import JrContact from "./jr/pages/JrContact";
import JrDashboard from "./jr/pages/JrDashboard";
import JrCourses from "./jr/pages/JrCourses";
import JrCourseDetail from "./jr/pages/JrCourseDetail";
import JrLessonViewer from "./jr/pages/JrLessonViewer";
import JrQuizzes from "./jr/pages/JrQuizzes";
import JrAssignments from "./jr/pages/JrAssignments";
import JrAdminLayout, { JrAdminOverview } from "./jr/pages/admin/JrAdminLayout";
import JrAdminCategories from "./jr/pages/admin/JrAdminCategories";
import JrAdminCourses from "./jr/pages/admin/JrAdminCourses";
import JrAdminQuizzes from "./jr/pages/admin/JrAdminQuizzes";
import JrAdminAssignments from "./jr/pages/admin/JrAdminAssignments";
import JrAdminStudents from "./jr/pages/admin/JrAdminStudents";
import JrAdminCurriculum from "./jr/pages/admin/JrAdminCurriculum";
import JrAdminCourseStudents from "./jr/pages/admin/JrAdminCourseStudents";
import JrAdminApprovals from "./jr/pages/admin/JrAdminApprovals";
import JrProfile from "./jr/pages/JrProfile";
import JrPayment from "./jr/pages/JrPayment";
import JrMyCourses from "./jr/pages/JrMyCourses";
import JrCertificates from "./jr/pages/JrCertificates";

// Selfpaced (E-commerce style) Module
import { SpAuthProvider } from "@/selfpaced/contexts/SpAuthContext";
import { SpProtectedRoute } from "@/selfpaced/components/SpProtectedRoute";
import { SpLayout } from "@/selfpaced/components/SpLayout";
import SpLanding from "./selfpaced/pages/SpLanding";
import SpAuth from "./selfpaced/pages/SpAuth";
import SpAdminAuth from "./selfpaced/pages/SpAdminAuth";
import SpCourses from "./selfpaced/pages/SpCourses";
import SpCourseDetail from "./selfpaced/pages/SpCourseDetail";
import SpCart from "./selfpaced/pages/SpCart";
import SpWishlist from "./selfpaced/pages/SpWishlist";
import SpCheckout from "./selfpaced/pages/SpCheckout";
import SpOrders from "./selfpaced/pages/SpOrders";
import SpOrderDetail from "./selfpaced/pages/SpOrderDetail";
import SpDashboard from "./selfpaced/pages/SpDashboard";
import SpMyCourses from "./selfpaced/pages/SpMyCourses";
import SpProfile from "./selfpaced/pages/SpProfile";
import SpLearn from "./selfpaced/pages/SpLearn";
import SpQuizzes from "./selfpaced/pages/SpQuizzes";
import SpAssignments from "./selfpaced/pages/SpAssignments";
import SpCertificates from "./selfpaced/pages/SpCertificates";
import { SpDashboardShell } from "./selfpaced/components/SpDashboardShell";
import { SpAdminLayout, SpAdminOverview } from "./selfpaced/pages/admin/SpAdminLayout";
import SpAdminCategories from "./selfpaced/pages/admin/SpAdminCategories";
import SpAdminCourses from "./selfpaced/pages/admin/SpAdminCourses";
import SpAdminCurriculum from "./selfpaced/pages/admin/SpAdminCurriculum";
import SpAdminStudents from "./selfpaced/pages/admin/SpAdminStudents";
import SpAdminUsers from "./selfpaced/pages/admin/SpAdminUsers";
import SpAdminCourseStudents from "./selfpaced/pages/admin/SpAdminCourseStudents";
import SpAdminOrders from "./selfpaced/pages/admin/SpAdminOrders";
import SpAdminCoupons from "./selfpaced/pages/admin/SpAdminCoupons";
import { SpAdminQuizzes, SpAdminAssignments } from "./selfpaced/pages/admin/SpAdminPlaceholders";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <JrAuthProvider>
        <SpAuthProvider>
        <ThemeProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
              {/* Public Routes */}
              <Route path="/" element={<Welcome />} />
              <Route path="/home" element={<Index />} />
              <Route path="/launch-soon" element={<LaunchSoon />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/courses" element={<Courses />} />
              <Route path="/courses/:courseId" element={<CourseDetail />} />

              {/* Protected Routes */}
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/my-courses" element={<ProtectedRoute><MyCourses /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
              <Route path="/courses/create" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'superadmin']}><CreateCourse /></ProtectedRoute>} />
              <Route path="/courses/:courseId/edit" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'superadmin']}><CourseEditor /></ProtectedRoute>} />
              <Route path="/courses/:courseId/lessons/:lessonId" element={<ProtectedRoute><LessonViewer /></ProtectedRoute>} />
              <Route path="/courses/:courseId/payment" element={<ProtectedRoute><CoursePayment /></ProtectedRoute>} />

              {/* Instructor Routes */}
              <Route path="/instructor/analytics" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'superadmin']}><InstructorAnalytics /></ProtectedRoute>} />
              <Route path="/instructor/students" element={<ProtectedRoute allowedRoles={['instructor', 'admin', 'superadmin']}><InstructorStudents /></ProtectedRoute>} />

              {/* Admin Routes */}
              <Route path="/admin/curriculum" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><CurriculumManagement /></ProtectedRoute>} />
              <Route path="/admin/curriculum/:curriculumId/edit" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><CurriculumEditor /></ProtectedRoute>} />
              <Route path="/admin/batches" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><BatchManagement /></ProtectedRoute>} />
              <Route path="/admin/batches/:batchId" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><BatchDetail /></ProtectedRoute>} />
              <Route path="/batches/:batchId" element={<ProtectedRoute><BatchDetail /></ProtectedRoute>} />
              <Route path="/admin/enroll-users" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminEnrollments /></ProtectedRoute>} />
              <Route path="/admin/courses/:courseId/students" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminCourseStudents /></ProtectedRoute>} />
              <Route path="/admin/batches/:batchId/students" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminBatchStudents /></ProtectedRoute>} />
              <Route path="/admin/user-dashboard/:userId" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminUserDashboard /></ProtectedRoute>} />
              <Route path="/admin/live-classes" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><LiveClassManagement /></ProtectedRoute>} />
              
              <Route path="/admin/users" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Users /></ProtectedRoute>} />
              <Route path="/calendar" element={<ProtectedRoute><AcademicCalendar /></ProtectedRoute>} />
              <Route path="/admin/approvals" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Approvals /></ProtectedRoute>} />
              <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminAnalytics /></ProtectedRoute>} />
              <Route path="/admin/students" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><AdminStudentProgress /></ProtectedRoute>} />
              <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><Settings /></ProtectedRoute>} />
              <Route path="/admin/announcements" element={<ProtectedRoute allowedRoles={['admin', 'superadmin', 'instructor']}><Announcements /></ProtectedRoute>} />
              <Route path="/admin/coupons" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><CouponManagement /></ProtectedRoute>} />
              <Route path="/certificates" element={<ProtectedRoute><Certificate /></ProtectedRoute>} />
              <Route path="/my-batches" element={<ProtectedRoute><MyBatches /></ProtectedRoute>} />
              <Route path="/examination" element={<ProtectedRoute><Examination /></ProtectedRoute>} />
              <Route path="/admin/finance" element={<ProtectedRoute allowedRoles={['admin', 'superadmin']}><FinanceManagement /></ProtectedRoute>} />


              {/* Jr (School Student Class 6-12) Module */}
              <Route path="/jr" element={<JrLanding />} />
              <Route path="/jr/auth" element={<JrAuth />} />
              <Route path="/jr/about" element={<JrAbout />} />
              <Route path="/jr/contact" element={<JrContact />} />
              <Route path="/jr/courses" element={<JrCourses />} />
              <Route path="/jr/courses/:courseId" element={<JrCourseDetail />} />
              <Route path="/jr/courses/:courseId/lessons/:lessonId" element={<JrProtectedRoute><JrLessonViewer /></JrProtectedRoute>} />
              <Route path="/jr/courses/:courseId/payment" element={<JrProtectedRoute><JrPayment /></JrProtectedRoute>} />
              <Route path="/jr/dashboard" element={<JrProtectedRoute><JrDashboard /></JrProtectedRoute>} />
              <Route path="/jr/my-courses" element={<JrProtectedRoute><JrMyCourses /></JrProtectedRoute>} />
              <Route path="/jr/certificates" element={<JrProtectedRoute><JrCertificates /></JrProtectedRoute>} />
              <Route path="/jr/profile" element={<JrProtectedRoute><JrProfile /></JrProtectedRoute>} />
              <Route path="/jr/quizzes" element={<JrProtectedRoute><JrQuizzes /></JrProtectedRoute>} />
              <Route path="/jr/assignments" element={<JrProtectedRoute><JrAssignments /></JrProtectedRoute>} />
              <Route path="/jr/admin/login" element={<JrAdminAuth />} />
              <Route path="/jr/admin" element={<JrProtectedRoute allowedRoles={['jr_admin']}><JrAdminLayout /></JrProtectedRoute>}>
                <Route index element={<JrAdminOverview />} />
                <Route path="categories" element={<JrAdminCategories />} />
                <Route path="courses" element={<JrAdminCourses />} />
                <Route path="courses/:courseId/curriculum" element={<JrAdminCurriculum />} />
                <Route path="courses/:courseId/students" element={<JrAdminCourseStudents />} />
                <Route path="quizzes" element={<JrAdminQuizzes />} />
                <Route path="assignments" element={<JrAdminAssignments />} />
                <Route path="students" element={<JrAdminStudents />} />
                <Route path="approvals" element={<JrAdminApprovals />} />
              </Route>

              {/* Selfpaced (E-commerce) Module */}
              <Route path="/selfpaced/auth" element={<SpAuth />} />
              <Route path="/selfpaced/admin/login" element={<SpAdminAuth />} />
              <Route path="/selfpaced" element={<SpLayout />}>
                <Route index element={<SpLanding />} />
                <Route path="courses" element={<SpCourses />} />
                <Route path="courses/:courseId" element={<SpCourseDetail />} />
                <Route path="cart" element={<SpCart />} />
                <Route path="wishlist" element={<SpProtectedRoute><SpWishlist /></SpProtectedRoute>} />
                <Route path="checkout" element={<SpProtectedRoute><SpCheckout /></SpProtectedRoute>} />
                <Route path="orders" element={<SpProtectedRoute><SpOrders /></SpProtectedRoute>} />
                <Route path="orders/:orderId" element={<SpProtectedRoute><SpOrderDetail /></SpProtectedRoute>} />
                <Route element={<SpProtectedRoute><SpDashboardShell /></SpProtectedRoute>}>
                  <Route path="dashboard" element={<SpDashboard />} />
                  <Route path="my-courses" element={<SpMyCourses />} />
                  <Route path="quizzes" element={<SpQuizzes />} />
                  <Route path="assignments" element={<SpAssignments />} />
                  <Route path="certificates" element={<SpCertificates />} />
                  <Route path="profile" element={<SpProfile />} />
                </Route>
                <Route path="learn/:courseId" element={<SpProtectedRoute><SpLearn /></SpProtectedRoute>} />
                <Route path="learn/:courseId/:lessonId" element={<SpProtectedRoute><SpLearn /></SpProtectedRoute>} />
              </Route>
              <Route path="/selfpaced/admin" element={<SpProtectedRoute allowedRoles={['sp_admin']}><SpAdminLayout /></SpProtectedRoute>}>
                <Route index element={<SpAdminOverview />} />
                <Route path="categories" element={<SpAdminCategories />} />
                <Route path="courses" element={<SpAdminCourses />} />
                <Route path="courses/:courseId/curriculum" element={<SpAdminCurriculum />} />
                <Route path="courses/:courseId/students" element={<SpAdminCourseStudents />} />
                <Route path="students" element={<SpAdminStudents />} />
                <Route path="users" element={<SpAdminUsers />} />
                <Route path="orders" element={<SpAdminOrders />} />
                <Route path="coupons" element={<SpAdminCoupons />} />
                <Route path="quizzes" element={<SpAdminQuizzes />} />
                <Route path="assignments" element={<SpAdminAssignments />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </ThemeProvider>
        </SpAuthProvider>
      </JrAuthProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
