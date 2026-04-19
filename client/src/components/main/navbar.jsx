import { useEffect, useRef, useState } from 'react';
import logo from '../../assets/logo.png';
import { COURSES_NAV_EVENT } from './courses.jsx';
import { NEWSLETTER_NAV_EVENT } from './newsletter.jsx';

function scrollToSection(sectionId) {
  const el = document.getElementById(sectionId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function MainHeader({
  user,
  onLogout,
  onAdminClick,
  onToggleCourses,
  onCloseCourses,
  isCoursesOpen = false,
  onToggleNewsletter,
  onCloseNewsletter,
  isNewsletterOpen = false,
  showUserActions = true,
  onNavigateLocker,
  onNavigateMyLearning,
  onNavigatePurchaseBenefits,
}) {
  const displayName = user?.name ? `${user.name}님 반갑습니다.` : '환영합니다.';
  const isAdmin = user?.userType === 'admin';
  const navWrapperRef = useRef(null);
  const userBarRef = useRef(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    if (!isNewsletterOpen && !isCoursesOpen) return undefined;

    const handlePointerDownOutside = (event) => {
      if (!navWrapperRef.current) return;
      if (navWrapperRef.current.contains(event.target)) return;
      onCloseNewsletter?.();
      onCloseCourses?.();
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isNewsletterOpen, isCoursesOpen, onCloseNewsletter, onCloseCourses]);

  useEffect(() => {
    if (!isAccountOpen) return undefined;

    const handlePointerDownOutside = (event) => {
      if (!userBarRef.current) return;
      if (userBarRef.current.contains(event.target)) return;
      setIsAccountOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDownOutside);
    document.addEventListener('touchstart', handlePointerDownOutside);
    return () => {
      document.removeEventListener('mousedown', handlePointerDownOutside);
      document.removeEventListener('touchstart', handlePointerDownOutside);
    };
  }, [isAccountOpen]);

  const closeAccountMenu = () => setIsAccountOpen(false);

  const goToLocker = () => {
    closeAccountMenu();
    onCloseCourses?.();
    onCloseNewsletter?.();
    onNavigateLocker?.();
  };

  const goToMyLearning = () => {
    if (typeof onNavigateMyLearning === 'function') {
      closeAccountMenu();
      onCloseCourses?.();
      onCloseNewsletter?.();
      onNavigateMyLearning();
      return;
    }
    window.dispatchEvent(new CustomEvent(COURSES_NAV_EVENT, { detail: { groupId: 'all' } }));
    scrollToSection('section-all-courses');
    closeAccountMenu();
    onCloseCourses?.();
    onCloseNewsletter?.();
  };

  const goToPurchaseBenefits = () => {
    closeAccountMenu();
    onCloseCourses?.();
    onCloseNewsletter?.();
    if (typeof onNavigatePurchaseBenefits === 'function') {
      onNavigatePurchaseBenefits();
      return;
    }
    scrollToSection('section-benefits');
  };

  const toggleAccountMenu = () => {
    setIsAccountOpen((open) => {
      const next = !open;
      if (next) {
        onCloseCourses?.();
        onCloseNewsletter?.();
      }
      return next;
    });
  };

  const goToCoursesGroup = (groupId) => {
    window.dispatchEvent(new CustomEvent(COURSES_NAV_EVENT, { detail: { groupId } }));
    scrollToSection('section-all-courses');
    onCloseCourses?.();
  };

  const goToNewsletterCategory = (categoryId) => {
    window.dispatchEvent(
      new CustomEvent(NEWSLETTER_NAV_EVENT, { detail: { categoryId } }),
    );
    scrollToSection('section-newsletter');
    onCloseNewsletter?.();
  };

  return (
    <header className="main-topbar">
      <div className="main-left">
        <button
          type="button"
          className="main-icon-btn main-hamburger"
          aria-label="menu"
        >
          ☰
        </button>

        <button
          type="button"
          className="main-logo"
          aria-label="맨 위로, 메인 화면"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <img className="main-logo-img" src={logo} alt="Jambro" />
        </button>
      </div>

      <div
        ref={navWrapperRef}
        className="main-nav-wrapper"
        onMouseLeave={() => {
          if (isNewsletterOpen) onCloseNewsletter?.();
          if (isCoursesOpen) onCloseCourses?.();
        }}
      >
        <nav className="main-nav" aria-label="main navigation">
          <a className="main-nav-link main-nav-link--plain" href="#">
            About Jambro
          </a>
          <button
            type="button"
            className="main-nav-link main-nav-link-button main-nav-link--accent"
            onClick={onToggleCourses}
          >
            All Courses
            <span
              className={
                isCoursesOpen ? 'nav-caret nav-caret-open' : 'nav-caret'
              }
            >
              ▾
            </span>
          </button>
          <button
            type="button"
            className="main-nav-link main-nav-link-button main-nav-link--accent"
            onClick={onToggleNewsletter}
          >
            Newsletter
            <span
              className={
                isNewsletterOpen ? 'nav-caret nav-caret-open' : 'nav-caret'
              }
            >
              ▾
            </span>
          </button>
          <a className="main-nav-link main-nav-link--plain" href="#footer-tags">
            Tags
          </a>
        </nav>

        {isCoursesOpen && (
          <div className="courses-dropdown">
            <button
              type="button"
              className="courses-dropdown-item courses-dropdown-item--action"
              onClick={() => goToCoursesGroup('all')}
            >
              <span className="newsletter-icon-plain" aria-hidden>
                📚
              </span>
              <div className="courses-dropdown-text">
                <div className="courses-dropdown-title">전체 강좌</div>
                <div className="courses-dropdown-desc">카테고리별 최종본 강의 모두 보기</div>
              </div>
            </button>
            <button
              type="button"
              className="courses-dropdown-item courses-dropdown-item--action"
              onClick={() => goToCoursesGroup('video')}
            >
              <span className="newsletter-icon-plain" aria-hidden>
                🎬
              </span>
              <div className="courses-dropdown-text">
                <div className="courses-dropdown-title">영상콘텐츠 제작</div>
                <div className="courses-dropdown-desc">AI 기반 영상 제작 실무 과정</div>
              </div>
            </button>
            <button
              type="button"
              className="courses-dropdown-item courses-dropdown-item--action"
              onClick={() => goToCoursesGroup('agent')}
            >
              <span className="newsletter-icon-plain" aria-hidden>
                🤖
              </span>
              <div className="courses-dropdown-text">
                <div className="courses-dropdown-title">에이전트 제작</div>
                <div className="courses-dropdown-desc">요구사항부터 구현까지 에이전트 빌드</div>
              </div>
            </button>
            <button
              type="button"
              className="courses-dropdown-item courses-dropdown-item--action"
              onClick={() => goToCoursesGroup('automation')}
            >
              <span className="newsletter-icon-plain" aria-hidden>
                ⚙️
              </span>
              <div className="courses-dropdown-text">
                <div className="courses-dropdown-title">업무자동화 구현</div>
                <div className="courses-dropdown-desc">실무 자동화를 위한 워크플로우 설계</div>
              </div>
            </button>
            <button
              type="button"
              className="courses-dropdown-item courses-dropdown-item--action"
              onClick={() => goToCoursesGroup('native')}
            >
              <span className="newsletter-icon-plain" aria-hidden>
                🚀
              </span>
              <div className="courses-dropdown-text">
                <div className="courses-dropdown-title">AI Native</div>
                <div className="courses-dropdown-desc">AI 중심 업무/콘텐츠 운영 방식</div>
              </div>
            </button>
          </div>
        )}

        {isNewsletterOpen && (
          <div className="newsletter-dropdown">
            <button
              type="button"
              className="newsletter-item newsletter-item--action"
              onClick={() => goToNewsletterCategory('trend')}
            >
              <span className="newsletter-icon-plain" aria-hidden>📈</span>
              <div className="newsletter-item-text">
                <div className="newsletter-item-title">AI 최신Trend</div>
                <div className="newsletter-item-desc">
                  AI 업계 최신 동향과 트렌드를 빠르게 전달합니다
                </div>
              </div>
            </button>
            <button
              type="button"
              className="newsletter-item newsletter-item--action"
              onClick={() => goToNewsletterCategory('model')}
            >
              <span className="newsletter-icon-plain" aria-hidden>🧠</span>
              <div className="newsletter-item-text">
                <div className="newsletter-item-title">AI모델성능</div>
                <div className="newsletter-item-desc">
                  주요 AI 모델의 성능 비교와 벤치마크 분석
                </div>
              </div>
            </button>
            <button
              type="button"
              className="newsletter-item newsletter-item--action"
              onClick={() => goToNewsletterCategory('usecase')}
            >
              <span className="newsletter-icon-plain" aria-hidden>💡</span>
              <div className="newsletter-item-text">
                <div className="newsletter-item-title">AI활용사례</div>
                <div className="newsletter-item-desc">
                  실제 비즈니스에서 AI를 활용한 성공 사례
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {showUserActions && (
        <div className="main-right" ref={userBarRef}>
          <div className="main-user">{displayName}</div>
          <div className="main-actions main-actions--toolbar">
            <div className="main-account-wrap">
              <button
                type="button"
                className="main-account-trigger"
                aria-expanded={isAccountOpen}
                aria-haspopup="menu"
                aria-controls="main-account-menu"
                onClick={toggleAccountMenu}
              >
                My account
                <span className={isAccountOpen ? 'nav-caret nav-caret-open' : 'nav-caret'} aria-hidden>
                  ▾
                </span>
              </button>

              {isAccountOpen && (
                <div
                  id="main-account-menu"
                  className="main-account-dropdown"
                  role="menu"
                  aria-label="계정 메뉴"
                >
                  <button type="button" className="main-account-item" role="menuitem" onClick={goToMyLearning}>
                    <span className="main-account-item-icon main-account-item-icon--learn" aria-hidden>
                      🎓
                    </span>
                    <span>내학습</span>
                  </button>
                  <button type="button" className="main-account-item" role="menuitem" onClick={goToLocker}>
                    <span className="main-account-item-icon main-account-item-icon--cart" aria-hidden>
                      🛒
                    </span>
                    <span>장바구니</span>
                  </button>
                  <button type="button" className="main-account-item" role="menuitem" onClick={goToPurchaseBenefits}>
                    <span className="main-account-item-icon main-account-item-icon--gift" aria-hidden>
                      🎁
                    </span>
                    <span>구매/혜택</span>
                  </button>
                  <div className="main-account-sep" role="presentation" />
                  <button
                    type="button"
                    className="main-account-item main-account-item--danger"
                    role="menuitem"
                    onClick={() => {
                      closeAccountMenu();
                      onLogout?.();
                    }}
                  >
                    <span className="main-account-item-icon" aria-hidden>
                      ↪
                    </span>
                    <span>로그아웃</span>
                  </button>
                </div>
              )}
            </div>

            {isAdmin && (
              <button type="button" className="main-admin-btn" onClick={onAdminClick}>
                Admin
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

export default MainHeader;

