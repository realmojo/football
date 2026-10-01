"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MENU, menuMatches, type MenuItem } from "@/lib/menu";

// 상단 메뉴바. PC 에서는 마우스를 올리거나 누르면 펼쳐지고, 모바일에서는 "메뉴" 버튼으로 전체 목록을 연다.
export function MenuBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  // 마우스를 올려서 열린 경우, 이어지는 클릭이 메뉴를 바로 닫지 않도록 기억한다.
  const openedByHover = useRef(false);

  // 페이지가 바뀌면 닫는다.
  useEffect(() => {
    setOpen(null);
    setMobileOpen(false);
  }, [pathname]);

  // 바깥을 누르거나 Esc 를 누르면 닫는다.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(null);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <div className="menubar" ref={ref}>
      <button
        type="button"
        className="menu-toggle"
        aria-expanded={mobileOpen}
        aria-controls="site-menu"
        onClick={() => setMobileOpen((v) => !v)}
      >
        <span className="menu-toggle-icon" aria-hidden />
        메뉴
      </button>

      <nav id="site-menu" className={`menu${mobileOpen ? " is-open" : ""}`} aria-label="주 메뉴">
        <ul className="menu-list">
          {MENU.map((item) => (
            <li
              key={item.key}
              className={`menu-item${item.sections ? " has-panel" : ""}${open === item.key ? " is-open" : ""}`}
              onMouseEnter={() => {
                if (!item.sections) return;
                openedByHover.current = true;
                setOpen(item.key);
              }}
              onMouseLeave={() => item.sections && setOpen((v) => (v === item.key ? null : v))}
            >
              {item.href ? (
                <a href={item.href} className={`menu-top${menuMatches(item, pathname) ? " active" : ""}`}>
                  {item.label}
                </a>
              ) : (
                <>
                  <button
                    type="button"
                    className={`menu-top${menuMatches(item, pathname) ? " active" : ""}`}
                    aria-expanded={open === item.key}
                    onClick={() => {
                      const close = open === item.key && !openedByHover.current;
                      openedByHover.current = false;
                      setOpen(close ? null : item.key);
                    }}
                  >
                    {item.label}
                    <span className="caret" aria-hidden />
                  </button>
                  <MenuPanel item={item} pathname={pathname} />
                </>
              )}
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

function MenuPanel({ item, pathname }: { item: MenuItem; pathname: string }) {
  return (
    <div className={`menu-panel${item.wide ? " wide" : ""}`}>
      {item.sections!.map((section, i) => (
        <div key={i} className="menu-section">
          {section.title ? <p className="menu-section-title">{section.title}</p> : null}
          <ul>
            {section.links.map((link) => (
              <li key={link.href + link.label}>
                <a href={link.href} className={`menu-link${pathname === link.href ? " current" : ""}`}>
                  {link.label}
                </a>
                {link.sub ? (
                  <span className="menu-sub">
                    {link.sub.map((s) => (
                      <a key={s.href} href={s.href} className={pathname === s.href ? "current" : ""}>
                        {s.label}
                      </a>
                    ))}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
