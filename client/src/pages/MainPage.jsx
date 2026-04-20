import { useState } from 'react';
import '../App.css';
import MainHeader from '../components/main/navbar.jsx';
import HeroSection from '../components/main/hero.jsx';
import AllCoursesSection from '../components/main/courses.jsx';
import NewsletterSection from '../components/main/newsletter.jsx';
import Footer from '../components/main/Footer.jsx';

function MainPage({
  user,
  onLogout,
  onNavigateLogin,
  onNavigateSignup,
  onNavigateAdmin,
  onNavigateLocker,
  onNavigateMyLearning,
  onNavigatePurchaseBenefits,
  onOpenCourseDetail,
}) {
  const [isCoursesOpen, setIsCoursesOpen] = useState(false);
  const [isNewsletterOpen, setIsNewsletterOpen] = useState(false);

  return (
    <div className="main-bg">
      <div className="main-shell">
        <MainHeader
          user={user}
          onLogout={onLogout}
          onAdminClick={onNavigateAdmin}
          onNavigateLogin={onNavigateLogin}
          onNavigateSignup={onNavigateSignup}
          onNavigateLocker={onNavigateLocker}
          onNavigateMyLearning={onNavigateMyLearning}
          onNavigatePurchaseBenefits={onNavigatePurchaseBenefits}
          onToggleCourses={() => {
            setIsCoursesOpen((prev) => {
              const next = !prev;
              if (next) setIsNewsletterOpen(false);
              return next;
            });
          }}
          onCloseCourses={() => setIsCoursesOpen(false)}
          isCoursesOpen={isCoursesOpen}
          onToggleNewsletter={() => {
            setIsNewsletterOpen((prev) => {
              const next = !prev;
              if (next) setIsCoursesOpen(false);
              return next;
            });
          }}
          onCloseNewsletter={() => setIsNewsletterOpen(false)}
          isNewsletterOpen={isNewsletterOpen}
        />

        <main className="main-content">
          <HeroSection user={user} />
          <AllCoursesSection onSelectCourse={onOpenCourseDetail} />
          <section
            id="section-benefits"
            className="main-anchor-section"
            aria-labelledby="main-benefits-title"
          >
            <h2 id="main-benefits-title" className="main-anchor-title">
              혜택
            </h2>
            <p className="helper-text" style={{ margin: 0 }}>
              회원 혜택·이벤트 안내 영역은 준비 중입니다.
            </p>
          </section>
          <NewsletterSection />
        </main>
      </div>
      <Footer onSignUpClick={onNavigateSignup} />
    </div>
  );
}

export default MainPage;

