import { JSX, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MainPage } from './page/MainPage';
import { LoginPage } from './page/LoginPage';
import { UserPage } from './page/UserPage';
import { SignPage } from './page/SignPage';
import { AssignmentPage } from './page/AssignmentPage';
import { CompPage } from './page/CompPage';

const route: Record<string, (left: string) => JSX.Element> = {
  "/main": () => <MainPage />,
  "/sign": () => <SignPage />,
  "/login": () => <LoginPage />,
  "/user": (left) => <UserPage left={left} />,
  "/assignment": (left) => <AssignmentPage left={left} />,
  "/comp": (left) => <CompPage left={left} />,
}

const hash = window.location.hash;
const path = hash.substring(2).split("/");
const solved: string[] = []
for (const part of path) {
  solved.push(part);
  const key = "/" + solved.join("/");
  if (!route[key]) {
    continue;
  }
  break
}
let element: JSX.Element;
try {
  element = route["/" + solved.join("/")]("/" + path.slice(solved.length).join("/"));
} catch (error) {
  element = <div>
    {String(error)}<br/>
    Route: {"/" + solved.join("/")}<br/>
    Left: {"/" + path.slice(solved.length).join("/")}
  </div>;
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {element}
  </StrictMode>
)
