// SPDX-License-Identifier: MIT
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { RunStatus } from '../domain/types';
export function PageHeading({ eyebrow, title, description, actions }: { eyebrow?: string; title: string; description?: string; actions?: ReactNode }) {
 return <div className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1>{description && <p className="page-description">{description}</p>}</div>{actions && <div className="page-actions">{actions}</div>}</div>;
}
export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warning' | 'danger' | 'success' }) { return <div className={`pc-notice pc-status--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>{children}</div>; }
export function StatusBadge({ status }: { status: RunStatus | 'draft' | string }) { return <span className={`status-badge status-${status}`}><span aria-hidden="true" />{status === 'completed' ? 'Completed' : status.charAt(0).toUpperCase() + status.slice(1)}</span>; }
export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) { return <div className="empty-state"><span className="empty-symbol" aria-hidden="true">◇</span><h2>{title}</h2><p>{children}</p>{action}</div>; }
export function ResponsiveInspector({ children, label, className, onClose, defaultOpen = true }: { children: ReactNode; label: string; className: string; onClose: () => void; defaultOpen?: boolean }) {
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 640px)').matches);
 const [open,setOpen]=useState(defaultOpen);
 const dialog=useRef<HTMLDialogElement>(null); const returnFocus=useRef(document.activeElement as HTMLElement | null);
 useEffect(()=>{const query=window.matchMedia('(max-width: 640px)');const update=()=>setMobile(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 useEffect(()=>{if(mobile&&open&&dialog.current&&!dialog.current.open)dialog.current.showModal();},[mobile,open]);
 useEffect(()=>()=>returnFocus.current?.focus({preventScroll:true}),[]);
 const close=()=>{setOpen(false);onClose();requestAnimationFrame(()=>returnFocus.current?.focus({preventScroll:true}));};
 return mobile?open?<dialog ref={dialog} className={`responsive-inspector-dialog ${className}`} aria-label={label} onCancel={event=>{event.preventDefault();close();}}><button className="pc-button inspector-close" onClick={close}>Close inspector</button>{children}</dialog>:<button className="pc-button" onClick={()=>{returnFocus.current=document.activeElement as HTMLElement;setOpen(true);}}>Inspect {label}</button>:<aside className={className} aria-label={label}>{children}</aside>;
}
export const formatNumber = (value: number | null | undefined, digits = 0) => value == null || !Number.isFinite(value) ? 'Not available' : new Intl.NumberFormat('en-GB', { maximumFractionDigits: digits }).format(value);
export const formatDate = (value: string) => new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
