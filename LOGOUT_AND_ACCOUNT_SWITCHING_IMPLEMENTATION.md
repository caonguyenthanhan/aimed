# Logout & Account Switching Feature Implementation

## Overview
A comprehensive logout button and multi-account switching system has been implemented for the medical consultation application. The solution provides an intuitive, accessible interface for managing multiple user accounts with seamless session transitions.

## Files Created

### 1. `/lib/account-manager.ts`
Core utility library for managing multiple account sessions and account history.

**Key Functions:**
- `saveCurrentSession()` - Saves the current authenticated session to history
- `getAccountHistory()` - Retrieves all stored account sessions
- `getCurrentSession()` - Gets the currently active session
- `getUniqueAccounts()` - Returns unique accounts filtered by userId
- `switchAccount(account)` - Switches to a different account with session preservation
- `removeAccountFromHistory(userId)` - Removes an account from history
- `clearAccountHistory()` - Clears all stored account history
- `getRoleColor(role)` - Returns styling for role badges (doctor/patient)
- `getRoleLabel(role)` - Returns Vietnamese label for user role
- `formatLastAccessed(timestamp)` - Formats last access time for display

**Data Structure:**
```typescript
interface AccountSession {
  id: string
  userId: string
  username: string
  email?: string
  full_name: string
  userRole: 'doctor' | 'patient'
  avatar_url?: string
  authToken: string
  timestamp: number
  lastAccessed: number
}
```

### 2. `/components/account-menu.tsx`
Dropdown menu component in the header providing quick access to logout and account management features.

**Features:**
- **Profile Section** - Displays current user avatar, name, email, and role badge
- **Account Settings Link** - Navigates to account management page
- **Account Switching Link** - Navigates to account switcher interface
- **Logout Button** - Single-device logout with confirmation dialog
- **Logout All Devices Button** - Logout from all sessions with confirmation
- **Confirmation Dialogs** - Prevents accidental logouts with clear warnings
- **Accessibility** - Full keyboard navigation and ARIA labels
- **Visual Design** - Clean dropdown with role-based color badges

**Props:**
- `userLabel: string` - Display name for the user
- `userRole: 'doctor' | 'patient'` - User's role type
- `userFullName?: string` - Full name for profile display
- `userEmail?: string` - Email address for profile
- `avatarUrl?: string` - Avatar image URL

### 3. `/components/account-switcher.tsx`
Full-featured account switching interface component with account history management.

**Features:**
- **Current Account Display** - Highlights the active account with visual styling
- **Account List** - Shows up to 5 previously used accounts
- **Last Accessed Indicator** - Displays when each account was last used
- **Quick Switch Buttons** - One-click account switching
- **Remove Account Option** - Ability to remove accounts from history
- **Add Account Button** - Navigate to login for adding new accounts
- **Role Indicators** - Visual badges showing doctor/patient status
- **Security Info** - Disclaimer about local device security
- **Confirmation Dialog** - Confirms account switches with automatic session saving
- **Empty State** - Helpful message when no accounts are stored

**Behavior:**
- Saves current session before switching accounts
- Loads new account credentials from stored history
- Updates last accessed timestamp
- Redirects to home/dashboard after successful switch
- Removes accounts from localStorage when deleted

### 4. Updated `/components/site-header.tsx`
Enhanced header component with integrated account menu.

**Changes:**
- Imported `AccountMenu` component
- Replaced simple account link with `<AccountMenu>` dropdown
- Passes user information and role to menu component
- Maintains responsive design for mobile/tablet/desktop

### 5. Updated `/app/account/page.tsx`
Account management page with new account switching section.

**Changes:**
- Added imports for `useSearchParams`, `dynamic`, and `saveCurrentSession`
- Dynamically imported `AccountSwitcher` component
- Added useEffect to save current session on page load
- Added navigation link to account switcher in sidebar
- Integrated account switcher section (visible when `tab=accounts` in URL)

## User Experience Flow

### Logout Flow
1. User clicks account menu in header
2. User selects "Đăng xuất" (Logout) option
3. Confirmation dialog appears with warning
4. User confirms logout
5. Current session is cleared from localStorage
6. User is redirected to login page

### Logout All Devices Flow
1. User clicks account menu in header
2. User selects "Đăng xuất tất cả thiết bị" (Logout All Devices)
3. Confirmation dialog with warning about all sessions
4. User confirms
5. API call to logout all sessions (if available)
6. All session data cleared from localStorage
7. User redirected to login page

### Account Switching Flow
1. User navigates to account settings via menu
2. User clicks "Chuyển đổi tài khoản" link
3. Account switcher page loads showing account history
4. User selects an account to switch to
5. Confirmation dialog shows selected account details
6. User confirms switch
7. Current session saved to history
8. New account credentials loaded
9. Page redirects to home/dashboard with new account
10. User can instantly access new account without re-logging in

