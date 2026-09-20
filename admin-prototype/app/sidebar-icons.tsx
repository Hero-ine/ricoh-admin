'use client';
import { User, CalendarCheck, BadgeAlert, Bell } from 'lucide-react';
import type { SVGProps } from 'react';
import './sidebar-icons.css';

// React adaptation of https://movingicons.dev/r/{user,calendar-check,badge-alert,bell}.json.
type Props = SVGProps<SVGSVGElement>;
export function UserIcon({className='', ...props}: Props) {
  return <User {...props} className={`moving-sidebar-icon moving-user ${className}`}/>;
}
export function CalendarCheckIcon({className='', ...props}: Props) {
  return <CalendarCheck {...props} className={`moving-sidebar-icon moving-calendar ${className}`}/>;
}
export function BadgeAlertIcon({className='', ...props}: Props) {
  return <BadgeAlert {...props} className={`moving-sidebar-icon moving-alert ${className}`}/>;
}
export function BellIcon({className='', ...props}: Props) {
  return <Bell {...props} className={`moving-sidebar-icon moving-bell ${className}`}/>;
}
