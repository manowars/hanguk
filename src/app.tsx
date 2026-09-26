import { useEffect, useState } from "preact/hooks";
import { loadSettings } from "./store/settings";
import type { Settings } from "./types";
import { ToastHost } from "./ui/Toast";
import { HomePage } from "./pages/HomePage";
import { SettingsPage } from "./pages/SettingsPage";
import { ListenPage } from "./modules/listen/ListenPage";
import { ShadowPage } from "./modules/speak/ShadowPage";
import { RoleplayPage } from "./modules/speak/RoleplayPage";
import { ReadPage } from "./modules/read/ReadPage";
import { WritePage } from "./modules/write/WritePage";
import { VocabPage } from "./modules/vocab/VocabPage";

export type Route = "/" | "/listen" | "/shadow" | "/roleplay" | "/read" | "/write" | "/vocab" | "/settings";

function readHash(): Route {
  const h = location.hash.replace(/^#/, "") || "/";
  return h as Route;
}

function useHash(): Route {
  const [r, setR] = useState<Route>(readHash);
  useEffect(() => {
    const on = () => {
      setR(readHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return r;
}

export function go(r: Route): void {
  location.hash = r;
}

export interface PageProps {
  settings: Settings;
  setSettings: (s: Settings) => void;
}

const NAV: { r: Route; ic: string; label: string }[] = [
  { r: "/", ic: "🏠", label: "Trang chủ" },
  { r: "/listen", ic: "🎧", label: "Nghe" },
  { r: "/shadow", ic: "🎤", label: "Nói" },
  { r: "/read", ic: "📖", label: "Đọc" },
  { r: "/write", ic: "✍️", label: "Viết" },
];

export function App() {
  const route = useHash();
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const props: PageProps = { settings, setSettings };

  let page;
  switch (route) {
    case "/listen":
      page = <ListenPage {...props} />;
      break;
    case "/shadow":
      page = <ShadowPage {...props} />;
      break;
    case "/roleplay":
      page = <RoleplayPage {...props} />;
      break;
    case "/read":
      page = <ReadPage {...props} />;
      break;
    case "/write":
      page = <WritePage {...props} />;
      break;
    case "/vocab":
      page = <VocabPage {...props} />;
      break;
    case "/settings":
      page = <SettingsPage {...props} />;
      break;
    default:
      page = <HomePage {...props} />;
  }

  const active = route === "/roleplay" ? "/shadow" : route;
  return (
    <>
      <main class="page">{page}</main>
      <nav class="nav" aria-label="Điều hướng">
        {NAV.map((n) => (
          <a key={n.r} href={`#${n.r}`} class={active === n.r ? "on" : ""}>
            <span class="ic" aria-hidden="true">
              {n.ic}
            </span>
            {n.label}
          </a>
        ))}
      </nav>
      <ToastHost />
    </>
  );
}
