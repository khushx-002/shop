"use client";
/**
 * Lets other parts of the site frame open the account side panel (for example the
 * "Login" / "Register" buttons in the desktop Shop menu and in the mobile menu).
 *
 *   openAccountPanel("register");
 *   useAccountPanelRequests((tab) => { setTab(tab); setOpen(true); });
 */
import { useEffect, useEffectEvent } from "react";

export type AccountTab = "login" | "register";
const EVENT = "jm:open-account-panel";

export function openAccountPanel(tab: AccountTab = "login") {
  window.dispatchEvent(new CustomEvent<AccountTab>(EVENT, { detail: tab }));
}

export function useAccountPanelRequests(onRequest: (tab: AccountTab) => void) {
  const handle = useEffectEvent((tab: AccountTab) => onRequest(tab));
  useEffect(() => {
    const listener = (e: Event) => handle((e as CustomEvent<AccountTab>).detail === "register" ? "register" : "login");
    window.addEventListener(EVENT, listener);
    return () => window.removeEventListener(EVENT, listener);
  }, []);
}

/**
 * Runs `callback` once each time a form action finishes (pending goes true → false).
 * Login/register/logout end with a server redirect that can land on the same URL, so the
 * cart provider would not notice the new session; we reload it here instead.
 */
export function useAfterPending(pending: boolean, callback: () => void) {
  const run = useEffectEvent(callback);
  useEffect(() => {
    if (!pending) return;
    return () => run(); // cleanup of the "pending" render = the moment it finished
  }, [pending]);
}
