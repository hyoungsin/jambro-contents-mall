import { useEffect, useState } from 'react';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import MainPage from './pages/MainPage.jsx';
import AdminDashboardPage from './pages/AdminDashboardPage.jsx';
import LockerPage from './pages/LockerPage.jsx';
import CourseDetailPage from './pages/CourseDetailPage.jsx';
import CheckoutPage from './pages/CheckoutPage.jsx';
import MyLearningPage from './pages/MyLearningPage.jsx';
import PurchaseBenefitsPage from './pages/PurchaseBenefitsPage.jsx';

function App() {
  const [view, setView] = useState('main'); // 'login' | 'signup' | 'main' | 'admin' | 'locker' | 'courseDetail' | 'checkout' | 'learning' | 'purchaseBenefits'
  /** 회원가입 직후 로그인 화면에 한 번 표시할 메시지 */
  const [postSignupMessage, setPostSignupMessage] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [courseDetailId, setCourseDetailId] = useState(null);
  /** 강의 상세 진입 경로 — 뒤로가기 시 복귀 화면 (메인 vs 내학습 등) */
  const [courseDetailEntry, setCourseDetailEntry] = useState('main');
  const [checkoutCourseId, setCheckoutCourseId] = useState(null);
  /** 장바구니에서 선택한 장바구니 라인 _id 목록 (다건 결제) */
  const [checkoutLockerItemIds, setCheckoutLockerItemIds] = useState(null);

  useEffect(() => {
    // 새로고침 시 로그인 유지 (localStorage/sessionStorage)
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const userJson = localStorage.getItem('authUser') || sessionStorage.getItem('authUser');
    if (token && userJson) {
      try {
        setCurrentUser(JSON.parse(userJson));
        setView('main');
      } catch {
        // ignore
      }
    }
  }, []);

  const handleLoginSuccess = ({ token, user }) => {
    localStorage.setItem('authToken', token);
    localStorage.setItem('authUser', JSON.stringify(user));
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');

    setPostSignupMessage('');
    setCurrentUser(user);
    setView('main');
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('authUser');
    setCurrentUser(null);
    setView('main');
  };

  if (view === 'signup') {
    return (
      <SignupPage
        onNavigateMain={() => setView('main')}
        onNavigateLogin={() => setView('login')}
        onSignupSuccess={() => {
          setPostSignupMessage('회원가입을 축하합니다.');
          setView('login');
        }}
      />
    );
  }

  if (view === 'main') {
    return (
      <MainPage
        user={currentUser}
        onLogout={handleLogout}
        onNavigateLogin={() => {
          setPostSignupMessage('');
          setView('login');
        }}
        onNavigateSignup={() => setView('signup')}
        onNavigateAdmin={() => setView('admin')}
        onNavigateLocker={() => setView('locker')}
        onNavigateMyLearning={() => setView('learning')}
        onNavigatePurchaseBenefits={() => setView('purchaseBenefits')}
        onOpenCourseDetail={(id) => {
          setCourseDetailEntry('main');
          setCourseDetailId(id);
          setView('courseDetail');
        }}
      />
    );
  }

  if (view === 'courseDetail' && courseDetailId) {
    return (
      <CourseDetailPage
        courseId={courseDetailId}
        user={currentUser}
        backLabel={courseDetailEntry === 'learning' ? '내학습' : '강좌 목록'}
        backIcon={courseDetailEntry === 'learning' ? '🎓' : '📚'}
        onBack={() => {
          setCourseDetailId(null);
          setCheckoutCourseId(null);
          setCheckoutLockerItemIds(null);
          setView(courseDetailEntry === 'learning' ? 'learning' : 'main');
        }}
        onLogout={handleLogout}
        onNavigateAdmin={() => setView('admin')}
        onNavigateLocker={() => {
          setCheckoutCourseId(null);
          setCheckoutLockerItemIds(null);
          setView('locker');
        }}
        onCheckout={(cid) => {
          setCheckoutLockerItemIds(null);
          setCheckoutCourseId(cid);
          setView('checkout');
        }}
      />
    );
  }

  if (
    view === 'checkout' &&
    (checkoutCourseId || (Array.isArray(checkoutLockerItemIds) && checkoutLockerItemIds.length > 0))
  ) {
    return (
      <CheckoutPage
        courseId={checkoutCourseId}
        lockerCartItemIds={checkoutLockerItemIds}
        user={currentUser}
        onBack={() => {
          if (checkoutLockerItemIds?.length) {
            setCheckoutLockerItemIds(null);
            setView('locker');
          } else {
            setView('courseDetail');
          }
        }}
        onLogout={handleLogout}
        onNavigateAdmin={() => setView('admin')}
        onNavigateLocker={() => {
          setCheckoutLockerItemIds(null);
          setCheckoutCourseId(null);
          setView('locker');
        }}
        onNavigateMyLearning={() => setView('learning')}
      />
    );
  }

  if (view === 'locker') {
    return (
      <LockerPage
        user={currentUser}
        onBackToMain={() => setView('main')}
        onLogout={handleLogout}
        onNavigateAdmin={() => setView('admin')}
        onProceedToCheckout={(ids) => {
          setCheckoutCourseId(null);
          setCheckoutLockerItemIds(ids);
          setView('checkout');
        }}
      />
    );
  }

  if (view === 'learning') {
    return (
      <MyLearningPage
        user={currentUser}
        onBackToMain={() => setView('main')}
        onLogout={handleLogout}
        onNavigateAdmin={() => setView('admin')}
        onOpenCourseDetail={(id) => {
          setCourseDetailEntry('learning');
          setCourseDetailId(id);
          setView('courseDetail');
        }}
      />
    );
  }

  if (view === 'purchaseBenefits') {
    return (
      <PurchaseBenefitsPage
        user={currentUser}
        onBackToMain={() => setView('main')}
        onLogout={handleLogout}
        onNavigateAdmin={() => setView('admin')}
      />
    );
  }

  if (view === 'admin') {
    return (
      <AdminDashboardPage
        user={currentUser}
        onLogout={handleLogout}
        onBackToMain={() => setView('main')}
      />
    );
  }

  return (
    <LoginPage
      onNavigateMain={() => setView('main')}
      postSignupMessage={postSignupMessage}
      onClearPostSignupMessage={() => setPostSignupMessage('')}
      onNavigateSignup={() => {
        setPostSignupMessage('');
        setView('signup');
      }}
      onLoginSuccess={handleLoginSuccess}
    />
  );
}

export default App;
