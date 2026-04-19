import { useId } from 'react';

const TAG_LINKS = [
  { label: 'CHATGPT', href: '#' },
  { label: 'GEMINI', href: '#' },
  { label: 'GENSPARK', href: '#' },
];

const NAV_LINKS = [
  { label: 'ABOUT JAMBRO', href: '#' },
  { label: 'CONTACT', href: '#' },
];

/** YouTube: red tile + white play (brand) */
function IconYouTube() {
  return (
    <svg className="footer-social-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#FF0000"
        d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814z"
      />
      <path fill="#FFFFFF" d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function IconFacebook() {
  return (
    <svg className="footer-social-svg" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#1877F2"
        d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047v-2.66c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.295h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"
      />
    </svg>
  );
}

function IconInstagram() {
  const gradId = `footer-insta-${useId().replace(/:/g, '')}`;
  return (
    <svg className="footer-social-svg" viewBox="0 0 24 24" aria-hidden>
      <defs>
        <linearGradient
          id={gradId}
          x1="0%"
          y1="100%"
          x2="100%"
          y2="0%"
        >
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="45%" stopColor="#e6683c" />
          <stop offset="70%" stopColor="#dc2743" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradId})`}
        d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.9.3 2.3.5.6.2 1 .6 1.4 1 .4.4.7.8.9 1.4.2.4.4 1.1.5 2.3.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.9-.5 2.3-.4.9-.9 1.4-1.4 1.9-.5.4-1 .7-1.4.9-.4.2-1.1.4-2.3.5-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.9-.3-2.3-.5-.6-.2-1-.6-1.4-1-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1.1-.5-2.3C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.9.5-2.3.2-.6.6-1 1-1.4.4-.4.8-.7 1.4-.9.4-.2 1.1-.4 2.3-.5C8.4 2.2 8.8 2.2 12 2.2zm0 1.8c-3.3 0-3.7 0-5 .1-1 .1-1.5.2-1.9.4-.4.2-.7.4-1 .8-.3.3-.5.6-.7 1-.2.4-.3.9-.4 1.9-.1 1.3-.1 1.7-.1 5s0 3.7.1 5c.1 1 .2 1.5.4 1.9.2.4.4.7.8 1 .3.3.6.5 1 .7.4.2.9.3 1.9.4 1.3.1 1.7.1 5 .1s3.7 0 5-.1c1-.1 1.5-.2 1.9-.4.4-.2.7-.4 1-.8.3-.3.5-.6.7-1 .2-.4.3-.9.4-1.9.1-1.3.1-1.7.1-5s0-3.7-.1-5c-.1-1-.2-1.5-.4-1.9-.2-.4-.4-.7-.8-1-.3-.3-.6-.5-1-.7-.4-.2-.9-.3-1.9-.4-1.3-.1-1.7-.1-5-.1zm0 3.7a4.3 4.3 0 100 8.6 4.3 4.3 0 000-8.6zm0 7.1a2.8 2.8 0 110-5.6 2.8 2.8 0 010 5.6zm5.5-8.1a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  );
}

function Footer({ onSignUpClick, showFab = true }) {
  const handleNavClick = (e, link) => {
    if (link.isSignUp && onSignUpClick) {
      e.preventDefault();
      onSignUpClick();
    }
  };

  return (
    <>
      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <img
              src="/jambro-brand.png"
              alt="JAMBRO"
              className="site-footer-brand-img"
              width={48}
              height={48}
              loading="lazy"
              decoding="async"
            />
            <div className="site-footer-brand-titles">
              <span className="site-footer-brand-name">JAMBRO</span>
              <span className="site-footer-brand-sub">INSIGHT</span>
            </div>
          </div>

          <div className="site-footer-columns">
            <div className="site-footer-col" id="footer-tags">
              <h3 className="site-footer-heading">TAGS</h3>
              <ul className="site-footer-list">
                {TAG_LINKS.map((item) => (
                  <li key={item.label}>
                    <a className="site-footer-link" href={item.href}>
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div className="site-footer-col">
              <h3 className="site-footer-heading">NAVIGATION</h3>
              <ul className="site-footer-list">
                {NAV_LINKS.map((item) => (
                  <li key={item.label}>
                    <a
                      className="site-footer-link"
                      href={item.href}
                      onClick={(e) => handleNavClick(e, item)}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="site-footer-bottom">
            <p className="site-footer-copy">
              © 2026 JAMBRO INSIGHT — Copyright
            </p>
            <div className="site-footer-social">
              <a
                className="site-footer-social-link site-footer-social-link--brand"
                href="https://www.youtube.com/@myjambro"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <IconYouTube />
              </a>
              <a
                className="site-footer-social-link site-footer-social-link--brand"
                href="#"
                aria-label="Facebook"
              >
                <IconFacebook />
              </a>
              <a
                className="site-footer-social-link site-footer-social-link--brand"
                href="#"
                aria-label="Instagram"
              >
                <IconInstagram />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}

export default Footer;