### Adding New Account Flow
1. User clicks "Thêm tài khoản khác" button in account switcher
2. Current session is saved to history
3. User logged out locally
4. Redirect to login page with `mode=add-account` (optional)
5. User logs in with new credentials
6. New account saved to session + history
7. User can now switch between accounts

## Security Considerations

### LocalStorage Usage
- Account history stored in browser localStorage (max 5 accounts)
- Each account stores auth token and basic user info
- **Warning:** Only use on trusted devices
- User can manually clear account history anytime
- "Logout All Devices" clears account history completely

### Password Security
- Authentication tokens used for API calls
- Never stores raw passwords
- Password changes force re-login
- Session tokens should be treated as secrets

### Data Privacy
- Account removal only affects local device
- "Logout All Devices" may call backend to invalidate tokens
- User data remains on server unless offboarding is performed
- Security tip displayed in account switcher

## Accessibility Features

### Keyboard Navigation
- All buttons accessible via Tab key
- Enter/Space to activate buttons
- Escape to close dialogs
- Arrow keys for menu navigation

### Screen Reader Support
- ARIA labels on all interactive elements
- Descriptive button text
- Role badges clearly identified
- Form labels properly associated
- Status messages announced to screen readers

### Visual Design
- High contrast colors for text and backgrounds
- Clear visual hierarchy
- Role-based color coding (amber for doctors, blue for patients)
- Focus indicators on interactive elements
- Large touch targets (min 44x44px on mobile)

## Responsive Design

### Mobile (< 640px)
- Full-width dropdown menu
- Touch-friendly button sizes
- Avatar and name display
- Stack layout for account switcher

### Tablet (640px - 1024px)
- Compact dropdown with icons
- Condensed labels
- Flexible grid layout

### Desktop (> 1024px)
- Horizontal dropdown with icons and labels
- Full information displayed
- Multi-column layout for account switcher

## Color Scheme

Using the existing medical app theme:
- **Primary Blue** (#2563eb) - Primary actions, active states
- **Slate** (#64748b, #334155) - Secondary text, borders
- **Green** (#10b981) - Success states, verified status
- **Amber** (#d97706) - Doctor role badge
- **Blue** (#3b82f6) - Patient role badge
- **Red** (#dc2626) - Destructive actions (logout)
- **Orange** (#ea580c) - Logout all devices warning

## Testing Checklist

- [ ] Logout from header menu works on single device
- [ ] Logout all devices clears all sessions
- [ ] Account switching preserves previous session
- [ ] Account history persists across page reloads
- [ ] Can remove accounts from history
- [ ] Mobile responsive layout works on all sizes
- [ ] Keyboard navigation complete
- [ ] Confirmation dialogs prevent accidental actions
- [ ] Dark mode styling correct
- [ ] Screen readers announce all content properly
- [ ] Role badges display correctly for doctors and patients
- [ ] Last accessed time formats correctly
- [ ] Adding new account flow works smoothly

## Browser Support

- Chrome/Edge (v90+)
- Firefox (v88+)
- Safari (v14+)
- Mobile browsers with localStorage support

## Future Enhancements

1. **Remember Last Account** - Auto-load most recent account on page revisit
2. **Device Detection** - Show device name for each account session
3. **Session Expiry Warnings** - Notify user when sessions are about to expire
4. **Account Aliases** - Allow custom names for accounts for better identification
5. **Two-Factor Authentication** - Add additional security for sensitive operations
6. **Biometric Login** - Support fingerprint/face recognition for account switching
7. **Activity Logs** - Show login/logout history
8. **Backend Session Management** - Sync account switching with backend sessions

## Migration Notes

The implementation is fully backward compatible:
- Existing logout functionality still works
- No breaking changes to authentication system
- localStorage structure expanded but doesn't conflict with existing keys
- Account history is optional and only saves on successful account page visit

## Support & Troubleshooting

### Account won't switch
- Ensure localStorage is enabled
- Check if account credentials are still valid
- Clear browser cache and try again

### Lost account history
- Check browser privacy settings (may auto-clear localStorage)
- Use "Remember This Account" feature in future
- Re-login to account to add back to history

### Confirmation dialog not appearing
- Check browser popup blockers
- Ensure JavaScript is enabled
- Try a different browser

## Conclusion

This implementation provides a robust, user-friendly system for managing multiple accounts with seamless switching capabilities. The feature emphasizes security, accessibility, and intuitive user experience while maintaining the clean aesthetic of the medical consultation application.
