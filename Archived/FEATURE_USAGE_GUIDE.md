# Logout & Account Switching - User Guide

## Quick Start

The new logout and account switching features are accessible from two places:

### Location 1: Header Dropdown Menu
Click on your user avatar/name in the top-right corner of the header to open the account menu.

### Location 2: Account Settings Page
Visit `/account` and click "Quản lý tài khoản" (Manage Accounts) in the sidebar.

---

## Feature 1: Single Device Logout

### Steps:
1. Click your avatar in the header (top-right)
2. Click "Đăng xuất" (Logout) 
3. Read the confirmation message
4. Click "Đăng xuất" (Logout) in the dialog
5. You'll be redirected to the login page

### When to Use:
- You're done using the application
- You're on a shared/public computer
- You want to switch to a different account

### Security Note:
This only logs you out on the current device. Other devices with your account will remain logged in.

---

## Feature 2: Logout All Devices

### Steps:
1. Click your avatar in the header (top-right)
2. Click "Đăng xuất tất cả thiết bị" (Logout All Devices)
3. Read the warning about losing access on all devices
4. Click "Đăng xuất khỏi tất cả" (Logout from All) in the dialog
5. You'll be redirected to login

### When to Use:
- Security breach suspected
- Changing/resetting password
- Selling or giving away device
- Leaving workplace/organization

### Security Note:
This is more secure but requires re-login on all your devices.

---

## Feature 3: Quick Account Switching

### Steps:
1. Click "Chuyển đổi tài khoản" (Switch Account) from the header menu
2. OR Click "Quản lý tài khoản" link in account page sidebar
3. You'll see two sections:
   - **Tài khoản hoạt động** (Current Account) - Your active account
   - **Tài khoản khác** (Other Accounts) - Previously used accounts

### Switching to a Previous Account:
1. Click on the account you want to switch to
2. Confirm the switch in the dialog
3. You'll instantly switch to that account
4. No need to re-enter password!

### When to Use:
- You have multiple accounts (doctor and patient)
- You need to quickly check another account
- You share a device with another user

### Benefits:
- **Instant switching** - No password needed
- **Session saved** - Your previous account stays logged in
- **Quick access** - Previously used accounts displayed with last access time

---

## Feature 4: Managing Account History

### View Account History:
1. Go to `/account?tab=accounts`
2. All your recently used accounts are displayed
3. Each account shows:
   - Name and email
   - Role (Bác sĩ/Doctor or Bệnh nhân/Patient)
   - Last accessed time

### Remove an Account:
1. Go to account switcher
2. Click the trash icon next to any account
3. That account is removed from quick-switch history
4. You can still login with that account again later

### Add a New Account:
1. Go to account switcher
2. Click "Thêm tài khoản khác" (Add Another Account)
3. Your current session is saved
4. You're redirected to login
5. Login with new account credentials
6. New account is added to history for quick switching

---

## Understanding the Interface

### Role Badges
- **Bác sĩ** (Doctor) - Amber/gold badge
- **Bệnh nhân** (Patient) - Blue badge

### Last Accessed Times
- "Vừa xong" = Just now
- "5m trước" = 5 minutes ago
- "2h trước" = 2 hours ago
- "3 ngày trước" = 3 days ago
- Full date for older accounts

### Current Account Indicator
- Your active account has a blue background
- Shows the most recent last accessed time
- Displays a checkmark in the UI

---

## Best Practices

### Security
✓ **DO** logout all devices if you suspect unauthorized access
✓ **DO** use single logout on trusted personal devices
✓ **DO** clear account history regularly if on shared computers
✓ **DO** enable two-factor authentication if available

✗ **DON'T** save passwords in your browser
✗ **DON'T** leave accounts logged in on public computers
✗ **DON'T** share passwords for account switching
✗ **DON'T** use this feature on untrusted networks

### Workflow Optimization
- Doctors: Keep both doctor and patient accounts in history
- Patients: Switch accounts if managing multiple family members
- Researchers: Quickly test different account types

---

## Troubleshooting

### Q: I can't see my previous accounts in the switcher
**A:** Account history is stored locally. It may be cleared if:
- You cleared browser cache/cookies
- Your browser has aggressive privacy settings
- This is your first login on this device
- You used "Logout All Devices" recently

**Solution:** Login to other accounts again to rebuild history.

### Q: Account switching is taking a long time
**A:** This is normal the first time. Subsequent switches are instant.

**Solution:** If it takes >5 seconds, refresh the page or check your internet connection.

### Q: I see a security warning about stored accounts
**A:** This is intentional. Your browser stores account info for convenience.

**Solution:** Only use account switching on trusted devices. Clear account history before leaving a shared computer.

### Q: I forgot my password for one of the accounts
**A:** Quick-switch doesn't help with forgotten passwords.

**Solution:** Use the "Forgot Password" link on the login page.

### Q: How do I completely remove all account history?
**A:** 
1. Use "Logout All Devices" to clear everything
2. Or manually delete each account from the switcher
3. Or manually clear browser localStorage

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open account menu | Click avatar or Tab to it |
| Navigate menu items | Up/Down arrow keys |
| Select menu item | Enter or Space |
| Close menu | Escape key |
| Confirm logout | Enter or Tab to button + Enter |
| Cancel operation | Escape key |

---

## Mobile & Tablet Experience

### Mobile Phones
- Account menu appears as a compact dropdown
- Account switcher full-screen for better readability
- Touch-friendly button sizes (minimum 44x44px)
- Swipe gestures supported where available

### Tablets
- Responsive layout adjusts to larger screen
- Account switcher can show multiple accounts per row
- Dropdown menu compacted but still accessible

---

## Dark Mode Support

All features support dark mode:
- Automatic detection of system theme preference
- Manual toggle available in settings
- Color scheme optimized for both light and dark modes
- All text meets WCAG contrast requirements

---

## Accessibility Features

- ✓ Full keyboard navigation
- ✓ Screen reader support (ARIA labels)
- ✓ High contrast colors
- ✓ Large touch targets
- ✓ Clear focus indicators
- ✓ Descriptive button text

---

## Still Need Help?

For more information:
- Check the technical documentation: `LOGOUT_AND_ACCOUNT_SWITCHING_IMPLEMENTATION.md`
- Contact support through the application
- Check your browser's developer console for any error messages

---

**Version:** 1.0
**Last Updated:** March 2026
**Compatible With:** All modern browsers with JavaScript enabled
