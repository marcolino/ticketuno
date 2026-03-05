common:
 - change " into ' (in JS, not in HTML) - OK

 - make a cookies popup (even if we only use localstore for technical goals, and not cookies?)
 - make a /privacy and a /terms page
 - translate all to Italian and French
 - remove all comments in code
 - resolve all TODO's in code
 - resolve all TypeScript warnings in code
 - use some tool to find unused code and components
 - implement an auditing system - "Audit Implementation Guide" with ChatGPT

 backend:
 - add passepartout - OK
 - uuidv4 -> uuid-simple ... - OK
 - /backend/uploads -> /data/images - OK
 - poster: image-* -> poster-* - OK
 - oauth login problem (only in prod) - OK
 - check /data is preserved among deploys - OK
 - change default admin name, surname - OK
 - process.env.* -> config.env.* - OK
 - config.env.* -> process.env.* - OK
 - introduce "operator" role - OK
 - tune token expiration time, and put it in config - OK
 - use i18n.t (or something the like) in server.ts (only in requests) - OK
 - complete MJML email template system - "MJML Template TicketUno" with chatGPT - OK

 - complete tickets buy process, optionally redirecting to stripe for payment
 - complete tickets buy process, sending an email to user with the ticket (with a QRCode?)
 - change console.log's to a real logging system
 - add a bookings component for operators/admins, with a ticket convalidation view (with a QRCode?)
 - set up a staging machine on fly.io / Dockerfile / fly.toml / package.json
 - make a method to clean up unreferenced images from /data/images
 - schedule job to call the method to clean up unreferenced images
 - make a script to backup database
 - schedule job to backup database daily, in production
 - before using analytics and marketing cookies, always check:
    const { canUseAnalytics, canUseMarketingCookies } = useConsent();
 - add language field to users table, and check emails arrive in the right language
 - verify when we accept consent for marketing emails, and then follow the unsubscribe link, we should NOT get "you did already unsubscribe from marketing emails"...

 frontend:
 - Design.tsx => Home.tsx - OK
 - avoid flickering with ChatGPT - OK
 - check in production that navigate(-1) from custom useNavigate hook (EventEdit, cancel), coming from an external domain, sends to our domain home page, and does not exit to external domain - OK
 - always use custom useNavigate hook - OK
 - always use @ for ../... - OK
 - solve issue of poster not reachable in prod - OK
 - 404 image should be responsive on mobile - OK
 - event list: poster image should not increase event container squared size - OK
 - less vertical space among menu items - OK
 - always use showDialog - OK
 - language popup menu on desktop should be closer to it's menu entry (no) - OK
 - add "CastEditor.tsx compomnent - OK
 - move routes from App.tsx to Routes.tsx - OK
 - reduce login/... padding in mobile mode - OK
 - warning 'pathnames cannot have embedded double slashes - normalizing /event/id/performance//' - OK
 - in EventDetails add "bookings" button for admin (operator) too - OK
 - dark mode changes logo colors in a less then optimal way - OK
 - add version number/build/date in footer - OK
 - make theme selectable among "light", "dark" and "system" - OK
 - components container + title should be common for all components (perhaps) - OK
 - normalize all *List.tsx components as TheatersList, and make same aspect for event with and without poster - OK
 - complete ConsentContext translations (?) - OK
 - in event details, check for login as soon as one seat is selected, to avoid loosing state - OK
 - settings handling - "React MUI PWA Setup" with ChatGPT - OK
 - in settings/misc add all currency handling - OK
 - use currency from settings, and remove currency selection from EventEdit component - OK
 
 - handle uniformly user's role in components loading - OK
 - in all components, check for setError: always add toast.error, and possibly remove Alert's for errors
 - add check for changes in all components (when dirty), before navigating away
 - find if and where to suggest user to open consent dialog to enable missing consent (for pushNotifications for example)
 - add all users profile handling (in settings/admin)
 - add privacy and terms links in the register page
 - in setup/privacy add Terms and Privacy pages, and link to open consent dialog
 - PWA handling - "PWA setup automation for theater booking system" with Claude
